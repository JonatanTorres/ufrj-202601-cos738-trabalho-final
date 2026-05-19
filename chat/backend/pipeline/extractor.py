import json

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from .models import GraphEdge, GraphNode, GraphPayload

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
- "id" MUST be lowercase, English, snake_case, no accents (e.g., "methotrexate",
  "liver_fibrosis", "creatine", "androgenetic_alopecia").
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
    try:
        response = await llm.ainvoke(messages)
    except Exception:
        return GraphPayload()

    raw = (response.content or "").strip()
    blob = _extract_json_blob(raw)
    if not blob:
        return GraphPayload()

    try:
        parsed = json.loads(blob)
        chemicals = parsed.get("chemicals") or []
        diseases = parsed.get("diseases") or []
        relations = parsed.get("relations") or []
    except (json.JSONDecodeError, KeyError, TypeError):
        return GraphPayload()

    nodes: list[GraphNode] = []
    seen: set[str] = set()
    for c in chemicals:
        cid = (c.get("id") or "").strip().lower().replace("-", "_").replace(" ", "_")
        label = (c.get("label_pt") or c.get("label") or cid).strip()
        if not cid or cid in seen:
            continue
        seen.add(cid)
        nodes.append(GraphNode(id=cid, label=label, type="drug", size=28))
    for d in diseases:
        did = (d.get("id") or "").strip().lower().replace("-", "_").replace(" ", "_")
        label = (d.get("label_pt") or d.get("label") or did).strip()
        if not did or did in seen:
            continue
        seen.add(did)
        nodes.append(GraphNode(id=did, label=label, type="condition", size=26))

    edges: list[GraphEdge] = []
    for r in relations:
        s = (r.get("chemical_id") or r.get("quimico_id") or "").strip().lower().replace("-", "_").replace(" ", "_")
        t = (r.get("disease_id") or r.get("doenca_id") or "").strip().lower().replace("-", "_").replace(" ", "_")
        if not s or not t:
            continue
        if s not in seen or t not in seen:
            continue
        etype = _norm_type(r.get("type", ""))
        label = {"induz": "causa", "trata": "trata", "sem_relacao": "sem relação"}[etype]
        edges.append(GraphEdge(s=s, t=t, type=etype, label=label, conf=0.5))

    return GraphPayload(nodes=nodes, edges=edges)
