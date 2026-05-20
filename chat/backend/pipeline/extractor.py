import json
import logging
import time

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from .models import GraphEdge, GraphNode, GraphPayload

log = logging.getLogger("medgraph.extractor")

EXTRACTOR_PROMPT = """You are a medical entity extractor.

Given a medical statement or question in ENGLISH, extract every CHEMICAL/DRUG and every
DISEASE/CONDITION mentioned, and the RELATIONS asserted between them. Do not omit entities.

Respond ONLY with a JSON object in the exact shape below, with no extra text, markdown, or
code fences:

{"chemicals": [{"id": "<snake_case_en>", "label_pt": "<nome em PT-BR>"}],
 "diseases":  [{"id": "<snake_case_en>", "label_pt": "<nome em PT-BR>"}],
 "relations": [{"chemical_id": "<id>", "disease_id": "<id>",
                "type": "<induz|trata|sem_relacao>"}]}

Rules:
- "id" MUST be ASCII-only English, lowercase, snake_case, no accents, no Portuguese
  words (e.g., "methotrexate", "liver_fibrosis", "creatine", "androgenetic_alopecia").
  NEVER produce ids like "fibrose_hepatica", "calvicie", "metotrexato" — translate
  to English first. If you cannot produce an English id for an entity, OMIT it.
- "label_pt" is the Brazilian Portuguese display name (e.g., "Methotrexate",
  "Fibrose hepática", "Creatina", "Alopecia androgenética"). For drugs whose English
  name is consagrated in PT, keep the English form.
- List each chemical/disease ONCE even if it appears in multiple relations.
- Emit ONE entry in "relations" for EACH (chemical, disease) pair asserted in the text.
- "type" MUST be exactly one of:
    "induz"        — chemical causes / induces / increases risk of the disease
    "trata"        — chemical treats / cures / prevents / improves the disease
    "sem_relacao"  — text states there is no relation, or the relation is unclear
- If the text contains no clear chemical-disease relation, return all three arrays empty.

Example 1 — input: "Does creatine supplementation cause androgenetic alopecia?"
Output: {"chemicals": [{"id": "creatine", "label_pt": "Creatina"}],
         "diseases": [{"id": "androgenetic_alopecia", "label_pt": "Alopecia androgenética"}],
         "relations": [{"chemical_id": "creatine", "disease_id": "androgenetic_alopecia",
                        "type": "induz"}]}

Example 2 — input: "Methotrexate causes hepatotoxicity and liver fibrosis."
Output: {"chemicals": [{"id": "methotrexate", "label_pt": "Methotrexate"}],
         "diseases": [{"id": "hepatotoxicity", "label_pt": "Hepatotoxicidade"},
                      {"id": "liver_fibrosis", "label_pt": "Fibrose hepática"}],
         "relations": [{"chemical_id": "methotrexate", "disease_id": "hepatotoxicity",
                        "type": "induz"},
                       {"chemical_id": "methotrexate", "disease_id": "liver_fibrosis",
                        "type": "induz"}]}
"""


def _extract_json_blob(text: str) -> str | None:
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _norm_type(t: str) -> str:
    t = (t or "").strip().lower().replace("-", "_").replace(" ", "_")
    if t in ("induz", "trata", "sem_relacao"):
        return t
    if t in ("induce", "induces", "causes", "cause", "increase", "increases"):
        return "induz"
    if t in ("treat", "treats", "prevent", "prevents", "cure", "cures"):
        return "trata"
    return "sem_relacao"


