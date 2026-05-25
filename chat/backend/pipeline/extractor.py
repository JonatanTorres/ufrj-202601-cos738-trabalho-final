import json
import logging
import time

from langchain_ollama import ChatOllama

from .llm_schemas import LLMExtractorResult, LLMSynonyms
from .models import EdgeType, GlossaryEntry, GraphEdge, GraphNode, GraphPayload
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


def build_glossary_dict(entries: list[GlossaryEntry]) -> dict[str, str]:
    """Converte os pares PT↔EN do tradutor em um dict id_normalizado_EN → PT,
    usando a mesma normalização que o extractor aplica aos ids da LLM. Isso
    garante que o lookup em _resolve_label case mesmo quando o tradutor escreve
    'Liver Fibrosis' e o extractor produz id 'liver_fibrosis'."""
    out: dict[str, str] = {}
    for entry in entries:
        key = _norm_id(entry.term_en)
        if not key or not _ascii_only(key):
            continue
        out.setdefault(key, entry.term_pt.strip())
    return out


def _resolve_label(entity_id: str, llm_label: str, glossary: dict[str, str]) -> str:
    """Glossário do tradutor é a fonte de verdade para label PT — sobrescreve o
    label_pt da LLM extractora. Por quê: o tradutor viu a forma exata que o
    usuário escreveu (ex.: 'Estatinas'), enquanto o extractor opera só sobre
    o texto EN e pode recair em formas inglesas para drogas 'consagradas'.
    """
    if entity_id in glossary:
        return glossary[entity_id]
    return llm_label or entity_id


def _to_graph_payload(
    result: LLMExtractorResult, glossary: dict[str, str]
) -> GraphPayload:
    nodes: list[GraphNode] = []
    seen: set[str] = set()

    for c in result.chemicals:
        cid = _norm_id(c.id)
        if not cid or not _ascii_only(cid) or cid in seen:
            continue
        seen.add(cid)
        nodes.append(GraphNode(
            id=cid, label=_resolve_label(cid, c.label_pt, glossary),
            type="drug", size=28,
        ))

    for d in result.diseases:
        did = _norm_id(d.id)
        if not did or not _ascii_only(did) or did in seen:
            continue
        seen.add(did)
        nodes.append(GraphNode(
            id=did, label=_resolve_label(did, d.label_pt, glossary),
            type="condition", size=26,
        ))

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


def _render_glossary_for_prompt(glossary: dict[str, str]) -> str:
    if not glossary:
        return "[]"
    pairs = [{"term_en": en, "term_pt": pt} for en, pt in glossary.items()]
    return json.dumps(pairs, ensure_ascii=False)


async def extract_graph_bilingual(
    text_en: str,
    model_id: str,
    glossary: dict[str, str] | None = None,
) -> GraphPayload:
    """Extrai grafo bilíngue de um texto em inglês.
    IDs em snake_case inglês, labels em PT-BR. Apenas nós drug/condition,
    e relações induces/treats/no_relation.

    `glossary` mapeia id_normalizado_EN → label PT vindo do tradutor da etapa 1.
    Termos que batem com o glossário recebem o label do usuário verbatim.
    """
    glossary = glossary or {}
    llm = ChatOllama(model=model_id, reasoning=False).with_structured_output(
        LLMExtractorResult, method="json_schema"
    )
    chain = EXTRACTOR_TEMPLATE | llm
    log.info("  → extractor.ainvoke (%s, input %d chars, glossary=%d terms)…",
             model_id, len(text_en), len(glossary))
    t0 = time.monotonic()
    try:
        result = await chain.ainvoke({
            "text_en": text_en,
            "glossary": _render_glossary_for_prompt(glossary),
        })
    except Exception as e:
        log.warning("  → extractor failed after %.1fs: %s", time.monotonic() - t0, e)
        return GraphPayload()
    log.info("  → extractor done in %.1fs", time.monotonic() - t0)
    return _to_graph_payload(result, glossary)


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
