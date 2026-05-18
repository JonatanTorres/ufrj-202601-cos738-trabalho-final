import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_ollama import ChatOllama

AVALIADOR_SYSTEM_PROMPT = """Você é um agente avaliador.
Dado um enunciado, responda APENAS com uma das quatro opções:
- Confirmado
- Refutado
- Sem relação
- Indefinido

Não explique. Não adicione nenhum outro texto. Apenas uma das quatro opções."""

AVALIADOR_MODEL = "qwen3:8b"


@tool
def avaliador(enunciado: str) -> str:
    """Avalia se um enunciado é verdadeiro ou falso.
    Retorna: Confirmado, Refutado, Sem relação ou Indefinido."""
    llm = ChatOllama(model=AVALIADOR_MODEL, think=False)
    messages = [
        SystemMessage(content=AVALIADOR_SYSTEM_PROMPT),
        HumanMessage(content=enunciado),
    ]
    response = llm.invoke(messages)
    return response.content.strip()


EXTRATOR_GRAFO_MODEL = "qwen3:8b"

EXTRATOR_GRAFO_SYSTEM_PROMPT = """Você é um extrator de entidades médicas.
Dada uma afirmação ou pergunta médica, extraia TODOS os QUÍMICOS (medicamentos,
suplementos, substâncias) e TODAS as DOENÇAS (condições, sintomas) mencionados,
e identifique TODAS as RELAÇÕES afirmadas entre eles. Não omita entidades.

Responda APENAS com um objeto JSON no formato exato abaixo, sem texto adicional,
sem markdown, sem code fences:

{"quimicos": [{"id": "<slug>", "label": "<nome>"}],
 "doencas":  [{"id": "<slug>", "label": "<nome>"}],
 "relacoes": [{"quimico_id": "<slug>", "doenca_id": "<slug>",
               "type": "<induz|trata|sem relação>", "label": "<verbo>"}]}

Regras:
- "id" deve ser minúsculo, sem espaços, sem acentos (ex.: "creatina", "calvicie", "demencia").
- "label" mantém o nome em português, com acentos.
- Liste cada químico UMA vez em "quimicos" e cada doença UMA vez em "doencas",
  mesmo que apareçam em várias relações.
- Crie UMA entrada em "relacoes" para CADA par (químico, doença) afirmado no enunciado.
  Se o enunciado afirma que um químico afeta DUAS doenças, gere DUAS relações.
- "type" deve ser EXATAMENTE uma destas três strings:
  - "induz" — quando o químico causa/provoca/leva à doença
  - "trata" — quando o químico trata/cura/previne/melhora a doença
  - "sem relação" — quando não há relação clara ou a afirmação nega a relação
- "label" da relação é o verbo curto da afirmação (ex.: "causa", "trata", "previne", "induz").

Exemplo 1 — entrada: "Creatina causa calvície?"
Saída: {"quimicos": [{"id": "creatina", "label": "Creatina"}], "doencas": [{"id": "calvicie", "label": "Calvície"}], "relacoes": [{"quimico_id": "creatina", "doenca_id": "calvicie", "type": "induz", "label": "causa"}]}

Exemplo 2 — entrada: "Vastatina ao longo do tempo torna o usuário diabético e com demência?"
Saída: {"quimicos": [{"id": "vastatina", "label": "Vastatina"}], "doencas": [{"id": "diabetes", "label": "Diabetes"}, {"id": "demencia", "label": "Demência"}], "relacoes": [{"quimico_id": "vastatina", "doenca_id": "diabetes", "type": "induz", "label": "causa"}, {"quimico_id": "vastatina", "doenca_id": "demencia", "type": "induz", "label": "causa"}]}
"""


def _extract_json_blob(text: str) -> str | None:
    """Pega o primeiro {...} balanceado do texto; tolera prefixo/sufixo."""
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


@tool
def extrator_grafo(enunciado: str) -> str:
    """Extrai de uma afirmação ou pergunta médica o químico, a doença e a relação
    afirmada entre eles. Retorna um JSON {nodes, edges} para visualização em grafo.
    Use sempre que o enunciado envolver um químico/medicamento e uma doença/condição."""
    llm = ChatOllama(model=EXTRATOR_GRAFO_MODEL, think=False)
    messages = [
        SystemMessage(content=EXTRATOR_GRAFO_SYSTEM_PROMPT),
        HumanMessage(content=enunciado),
    ]
    response = llm.invoke(messages)
    raw = response.content.strip()

    blob = _extract_json_blob(raw)
    if not blob:
        return json.dumps({"error": "no_json", "raw": raw}, ensure_ascii=False)

    try:
        parsed = json.loads(blob)
        quimicos = parsed["quimicos"]
        doencas = parsed["doencas"]
        relacoes = parsed["relacoes"]
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        return json.dumps({"error": "parse_failed", "detail": str(e), "raw": raw}, ensure_ascii=False)

    nodes = []
    seen_ids: set[str] = set()
    for q in quimicos:
        if q["id"] in seen_ids:
            continue
        seen_ids.add(q["id"])
        nodes.append({"id": q["id"], "label": q["label"], "type": "drug", "size": 28})
    for d in doencas:
        if d["id"] in seen_ids:
            continue
        seen_ids.add(d["id"])
        nodes.append({"id": d["id"], "label": d["label"], "type": "condition", "size": 26})

    edges = []
    for r in relacoes:
        rel_type = r.get("type", "sem relação")
        if rel_type not in ("induz", "trata", "sem relação"):
            rel_type = "sem relação"
        edges.append({
            "s": r["quimico_id"],
            "t": r["doenca_id"],
            "type": rel_type,
            "conf": 0.5,
            "label": r.get("label", rel_type),
        })

    return json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False)


TOOLS = [extrator_grafo]
TOOL_MAP = {t.name: t for t in TOOLS}
