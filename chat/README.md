# Chat — Hello World LangChain + Ollama

Interface conversacional mínima que conversa com modelos locais via Ollama
(`qwen3:8b` e `llama3.1:8b`), com troca rápida entre eles.

## 1. Instalar Ollama (uma vez)

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:8b
ollama pull llama3.1:8b
```

No WSL2, o `install.sh` já registra o serviço; se precisar subir manualmente:

```bash
ollama serve
```

Verifique se está OK:

```bash
curl http://localhost:11434/api/tags
```

A resposta deve listar `qwen3:8b` e `llama3.1:8b`.

## 2. Setup do projeto

```bash
cd chat
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 3. Executar

```bash
python chat.py
```

## Uso

```
Conectado a qwen3:8b.
Comandos: /model qwen | /model llama | /quit

>>> Olá, quem é você?
...
>>> /model llama
-> Trocado para llama3.1:8b
>>> /quit
```
