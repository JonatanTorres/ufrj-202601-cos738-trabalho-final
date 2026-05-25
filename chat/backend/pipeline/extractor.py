import logging
import time

from langchain_ollama import ChatOllama

from .llm_schemas import LLMExtractorResult, LLMSynonyms
from .models import EdgeType, GraphEdge, GraphNode, GraphPayload
from .prompts import EXTRACTOR_TEMPLATE, SYNONYMS_TEMPLATE

log = logging.getLogger("medgraph.extractor")


_EDGE_LABELS: dict[EdgeType, str] = {
    "induces":     "causa",
    "treats":      "trata",
    "no_relation": "sem relação",
}


def _norm_id(raw: str) -> str:
    return raw.strip().lower().replace("-", "_").replace(" ", "_")


def _ascii_only(s: str) -> bool:
    return all(ord(c) <= 127 for c in s)


def _to_graph_payload(result: LLMExtractorResult) -> GraphPayload:
    nodes: list[GraphNode] = []
    seen: set[str] = set()

    for c in result.chemicals:
        cid = _norm_id(c.id)
        if not cid or not _ascii_only(cid) or cid in seen:
            continue
        seen.add(cid)
        nodes.append(GraphNode(id=cid, label=c.label_pt or cid, type="drug", size=28))

    for d in result.diseases:
        did = _norm_id(d.id)
        if not did or not _ascii_only(did) or did in seen:
            continue
        seen.add(did)
        nodes.append(GraphNode(id=did, label=d.label_pt or did, type="condition", size=26))

    edges: list[GraphEdge] = []
    for r in result.relations:
        s = _norm_id(r.chemical_id)
        t = _norm_id(r.disease_id)
        if not s or not t or s not in seen or t not in seen:
            continue
        edges.append(GraphEdge(
            s=s, t=t, type=r.type, label=_EDGE_LABELS[r.type], conf=0.5,
        ))

    return GraphPayload(nodes=nodes, edges=edges)


async def extract_graph_bilingual(text_en: str, model_id: str) -> GraphPayload:
    """Extrai grafo bilíngue de um texto em inglês.
    IDs em snake_case inglês, labels em PT-BR. Apenas nós drug/condition,
    e relações induces/treats/no_relation.
    """
    llm = ChatOllama(model=model_id, reasoning=False).with_structured_output(
        LLMExtractorResult, method="json_schema"
    )
    chain = EXTRACTOR_TEMPLATE | llm
    log.info("  → extractor.ainvoke (%s, input %d chars)…", model_id, len(text_en))
    t0 = time.monotonic()
    try:
        result = await chain.ainvoke({"text_en": text_en})
    except Exception as e:
        log.warning("  → extractor failed after %.1fs: %s", time.monotonic() - t0, e)
        return GraphPayload()
    log.info("  → extractor done in %.1fs", time.monotonic() - t0)
    return _to_graph_payload(result)


async def english_synonyms(
    term_en: str, kind: str, model_id: str, max_n: int = 3
) -> list[str]:
    """Retorna até `max_n` sinônimos médicos em inglês para `term_en`.
    `kind` é 'drug' ou 'condition'. Retorna [] em falha. Filtra não-ASCII."""
    llm = ChatOllama(model=model_id, reasoning=False).with_structured_output(
        LLMSynonyms, method="json_schema"
    )
    chain = SYNONYMS_TEMPLATE | llm
    term_display = term_en.replace("_", " ")
    log.info("  → synonyms.ainvoke (%s, kind=%s term=%r)…", model_id, kind, term_display)
    t0 = time.monotonic()
    try:
        result = await chain.ainvoke({"kind": kind, "term": term_display, "max_n": max_n})
    except Exception as e:
        log.warning("  → synonyms failed after %.1fs: %s", time.monotonic() - t0, e)
        return []

    out: list[str] = []
    seen: set[str] = set()
    original_norm = term_display.strip().lower()
    for it in result.synonyms:
        s = it.strip()
        if not s or not _ascii_only(s):
            continue
        if s.lower() == original_norm:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= max_n:
            break
    log.info("  → synonyms for %r → %s (%.1fs)", term_en, out, time.monotonic() - t0)
    return out
