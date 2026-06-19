# MedGraph Chat

Interface conversacional que verifica afirmações médicas contra evidência
científica. O usuário faz uma pergunta de verdadeiro/falso ("A sinvastatina é
usada para tratar o colesterol alto?") e o sistema responde com um **veredito**
(`Confirmado`, `Refutado`, `Indefinido`, `Contraditório`, `Sem evidência`)
fundamentado em artigos da **PubMed**.

Por trás disso há um pipeline médico: tradução PT→EN → extração de um grafo de
entidades/relações → mapeamento para termos **MeSH** → busca na **PubMed** →
veredito gerado por LLM. O provedor de LLM é intercambiável: modelos locais via
**Ollama** (`qwen`, `llama`), **OpenAI** / **Azure OpenAI** (`gpt-5.4`,
`gpt-5.4-mini`) ou **Anthropic** (`claude-sonnet-4-6`, `claude-haiku-4-5`).

> **Onde está o código?** Tudo o que vale está na pasta [`chat/`](chat/).
> A pasta `_descartado-experimentos-iniciais/` é um rumo abandonado.

---

## ⚡ Caminho mais curto para testar

O caminho **mais simples** é usar modelos locais via **Ollama** — não exige nenhuma chave de API paga.

```bash
# 1. Ollama + os dois modelos locais
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:8b
ollama pull llama3.1:8b

# 2. Backend (Python)
cd chat
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env        # para Ollama, não precisa preencher nada

# 3. Frontend (Node)
cd frontend
npm install
```

Depois, em **dois terminais**:

```bash
# Terminal 1 — backend (porta 8000)
cd chat && .venv/bin/uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend (porta 5173)
cd chat/frontend && npm run dev
```

Abra **http://localhost:5173**, selecione o modelo `qwen` ou `llama` no seletor
e faça uma pergunta. (Para usar GPT/Claude, preencha as chaves no `.env` — ver
[Configuração do `.env`](#configuração-do-env).)

---

## Pré-requisitos

| Ferramenta | Versão  | Para quê                                                         |
| ---------- | ------- | ---------------------------------------------------------------- |
| Python     | 3.12+   | backend FastAPI + pipeline                                       |
| Node.js    | 18+     | frontend React/Vite                                              |
| Ollama     | recente | modelos locais (`qwen`, `llama`) — opcional se for usar só nuvem |

### Ollama + modelos locais (opcional, mas é o caminho sem chave)

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:8b
ollama pull llama3.1:8b
```

Verifique: `curl http://localhost:11434/api/tags` deve listar os dois modelos.

---

## Configuração do `.env`

Todas as chaves de API ficam em **`chat/.env`** (não é commitado — ver
`.gitignore`). Comece copiando o template:

```bash
cd chat
cp .env.example .env
```

Cada variável só é exigida pelos modelos do respectivo provedor. **Se for testar
só com Ollama, pode deixar o `.env` em branco.**

| Variável                   | Obrigatória para                        | Observação                                                |
| -------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `OPENAI_API_KEY`           | `gpt-5.4`, `gpt-5.4-mini` (OpenAI)      | chave `sk-...`                                            |
| `AZURE_OPENAI_API_KEY`     | `azure-gpt-5.4`, `azure-gpt-5.4-mini`   | chave do recurso Azure                                    |
| `AZURE_OPENAI_ENDPOINT`    | idem Azure                              | ex.: `https://meu-recurso.openai.azure.com/`              |
| `AZURE_OPENAI_API_VERSION` | idem Azure                              | default `2024-02-01`                                      |
| `ANTHROPIC_API_KEY`        | `claude-sonnet-4-6`, `claude-haiku-4-5` | chave `sk-ant-...`                                        |
| `NCBI_API_KEY`             | — (opcional)                            | sobe o limite da PubMed de 3→10 req/s e reduz erros `429` |
| `NCBI_EMAIL`               | — (opcional)                            | e-mail associado à chave NCBI                             |

> **Sobre o `NCBI_API_KEY`:** a busca na PubMed (etapa 4 do pipeline) usa a NCBI
> E-utilities. Sem chave o limite é 3 req/s e ela frequentemente devolve
> `429 Too Many Requests`. A chave eleva para 10 req/s. Mesmo sem ela há retry
> com backoff, mas a chave deixa o pipeline mais estável — recomendada se for
> rodar os benchmarks. Crie em <https://www.ncbi.nlm.nih.gov/account/>.
>
> **Azure:** além das variáveis, os _deployments_ `gpt-5.4` e `gpt-5.4-mini`
> precisam existir no recurso Azure com esses nomes.

---

## Benchmarks

A pasta [`chat/benchmark/`](chat/benchmark/) avalia os modelos sobre um conjunto
fixo de perguntas médicas de verdadeiro/falso. Há **dois tipos** de script:

- **`baseline_*`** — pergunta **direto ao modelo puro** (sem pipeline). Mede o
  conhecimento "de cabeça" do LLM. Saída: `Verdadeiro` / `Falso`. Os três
  scripts de baseline usam o **mesmo prompt zero-shot**, sem _system prompt_ e
  sem evidência, só a pergunta:

  ```python
  PROMPT_TEMPLATE = "Responda apenas 'Verdadeiro' ou 'Falso', sem explicação: {question}"
  ```

  O prompt é idêntico entre provedores de propósito: assim, qualquer diferença
  nos resultados vem do modelo, não da formulação da pergunta.

- **`pipeline_*`** — passa cada pergunta pelo **pipeline médico completo** do
  backend (tradução → grafo → MeSH → PubMed → veredito). Saída: o **veredito
  final** (`Confirmado`, `Refutado`, `Indefinido`, `Contraditório`,
  `Sem evidência`).

Cada script grava um CSV ao lado (`results_*.csv`).

### O que é cada arquivo

| Script                         | Tipo     | Provedor                  | Chaves no `.env`    | Backend de pé? | Saída                            |
| ------------------------------ | -------- | ------------------------- | ------------------- | -------------- | -------------------------------- |
| `baseline_ollama.py`           | baseline | Ollama (`qwen`, `llama`)  | —                   | não            | `results_bl_ollama.csv`          |
| `baseline_azure_openai.py`     | baseline | Azure OpenAI              | `AZURE_OPENAI_*`    | não            | `results_bl_azure_openai.csv`    |
| `baseline_anthropic.py`        | baseline | Anthropic (Sonnet, Haiku) | `ANTHROPIC_API_KEY` | não            | `results_bl_anthropic.csv`       |
| `pipeline_ollama.py`           | pipeline | Ollama (`qwen`, `llama`)  | —                   | **sim**        | `results_pl_ollama.csv`          |
| `pipeline_azure_openai.py`     | pipeline | Azure OpenAI              | `AZURE_OPENAI_*`    | **sim**        | `results_pl_azure_openai.csv`    |
| `pipeline_anthropic_haiku.py`  | pipeline | Anthropic Haiku           | `ANTHROPIC_API_KEY` | **sim**        | `results_pl_anthropic_haiku.csv` |
| `pipeline_anthropic_sonnet.py` | pipeline | Anthropic Sonnet          | `ANTHROPIC_API_KEY` | **sim**        | `results_pl_anthropic.csv`       |

> Sonnet e Haiku rodam em scripts separados de propósito, para controlar o custo
> de cada execução.

### Como rodar

Os scripts **baseline** não dependem do backend:

```bash
cd chat
source .venv/bin/activate
python benchmark/baseline_ollama.py      # local, sem chave
python benchmark/baseline_anthropic.py   # exige ANTHROPIC_API_KEY
```

Os scripts **pipeline** exigem o **backend de pé** (porta 8000), porque batem em
`POST http://localhost:8000/chat`:

```bash
# Terminal 1 — backend
cd chat
.venv/bin/uvicorn backend.main:app --port 8000

# Terminal 2 — benchmark
cd chat
source .venv/bin/activate
python benchmark/pipeline_ollama.py            # local, sem chave
python benchmark/pipeline_anthropic_haiku.py   # exige ANTHROPIC_API_KEY
```

> **Atenção às chaves:** rodar um benchmark de nuvem sem a chave correspondente
> no `chat/.env` falha. Para os de pipeline na PubMed, configure também o
> `NCBI_API_KEY` para evitar `429`. Os CSVs já versionados no repositório são as
> execuções que reportamos no trabalho — rodar os scripts de novo os sobrescreve.

---

## Arquitetura

```
frontend/ (React+Vite)  ◄── HTTP+SSE ──►  backend/ (FastAPI)  ◄──►  Ollama / OpenAI / Azure / Anthropic
                                          ├─ llm.py        (MODEL_REGISTRY + factory)
                                          ├─ agent.py      (run_agent_stream)
                                          ├─ tools.py      (@tool avaliador)
                                          └─ pipeline/     (tradução → grafo → MeSH → PubMed → veredito)
```

### Backend (`chat/backend/`)

- `main.py` — FastAPI: `GET /models`, `POST /chat` (SSE)
- `llm.py` — `MODEL_REGISTRY` + `build_chat_model` (provedor inferido por modelo)
- `config.py` — settings via `.env`
- `agent.py` — agente: `bind_tools` + loop async streaming
- `tools.py` — `@tool avaliador` (sub-LLM que restringe a resposta ao veredito)
- `schemas.py` — `ChatRequest`
- `pipeline/` — orquestração do pipeline médico (extração de grafo, tradução,
  NCBI/PubMed, cache, rate limit, veredito)

### Frontend (`chat/frontend/`)

- `src/api.ts` — cliente SSE manual (fetch + ReadableStream)
- `src/App.tsx` — orquestração: consome eventos, atualiza mensagens
- `src/components/` — Sidebar, Topbar, Welcome, Composer, AssistantMessage,
  UserMessage, VerdictBadge, ToolCallChip, ThinkingState, ModelPicker

### Eventos SSE

- `token` → chunk de texto da resposta do LLM principal
- `tool_call` → ferramenta invocada (frontend renderiza chip + verdict badge)
- `done` → fim do turno

---

## Modelos disponíveis

Definidos em `chat/backend/llm.py` (`MODEL_REGISTRY`); o provedor é inferido:

| Chave                                   | Provedor       | Chave de API necessária |
| --------------------------------------- | -------------- | ----------------------- |
| `qwen`, `llama`                         | Ollama (local) | nenhuma                 |
| `gpt-5.4`, `gpt-5.4-mini`               | OpenAI         | `OPENAI_API_KEY`        |
| `azure-gpt-5.4`, `azure-gpt-5.4-mini`   | Azure OpenAI   | `AZURE_OPENAI_*`        |
| `claude-sonnet-4-6`, `claude-haiku-4-5` | Anthropic      | `ANTHROPIC_API_KEY`     |

## Stack

| Camada          | Lib                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| LLM runtime     | Ollama (qwen3:8b, llama3.1:8b) · OpenAI / Azure (gpt-5.4, gpt-5.4-mini) · Anthropic (claude-sonnet-4-6, claude-haiku-4-5) |
| LLM SDK         | `langchain-ollama` + `langchain-openai` + `langchain-anthropic` + `langchain-core`                                        |
| Backend         | FastAPI + Uvicorn + `sse-starlette`                                                                                       |
| Frontend        | React 18 + Vite + TypeScript                                                                                              |
| Fontes externas | NCBI E-utilities (PubMed), MeSH                                                                                           |

---

## Estrutura do repositório

```
.
├── README.md                          ← este arquivo
├── chat/                              ← PROJETO FINAL (o que vale)
│   ├── .env.example                  ← template das chaves de API
│   ├── chat.py                       ← REPL de debug
│   ├── backend/                      ← FastAPI + pipeline médico
│   ├── frontend/                     ← React + Vite
│   └── benchmark/                    ← scripts de avaliação + CSVs de resultado
└── _descartado-experimentos-iniciais/ ← LIXO: rumo abandonado no início, ignorar
```
