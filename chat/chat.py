"""REPL — sandbox de debug para o agente.

Reusa exatamente a mesma lógica que a API expõe (backend.agent.run_agent_stream).
"""
import asyncio

from backend.agent import AVAILABLE_MODELS, DEFAULT_MODEL, run_agent_stream


async def turn(message: str, model_key: str) -> None:
    async for event, data in run_agent_stream(message, model_key):
        if event == "token":
            print(data["text"], end="", flush=True)
        elif event == "tool_call":
            print(f"\n  [tool: {data['name']}] input  -> {data['args']}")
            print(f"  [tool: {data['name']}] output -> {data['result']}\n")
        elif event == "done":
            print()


async def repl() -> None:
    current = DEFAULT_MODEL
    print(f"Conectado a {AVAILABLE_MODELS[current]}.")
    print("Comandos: /model qwen | /model llama | /quit\n")

    loop = asyncio.get_event_loop()
    while True:
        try:
            user_input = (await loop.run_in_executor(None, input, ">>> ")).strip()
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
                print(f"-> Trocado para {AVAILABLE_MODELS[current]}")
            else:
                print(f"Modelo desconhecido. Disponiveis: {list(AVAILABLE_MODELS)}")
            continue

        await turn(user_input, current)


if __name__ == "__main__":
    asyncio.run(repl())
