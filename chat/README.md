# MedGraph Chat

Interface conversacional baseada em LangChain + Ollama, com agente avaliador
acionado via tool calling. Backend FastAPI expondo SSE, frontend React/Vite
baseado no Claude Design (em `frontend/_design-reference/`).

## Pré-requisitos

### Ollama + modelos
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:8b
ollama pull llama3.1:8b
```
Verifique: `curl http://localhost:11434/api/tags` deve listar os dois modelos.

### Python venv + dependências
```bash
cd chat
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Node modules (frontend)
```bash
cd chat/frontend
npm install
```

## Como rodar

Em dois terminais separados:

**Terminal 1 — Backend (FastAPI, porta 8000):**
```bash
cd chat
.venv/bin/uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Frontend (Vite, porta 5173):**
```bash
cd chat/frontend
npm run dev
```

Abrir `http://localhost:5173`. O Vite faz proxy de `/api/*` para o backend.

## REPL (sandbox de debug)

Sem precisar do frontend, dá para testar o agente direto no terminal:
```bash
cd chat
.venv/bin/python chat.py
```

Comandos: `/model qwen | /model llama | /quit`.

## Arquitetura

```
frontend/ (React+Vite)   ◄── HTTP+SSE ──►   backend/ (FastAPI)   ◄──►   Ollama
                                            └─ agent.py (run_agent_stream)
                                            └─ tools.py (@tool avaliador)
```

### Backend
- `backend/main.py` — FastAPI: `GET /models`, `POST /chat` (SSE)
- `backend/agent.py` — agente: `bind_tools` + loop async streaming
- `backend/tools.py` — `@tool avaliador` (um sub-LLM com system prompt restringindo
  a resposta a `Confirmado | Refutado | Sem relação | Indefinido`)
- `backend/schemas.py` — `ChatRequest`

### Frontend
- `src/api.ts` — SSE client manual (fetch + ReadableStream; `EventSource` só faz GET)
- `src/App.tsx` — orquestração: consome eventos, atualiza mensagens
- `src/components/` — Sidebar, Topbar, Welcome, Composer, AssistantMessage,
  UserMessage, VerdictBadge, ToolCallChip, ThinkingState, ModelPicker

### Eventos SSE
- `token` → chunk de texto da resposta do LLM principal
- `tool_call` → ferramenta invocada (frontend renderiza chip + verdict badge)
- `done` → fim do turno

## Stack

| Camada | Lib |
|---|---|
| LLM runtime | Ollama (qwen3:8b, llama3.1:8b) |
| LLM SDK | `langchain-ollama` + `langchain-core` |
| Backend | FastAPI + Uvicorn + `sse-starlette` |
| Frontend | React 18 + Vite + TypeScript |
