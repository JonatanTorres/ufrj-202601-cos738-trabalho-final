from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

AVAILABLE_MODELS = {
    "qwen":  "qwen3:8b",
    "llama": "llama3.1:8b",
}
DEFAULT_MODEL = "qwen"

# System prompt do agente principal — instrui quando usar a ferramenta
MAIN_SYSTEM_PROMPT = """Você é um assistente útil.
Quando o usuário fizer uma afirmação factual ou pedir para avaliar algo, use a ferramenta 'avaliador'."""

# System prompt do agente avaliador — restringe o output a 4 opções
AVALIADOR_SYSTEM_PROMPT = """Você é um agente avaliador.
Dado um enunciado, responda APENAS com uma das quatro opções:
- Confirmado
- Refutado
- Sem relação
- Indefinido

Não explique. Não adicione nenhum outro texto. Apenas uma das quatro opções."""


def build_llm(model_key: str) -> ChatOllama:
    return ChatOllama(model=AVAILABLE_MODELS[model_key], think=False)


# @tool registra a função como uma ferramenta LangChain:
# - o nome da função vira o nome da ferramenta
# - a docstring vira a descrição que o LLM lê para decidir quando chamá-la
# - os tipos dos parâmetros viram o schema JSON enviado ao LLM
@tool
def avaliador(enunciado: str) -> str:
    """Avalia se um enunciado é verdadeiro ou falso.
    Retorna: Confirmado, Refutado, Sem relação ou Indefinido."""
    llm = build_llm(DEFAULT_MODEL)
    messages = [
        SystemMessage(content=AVALIADOR_SYSTEM_PROMPT),
        HumanMessage(content=enunciado),
    ]
    response = llm.invoke(messages)
    return response.content.strip()


TOOLS = [avaliador]
TOOL_MAP = {t.name: t for t in TOOLS}


def run_agent(llm: ChatOllama, user_input: str) -> None:
    # bind_tools injeta o schema das ferramentas no contexto do LLM
    llm_with_tools = llm.bind_tools(TOOLS)

    messages = [
        SystemMessage(content=MAIN_SYSTEM_PROMPT),
        HumanMessage(content=user_input),
    ]

    # Loop do agente: roda até o LLM responder sem chamar ferramenta
    while True:
        response = llm_with_tools.invoke(messages)
        messages.append(response)

        if not response.tool_calls:
            # Resposta final — nenhuma ferramenta solicitada
            print(response.content, "\n")
            break

        # LLM solicitou uma ou mais chamadas de ferramenta
        for tc in response.tool_calls:
            print(f"  [tool: {tc['name']}] input  → {tc['args']}")
            result = TOOL_MAP[tc["name"]].invoke(tc["args"])
            print(f"  [tool: {tc['name']}] output → {result}\n")
            # ToolMessage devolve o resultado ao LLM para ele continuar
            messages.append(ToolMessage(content=result, tool_call_id=tc["id"]))


def main() -> None:
    current = DEFAULT_MODEL
    llm = build_llm(current)
    print(f"Conectado a {AVAILABLE_MODELS[current]}.")
    print("Comandos: /model qwen | /model llama | /quit\n")

    while True:
        try:
            user_input = input(">>> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not user_input:
            continue
        if user_input == "/quit":
            break
        if user_input.startswith("/model "):
            choice = user_input.split(" ", 1)[1].strip()
            if choice in AVAILABLE_MODELS:
                current = choice
                llm = build_llm(current)
                print(f"-> Trocado para {AVAILABLE_MODELS[current]}")
            else:
                print(f"Modelo desconhecido. Disponiveis: {list(AVAILABLE_MODELS)}")
            continue

        run_agent(llm, user_input)


if __name__ == "__main__":
    main()
