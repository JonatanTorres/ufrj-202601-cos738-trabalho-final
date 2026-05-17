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


TOOLS = [avaliador]
TOOL_MAP = {t.name: t for t in TOOLS}
