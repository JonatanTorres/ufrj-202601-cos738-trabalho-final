from typing import AsyncIterator, Protocol
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_ollama import ChatOllama

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
Você é um assistente útil que conversa em português, especializado em discutir
relações entre químicos/medicamentos e doenças/condições.

Use a ferramenta 'extrator_grafo' sempre que o usuário fizer uma pergunta OU
afirmação médica envolvendo um químico, medicamento ou suplemento e uma
doença, condição ou sintoma. Exemplos:
- "Creatina causa calvície?"
- "Methotrexate causa fibrose hepática"
- "Estatinas previnem AVC?"
- "Vitamina D trata depressão?"

NÃO use extrator_grafo para:
- Perguntas sem entidades químicas/médicas claras (ex.: "Qual a capital do Brasil?")
- Conversas gerais, opiniões, criatividade
- Pedidos de definição puramente conceitual sem afirmar uma relação
"""


def build_llm(model_key: str) -> ChatOllama:
    return ChatOllama(model=AVAILABLE_MODELS[model_key], think=False)


async def run_agent_stream(
    message: str,
    model_key: str,
    history: list[HistoryItem] | None = None,
) -> AsyncIterator[tuple[str, dict]]:
    """Async generator que produz eventos do agente:
    - ("token", {"text": "..."}) para cada chunk de texto da resposta
    - ("tool_call", {"name", "args", "result"}) para cada ferramenta invocada
    - ("done", {}) ao final

    Nota: langchain-ollama 0.2.0 desabilita o streaming quando bind_tools está ativo
    (retorna a resposta inteira num único chunk). Por isso a chamada de decisão usa
    bind_tools (ainvoke), mas a resposta final usa o LLM base (astream) — onde o
    streaming funciona token-a-token. Trade-off: não suporta múltiplas rodadas de
    tool calls encadeadas, mas o caso de uso atual (uma chamada de avaliador) é
    coberto.
    """
    base_llm = build_llm(model_key)
    llm_with_tools = base_llm.bind_tools(TOOLS)
    messages = [SystemMessage(content=MAIN_SYSTEM_PROMPT)]
    for h in history or []:
        if h.role == "user":
            messages.append(HumanMessage(content=h.content))
        elif h.role == "assistant":
            messages.append(AIMessage(content=h.content))
    messages.append(HumanMessage(content=message))

    # Fase 1 — decisão: tool ou texto? (não-streaming)
    decision = await llm_with_tools.ainvoke(messages)
    messages.append(decision)

    # Executa as ferramentas pedidas
    for tc in decision.tool_calls or []:
        result = TOOL_MAP[tc["name"]].invoke(tc["args"])
        yield ("tool_call", {"name": tc["name"], "args": tc["args"], "result": result})
        messages.append(ToolMessage(content=result, tool_call_id=tc["id"]))

    if not decision.tool_calls:
        # LLM decidiu responder direto, sem ferramentas
        if decision.content:
            yield ("token", {"text": decision.content})
        yield ("done", {})
        return

    # Fase 2 — resposta final com streaming real (LLM base, sem bind_tools)
    async for chunk in base_llm.astream(messages):
        if chunk.content:
            yield ("token", {"text": chunk.content})

    yield ("done", {})
