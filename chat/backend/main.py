import json
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .agent import run_agent_stream
from .llm import DEFAULT_MODEL, MODEL_REGISTRY
from .schemas import ChatRequest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d %(name)s %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("medgraph").setLevel(logging.INFO)
log = logging.getLogger("medgraph.api")

app = FastAPI(title="MedGraph Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/models")
def models():
    return {
        "models": [
            {"key": s.key, "label": s.label, "provider": s.provider}
            for s in MODEL_REGISTRY.values()
        ],
        "default": DEFAULT_MODEL,
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    if req.model not in MODEL_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Unknown model: {req.model}")

    async def event_stream():
        try:
            async for event, data in run_agent_stream(req.message, req.model, req.history):
                yield {"event": event, "data": json.dumps(data, ensure_ascii=False)}
        except Exception as e:
            log.exception("Falha no agente")
            yield {"event": "error", "data": json.dumps({"message": str(e)}, ensure_ascii=False)}
            yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_stream())
