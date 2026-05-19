from typing import AsyncIterator

from . import ncbi
from .extractor import extract_graph_bilingual
from .models import (
    AggregateStagePayload,
    FetchStagePayload,
    GraphPayload,
    MeshStagePayload,
    PipelineResult,
    PipelineStepEvent,
    PubmedArticle,
    TranslateStagePayload,
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
    yield PipelineStepEvent(step="translate_pt_en", status="running")
    stage1 = await translate_pt_to_en(enunciado_pt, model_id)
    yield PipelineStepEvent(
        step="translate_pt_en", status="ok", payload=stage1.model_dump()
    )

    yield PipelineStepEvent(step="extract_question", status="running")
    question_graph = await extract_graph_bilingual(stage1.output, model_id)
    yield PipelineStepEvent(
        step="extract_question", status="ok", payload={"graph": question_graph.model_dump()},
    )

    yield PipelineStepEvent(step="mesh_search", status="running")
    lookups = []
    drug_labels: list[str] = []
    cond_labels: list[str] = []
    for node in question_graph.nodes:
        term = _term_from_id(node.id)
        hit = await ncbi.mesh_search(term)
        lookups.append(hit)
        if hit.ok and hit.mesh_label:
            if node.type == "drug":
                drug_labels.append(hit.mesh_label)
            elif node.type == "condition":
                cond_labels.append(hit.mesh_label)
    mesh_payload = MeshStagePayload(url_template=MESH_URL_TEMPLATE, lookups=lookups)
    yield PipelineStepEvent(
        step="mesh_search",
        status="ok" if lookups else "skipped",
        payload=mesh_payload.model_dump(),
    )

    yield PipelineStepEvent(step="pubmed_search", status="running")
    query = ncbi.build_pubmed_query(drug_labels, cond_labels)
    pmids, total_found = await ncbi.pubmed_search(query, retmax=5) if query else ([], 0)
    articles: list[PubmedArticle] = await ncbi.pubmed_fetch(pmids) if pmids else []
    fetch_payload = FetchStagePayload(
        query=query, total_found=total_found, returned=len(articles), articles=articles,
    )
    yield PipelineStepEvent(
        step="pubmed_search",
        status="ok" if articles else "skipped",
        payload=fetch_payload.model_dump(),
    )

    yield PipelineStepEvent(step="extract_articles", status="running")
    article_graphs: list[tuple[str, GraphPayload]] = []
    for art in articles:
        text = f"{art.title}\n\n{art.abstract}".strip()
        if not text:
            continue
        g = await extract_graph_bilingual(text, model_id)
        article_graphs.append((art.pmid, g))
    aggregate = aggregate_graphs(question_graph, article_graphs)
    yield PipelineStepEvent(
        step="extract_articles",
        status="ok" if article_graphs else "skipped",
        payload=aggregate.model_dump(),
    )

    yield PipelineStepEvent(step="verdict", status="running")
    verdict = compute_verdict(question_graph, aggregate, articles)
    yield PipelineStepEvent(
        step="verdict", status="ok", payload=verdict.model_dump()
    )

    yield PipelineStepEvent(step="translate_en_pt", status="running")
    justification_en = compose_justification_en(question_graph, verdict, aggregate, articles)
    stage7 = await translate_en_to_pt(justification_en, model_id)
    yield PipelineStepEvent(
        step="translate_en_pt", status="ok", payload=stage7.model_dump()
    )

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
    yield PipelineStepEvent(step="final", status="ok", payload=final.model_dump())