async def extract_graph_bilingual(text_en: str, model_id: str) -> GraphPayload:
    """Extrai grafo bilíngue de um texto em inglês.
    IDs em snake_case inglês, labels em PT-BR. Apenas nós drug/condition,
    e relações induz/trata/sem_relacao.
    """
    llm = ChatOllama(model=model_id, think=False)
    messages = [
        SystemMessage(content=EXTRACTOR_PROMPT),
        HumanMessage(content=text_en),
    ]
    log.info("  → ollama.ainvoke (%s, input %d chars)…", model_id, len(text_en))
    t0 = time.monotonic()
    try:
        response = await llm.ainvoke(messages)
    except Exception as e:
        log.warning("  → ollama.ainvoke FAILED after %.1fs: %s", time.monotonic() - t0, e)
        return GraphPayload()

    raw = (response.content or "").strip()
    log.info("  → ollama.ainvoke done in %.1fs (output %d chars)", time.monotonic() - t0, len(raw))
    blob = _extract_json_blob(raw)
    if not blob:
        log.warning("  → no JSON blob in response: %r", raw[:200])
        return GraphPayload()

    try:
        parsed = json.loads(blob)
        chemicals = parsed.get("chemicals") or []
        diseases = parsed.get("diseases") or []
        relations = parsed.get("relations") or []
    except (json.JSONDecodeError, KeyError, TypeError, AttributeError) as e:
        log.warning("  → JSON parse failed: %s", e)
        return GraphPayload()

    def _to_entity(item: object) -> tuple[str, str] | None:
        """Aceita {id, label_pt} OU uma string ASCII inglesa. Retorna (id, label).
        Descarta entidades sem id ASCII inglês — não inventa id a partir de label PT,
        para evitar buscar termos em português no MeSH."""
        if isinstance(item, str):
            ident = item.strip().lower().replace("-", "_").replace(" ", "_")
            if not ident or any(ord(c) > 127 for c in ident):
                log.warning("  → entity descartada (string não-ASCII ou vazia): %r", item)
                return None
            return (ident, item.strip())
        if isinstance(item, dict):
            raw_id = item.get("id") or ""
            ident = str(raw_id).strip().lower().replace("-", "_").replace(" ", "_")
            if not ident:
                log.warning("  → entity descartada (sem id): %r", item)
                return None
            if any(ord(c) > 127 for c in ident):
                log.warning("  → entity descartada (id não-ASCII): %r", item)
                return None
            label = (item.get("label_pt") or item.get("label") or ident).strip()
            return (ident, label or ident)
        return None

    nodes: list[GraphNode] = []
    seen: set[str] = set()
    for c in chemicals:
        ent = _to_entity(c)
        if not ent:
            continue
        cid, label = ent
        if cid in seen:
            continue
        seen.add(cid)
        nodes.append(GraphNode(id=cid, label=label, type="drug", size=28))
    for d in diseases:
        ent = _to_entity(d)
        if not ent:
            continue
        did, label = ent
        if did in seen:
            continue
        seen.add(did)
        nodes.append(GraphNode(id=did, label=label, type="condition", size=26))

    edges: list[GraphEdge] = []
    for r in relations:
        if not isinstance(r, dict):
            continue
        s = str(r.get("chemical_id") or r.get("quimico_id") or "").strip().lower().replace("-", "_").replace(" ", "_")
        t = str(r.get("disease_id") or r.get("doenca_id") or "").strip().lower().replace("-", "_").replace(" ", "_")
        if not s or not t:
            continue
        if s not in seen or t not in seen:
            continue
        etype = _norm_type(r.get("type", ""))
        label = {"induz": "causa", "trata": "trata", "sem_relacao": "sem relação"}[etype]
        edges.append(GraphEdge(s=s, t=t, type=etype, label=label, conf=0.5))

    return GraphPayload(nodes=nodes, edges=edges)


SYNONYMS_PROMPT = """You generate English medical synonyms for MeSH lookup.

Given a medical term in English (a DRUG/CHEMICAL or a DISEASE/CONDITION), return up
to {max_n} alternative English names ordered from most MeSH-canonical to most
colloquial. Include INN/generic names, brand-free synonyms, plural/singular swaps,
and the MeSH preferred heading when you know it.

Respond ONLY with a JSON object in this exact shape (no extra text, no markdown):
{{"synonyms": ["<synonym 1>", "<synonym 2>", "<synonym 3>"]}}

Rules:
- ASCII English only. No Portuguese.
- Do NOT repeat the input term.
- At most {max_n} entries.
- If you cannot think of any, return {{"synonyms": []}}.

Example 1 — input kind=condition term="liver_fibrosis"
Output: {{"synonyms": ["hepatic fibrosis", "fibrosis of the liver", "liver cirrhosis"]}}

Example 2 — input kind=drug term="paracetamol"
Output: {{"synonyms": ["acetaminophen", "N-acetyl-para-aminophenol", "APAP"]}}
"""


async def english_synonyms(
    term_en: str, kind: str, model_id: str, max_n: int = 3
) -> list[str]:
    """Retorna até `max_n` sinônimos médicos em inglês para `term_en`.
    `kind` é 'drug' ou 'condition'. Retorna [] em falha. Filtra não-ASCII."""
    llm = ChatOllama(model=model_id, think=False)
    user_text = f"kind={kind} term={term_en.replace('_', ' ')}"
    messages = [
        SystemMessage(content=SYNONYMS_PROMPT.format(max_n=max_n)),
        HumanMessage(content=user_text),
    ]
    log.info("  → synonyms.ainvoke (%s, %r)…", model_id, user_text)
    t0 = time.monotonic()
    try:
        response = await llm.ainvoke(messages)
    except Exception as e:
        log.warning("  → synonyms.ainvoke FAILED after %.1fs: %s", time.monotonic() - t0, e)
        return []
    raw = (response.content or "").strip()
    blob = _extract_json_blob(raw)
    if not blob:
        log.warning("  → synonyms: no JSON blob in response: %r", raw[:200])
        return []
    try:
        parsed = json.loads(blob)
        items = parsed.get("synonyms") or []
    except (json.JSONDecodeError, AttributeError, TypeError):
        return []
    out: list[str] = []
    seen: set[str] = set()
    original_norm = term_en.replace("_", " ").strip().lower()
    for it in items:
        if not isinstance(it, str):
            continue
        s = it.strip()
        if not s or any(ord(c) > 127 for c in s):
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
