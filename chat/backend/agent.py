import json
from typing import AsyncIterator, Protocol

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_ollama import ChatOllama

from .pipeline import run_medical_pipeline
from .tools import TOOLS, TOOL_MAP


class HistoryItem(Protocol):
    role: str
    content: str


AVAILABLE_MODELS = {
    "qwen":  "qwen3:8b",
    "llama": "llama3.1:8b",
}
DEFAULT_MODEL = "qwen"

MAIN_SYSTEM_PROMPT = """
Você é um assistente médico que conversa em português, especializado em discutir
relações entre químicos/medicamentos e doenças/condições.

Use a ferramenta 'pipeline_medico' SEMPRE que o usuário fizer uma pergunta OU
afirmação médica envolvendo um químico, medicamento ou suplemento E uma
doença, condição ou sintoma. Exemplos:
- "Creatina causa calvície?"
- "Methotrexate causa fibrose hepática"
- "Estatinas previnem AVC?"
- "Vitamina D trata depressão?"

A ferramenta retorna um JSON com veredito, grafos e artigos da PubMed. Após
recebê-lo, gere uma resposta curta e direta em português ao usuário citando o
veredito (Confirmado/Refutado/Indefinido/Contraditório/Sem evidência) e o
raciocínio resumido — o usuário verá o detalhe completo via UI.

NÃO use pipeline_medico para:
- Perguntas sem entidades químicas/médicas claras (ex.: "Qual a capital do Brasil?")
- Conversas gerais, opiniões, criatividade
- Pedidos de definição puramente conceitual sem afirmar uma relação
"""


def build_llm(model_key: str) -> ChatOllama:
    return ChatOllama(model=AVAILABLE_MODELS[model_key], reasoning=False)


def _build_clarification_message(enunciado: str, unresolved: list[dict]) -> str:
    if not unresolved:
        return (
            "Não consegui mapear todos os termos médicos da sua pergunta no MeSH. "
            "Pode reformular usando termos médicos mais específicos (em inglês, se possível)?"
        )
    lines = [
        "Não consegui localizar os seguintes termos da sua pergunta no vocabulário MeSH:",
        "",
    ]
    for u in unresolved:
        label = u.get("label") or u.get("id") or "?"
        attempts = u.get("attempts") or []
        if attempts:
            lines.append(f"- **{label}** (tentei: {', '.join(attempts)})")
        else:
            lines.append(f"- **{label}**")
    lines.extend([
        "",
        f"Sua pergunta foi: _{enunciado}_",
        "",
        "Você poderia reformular usando o termo médico equivalente em inglês "
        "ou um sinônimo mais específico? Em seguida vou rodar a busca novamente "
        "desde o início.",
    ])
    return "\n".join(lines)


async def run_agent_stream(
    message: str,
    model_key: str,
    history: list[HistoryItem] | None = None,
) -> AsyncIterator[tuple[str, dict]]:
    """Async generator que produz eventos do agente:
    - ("token", {"text": "..."}) para cada chunk de texto da resposta
    - ("tool_call", {"name", "args", "result"}) para ferramentas simples
    - ("pipeline_step", {"step", "status", "payload"}) para etapas do pipeline médico
    - ("done", {}) ao final
    """
    base_llm = build_llm(model_key)
    model_id = AVAILABLE_MODELS[model_key]
    llm_with_tools = base_llm.bind_tools(TOOLS)
    messages = [SystemMessage(content=MAIN_SYSTEM_PROMPT)]
    for h in history or []:
        if h.role == "user":
            messages.append(HumanMessage(content=h.content))
        elif h.role == "assistant":
            messages.append(AIMessage(content=h.content))
    messages.append(HumanMessage(content=message))

    decision = await llm_with_tools.ainvoke(messages)
    messages.append(decision)

    for tc in decision.tool_calls or []:
        if tc["name"] == "pipeline_medico":
            enunciado = tc["args"].get("enunciado") or message
            final_result: dict | None = None
            clarification_msg: str | None = None
            async for evt in run_medical_pipeline(enunciado, model_id):
                yield ("pipeline_step", evt.model_dump())
                if evt.step == "final" and evt.status == "ok":
                    final_result = evt.payload
                if (
                    evt.step == "mesh_search"
                    and evt.status == "needs_clarification"
                ):
                    clarification_msg = _build_clarification_message(
                        enunciado, evt.payload.get("unresolved") or []
                    )
            if clarification_msg is not None:
                yield ("token", {"text": clarification_msg})
                yield ("done", {})
                return
            tool_content = json.dumps(final_result or {}, ensure_ascii=False)
            messages.append(ToolMessage(content=tool_content, tool_call_id=tc["id"]))
        else:
            result = TOOL_MAP[tc["name"]].invoke(tc["args"])
            yield ("tool_call", {"name": tc["name"], "args": tc["args"], "result": result})
            messages.append(ToolMessage(content=result, tool_call_id=tc["id"]))

    if not decision.tool_calls:
        if decision.content:
            yield ("token", {"text": decision.content})
        yield ("done", {})
        return

    async for chunk in base_llm.astream(messages):
        if chunk.content:
            yield ("token", {"text": chunk.content})

    yield ("done", {})
