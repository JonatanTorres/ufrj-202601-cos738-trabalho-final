import json
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .agent import AVAILABLE_MODELS, DEFAULT_MODEL, run_agent_stream
from .schemas import ChatRequest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d %(name)s %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("medgraph").setLevel(logging.INFO)

app = FastAPI(title="MedGraph Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/models")
def models():
    return {"models": list(AVAILABLE_MODELS), "default": DEFAULT_MODEL}


@app.post("/chat")
async def chat(req: ChatRequest):
    if req.model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {req.model}")

    async def event_stream():
        async for event, data in run_agent_stream(req.message, req.model, req.history):
            yield {"event": event, "data": json.dumps(data, ensure_ascii=False)}

    return EventSourceResponse(event_stream())
