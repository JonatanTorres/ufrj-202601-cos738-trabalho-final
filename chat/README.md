# MedGraph Chat

Interface conversacional baseada em LangChain, com agente avaliador acionado via
tool calling. O provedor de LLM é intercambiável: modelos locais via **Ollama**
(`qwen`, `llama`), da **OpenAI** (`gpt-5.4-mini`, `gpt-5.4`) ou da **Anthropic**
(`claude-sonnet-4-6`, `claude-haiku-4-5`). Backend FastAPI expondo SSE, frontend
React/Vite baseado no Claude Design (em `frontend/_design-reference/`).

Os modelos disponíveis ficam num registro central em `backend/llm.py`
(`MODEL_REGISTRY`); o provedor é inferido por modelo.

## Pré-requisitos

### Ollama + modelos (para os modelos locais)
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:8b
ollama pull llama3.1:8b
```
Verifique: `curl http://localhost:11434/api/tags` deve listar os dois modelos.

### OpenAI / Anthropic (para os modelos de nuvem)
```bash
cd chat
cp .env.example .env
# edite .env e preencha as chaves dos provedores que for usar:
#   OPENAI_API_KEY=sk-...       (gpt-5.4-mini, gpt-5.4)
#   ANTHROPIC_API_KEY=sk-ant-...(claude-sonnet-4-6, claude-haiku-4-5)
```
O `.env` não é commitado. Cada chave só é exigida quando um modelo do respectivo
provedor é selecionado — quem usa só Ollama pode ignorar este passo.

Opcionalmente, defina `NCBI_API_KEY` (e `NCBI_EMAIL`) no mesmo `.env`: a busca da
PubMed (etapa 4) usa a NCBI E-utilities, que sem chave limita a 3 req/s e
frequentemente devolve `429 Too Many Requests`. A chave eleva o limite para 10
req/s. Mesmo sem ela há retry com backoff, mas a chave deixa o pipeline mais
estável. Crie em https://www.ncbi.nlm.nih.gov/account/.

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

Comandos: `/model qwen | /model llama | /model gpt-5.4-mini | /model gpt-5.4 | /quit`.

## Arquitetura

```
frontend/ (React+Vite)   ◄── HTTP+SSE ──►   backend/ (FastAPI)   ◄──►   Ollama / OpenAI / Anthropic
                                            └─ llm.py (MODEL_REGISTRY + factory)
                                            └─ agent.py (run_agent_stream)
                                            └─ tools.py (@tool avaliador)
```

### Backend
- `backend/main.py` — FastAPI: `GET /models`, `POST /chat` (SSE)
- `backend/llm.py` — registro de modelos + `build_chat_model` (Ollama/OpenAI)
- `backend/config.py` — settings via `.env` (`OPENAI_API_KEY`)
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
| LLM runtime | Ollama (qwen3:8b, llama3.1:8b) · OpenAI (gpt-5.4-mini, gpt-5.4) · Anthropic (claude-sonnet-4-6, claude-haiku-4-5) |
| LLM SDK | `langchain-ollama` + `langchain-openai` + `langchain-anthropic` + `langchain-core` |
| Backend | FastAPI + Uvicorn + `sse-starlette` |
| Frontend | React 18 + Vite + TypeScript |
