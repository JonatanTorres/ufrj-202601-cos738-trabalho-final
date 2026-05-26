import logging
import time
from typing import AsyncIterator

from . import ncbi
from .extractor import build_glossary_dict, english_synonyms, extract_graph_bilingual

log = logging.getLogger("medgraph.pipeline")
from .models import (
    AggregateStagePayload,
    FetchStagePayload,
    GraphPayload,
    MeshStagePayload,
    PipelineResult,
    PipelineStepEvent,
    PubmedArticle,
    TranslateStagePayload,
    UnresolvedTerm,
    VerdictScore,
    VerdictStagePayload,
)
from .translator import translate_en_to_pt, translate_pt_to_en
from .verdict import aggregate_graphs, compose_justification_en, compute_verdict

MESH_URL_TEMPLATE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=mesh&term={TERM}&retmode=json"


def _term_from_id(id_: str) -> str:
    return id_.replace("_", " ")


async def run_medical_pipeline(
    enunciado_pt: str,
    model_id: str,
) -> AsyncIterator[PipelineStepEvent]:
    """Executa o pipeline de 7 etapas em ordem, emitindo um evento por etapa.

    Cada erro recuperável é reportado via status='error' ou 'skipped' e o pipeline
    segue. Quando há erro fatal (nenhum artigo, nenhuma extração), o veredito final
    desemboca em 'Sem evidência'.
    """
    pipeline_started = time.monotonic()
    log.info("[pipeline] START enunciado=%r model=%s", enunciado_pt, model_id)

    yield PipelineStepEvent(step="translate_pt_en", status="running")
    t0 = time.monotonic()
    stage1 = await translate_pt_to_en(enunciado_pt, model_id)
    log.info("[pipeline] step1 translate_pt_en done in %.1fs → %r",
             time.monotonic() - t0, stage1.output)
    log.info("[pipeline] step1 translate_pt_en JSON output:\n%s",
             stage1.model_dump_json(indent=2))
    yield PipelineStepEvent(
        step="translate_pt_en", status="ok", payload=stage1.model_dump()
    )

    glossary = build_glossary_dict(stage1.glossary)
    log.info("[pipeline] glossary from stage1: %s", glossary)

    yield PipelineStepEvent(step="extract_question", status="running")
    t0 = time.monotonic()
    question_graph = await extract_graph_bilingual(stage1.output, model_id, glossary)
    log.info("[pipeline] step2 extract_question done in %.1fs → %d nodes, %d edges",
             time.monotonic() - t0, len(question_graph.nodes), len(question_graph.edges))
    log.info("[pipeline] step2 extract_question JSON output:\n%s",
             question_graph.model_dump_json(indent=2))
    yield PipelineStepEvent(
        step="extract_question", status="ok", payload={"graph": question_graph.model_dump()},
    )

    yield PipelineStepEvent(step="mesh_search", status="running")
    t0 = time.monotonic()
    lookups = []
    drug_labels: list[str] = []
    cond_labels: list[str] = []
    unresolved: list[UnresolvedTerm] = []
    for node in question_graph.nodes:
        term = _term_from_id(node.id)
        hit = await ncbi.mesh_search(term)
        if not hit.ok:
            syns = await english_synonyms(node.id, node.type, model_id, max_n=3)
            if syns:
                log.info("[pipeline] step3 retry %r with synonyms=%s", term, syns)
                hit = await ncbi.mesh_search_with_retry(term, syns)
            else:
                hit.attempts = [term]
                hit.matched_term = None
        else:
            hit.attempts = [term]
            hit.matched_term = term
        lookups.append(hit)
        log.info("[pipeline] step3 mesh_search %r → ok=%s mesh_id=%s label=%r matched=%r attempts=%s (%dms)",
                 term, hit.ok, hit.mesh_id, hit.mesh_label, hit.matched_term, hit.attempts, hit.ms)
        if hit.ok and hit.mesh_label:
            if node.type == "drug":
                drug_labels.append(hit.mesh_label)
            elif node.type == "condition":
                cond_labels.append(hit.mesh_label)
        else:
            unresolved.append(UnresolvedTerm(
                id=node.id, label=node.label, type=node.type, attempts=hit.attempts or [term],
            ))
    log.info("[pipeline] step3 mesh_search done in %.1fs → %d/%d hits (drugs=%s conds=%s unresolved=%d)",
             time.monotonic() - t0, sum(1 for l in lookups if l.ok), len(lookups),
             drug_labels, cond_labels, len(unresolved))
    mesh_payload = MeshStagePayload(
        url_template=MESH_URL_TEMPLATE, lookups=lookups, unresolved=unresolved,
    )
    log.info("[pipeline] step3 mesh_search JSON output:\n%s",
             mesh_payload.model_dump_json(indent=2))
    if unresolved:
        log.info("[pipeline] step3 needs_clarification: %s",
                 [(u.id, u.label) for u in unresolved])
        yield PipelineStepEvent(
            step="mesh_search",
            status="needs_clarification",
            payload=mesh_payload.model_dump(),
        )
        return
    yield PipelineStepEvent(
        step="mesh_search",
        status="ok" if lookups else "skipped",
        payload=mesh_payload.model_dump(),
    )

    yield PipelineStepEvent(step="pubmed_search", status="running")
    t0 = time.monotonic()
    target_articles = 5
    overfetch = 15
    query = ncbi.build_pubmed_query(drug_labels, cond_labels)
    log.info("[pipeline] step4 pubmed query=%r", query)
    pmids, total_found = await ncbi.pubmed_search(query, retmax=overfetch) if query else ([], 0)
    log.info("[pipeline] step4 esearch → total_found=%d pmids=%s", total_found, pmids)
    fetched: list[PubmedArticle] = await ncbi.pubmed_fetch(pmids) if pmids else []
    articles: list[PubmedArticle] = []
    for art in fetched:
        if len(articles) >= target_articles:
            break
        if not art.abstract.strip():
            log.info("[pipeline] step4 DISCARD PMID=%s (sem abstract) title=%r",
                     art.pmid, art.title[:60])
            continue
        articles.append(art)
        log.info("[pipeline] step4 fetched PMID=%s year=%s title=%r abstract_chars=%d",
                 art.pmid, art.year, art.title[:60], len(art.abstract))
    log.info("[pipeline] step4 pubmed done in %.1fs → %d articles (descartados=%d)",
             time.monotonic() - t0, len(articles), len(fetched) - len(articles))
    fetch_payload = FetchStagePayload(
        query=query, total_found=total_found, returned=len(articles), articles=articles,
    )
    log.info("[pipeline] step4 pubmed_search JSON output:\n%s",
             fetch_payload.model_dump_json(indent=2))
    yield PipelineStepEvent(
        step="pubmed_search",
        status="ok" if articles else "skipped",
        payload=fetch_payload.model_dump(),
    )

    yield PipelineStepEvent(
        step="extract_articles", status="running",
        payload={"progress": {"current": 0, "total": len(articles), "processed_pmids": []}},
    )
    t0 = time.monotonic()
    article_graphs: list[tuple[str, GraphPayload]] = []
    for i, art in enumerate(articles, 1):
        text = f"{art.title}\n\n{art.abstract}".strip()
        if not text:
            log.warning("[pipeline] step5 SKIP PMID=%s (texto vazio)", art.pmid)
            article_graphs.append((art.pmid, GraphPayload()))
        else:
            log.info("[pipeline] step5 [%d/%d] extraindo grafo PMID=%s (%d chars de input)…",
                     i, len(articles), art.pmid, len(text))
            art_t0 = time.monotonic()
            try:
                g = await extract_graph_bilingual(text, model_id, glossary)
            except Exception as e:
                log.warning("[pipeline] step5 [%d/%d] PMID=%s FAILED after %.1fs: %s",
                            i, len(articles), art.pmid, time.monotonic() - art_t0, e)
                g = GraphPayload()
            log.info("[pipeline] step5 [%d/%d] PMID=%s done in %.1fs → %d nodes %d edges",
                     i, len(articles), art.pmid, time.monotonic() - art_t0,
                     len(g.nodes), len(g.edges))
            article_graphs.append((art.pmid, g))
        try:
            partial = aggregate_graphs(question_graph, article_graphs)
        except Exception as e:
            log.warning("[pipeline] step5 aggregate FAILED: %s", e)
            continue
        processed_pmids = [pmid for pmid, _ in article_graphs]
        yield PipelineStepEvent(
            step="extract_articles", status="running",
            payload={
                **partial.model_dump(),
                "progress": {
                    "current": len(article_graphs),
                    "total": len(articles),
                    "processed_pmids": processed_pmids,
                },
            },
        )
    aggregate = aggregate_graphs(question_graph, article_graphs)
    log.info("[pipeline] step5 extract_articles done in %.1fs → %d article graphs, %d aggregate edges",
             time.monotonic() - t0, len(article_graphs), len(aggregate.edges))
    log.info("[pipeline] step5 extract_articles JSON output:\n%s",
             aggregate.model_dump_json(indent=2))
    yield PipelineStepEvent(
        step="extract_articles",
        status="ok" if article_graphs else "skipped",
        payload={
            **aggregate.model_dump(),
            "progress": {
                "current": len(article_graphs),
                "total": len(articles),
                "processed_pmids": [pmid for pmid, _ in article_graphs],
            },
        },
    )

    yield PipelineStepEvent(step="verdict", status="running")
    t0 = time.monotonic()
    verdict = compute_verdict(question_graph, aggregate, articles)
    log.info("[pipeline] step6 verdict done in %.1fs → label=%s tone=%s (confirms=%d refutes=%d neutral=%d)",
             time.monotonic() - t0, verdict.label, verdict.tone,
             verdict.score.confirms, verdict.score.refutes, verdict.score.neutral)
    log.info("[pipeline] step6 verdict JSON output:\n%s",
             verdict.model_dump_json(indent=2))
    yield PipelineStepEvent(
        step="verdict", status="ok", payload=verdict.model_dump()
    )

    yield PipelineStepEvent(step="translate_en_pt", status="running")
    t0 = time.monotonic()
    justification_en = compose_justification_en(question_graph, verdict, aggregate, articles)
    stage7 = await translate_en_to_pt(justification_en, model_id)
    log.info("[pipeline] step7 translate_en_pt done in %.1fs → %r",
             time.monotonic() - t0, stage7.output[:80])
    log.info("[pipeline] step7 translate_en_pt JSON output:\n%s",
             stage7.model_dump_json(indent=2))
    yield PipelineStepEvent(
        step="translate_en_pt", status="ok", payload=stage7.model_dump()
    )

    log.info("[pipeline] DONE total=%.1fs", time.monotonic() - pipeline_started)

    final = PipelineResult(
        stage1=stage1,
        stage2=question_graph,
        stage3=mesh_payload,
        stage4=fetch_payload,
        stage5=aggregate,
        stage6=verdict,
        stage7=stage7,
        final_text_pt=stage7.output,
    )
    log.info("[pipeline] final JSON output:\n%s",
             final.model_dump_json(indent=2))
    yield PipelineStepEvent(step="final", status="ok", payload=final.model_dump())
