from pydantic import BaseModel, Field
from .agent import DEFAULT_MODEL


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    model: str = DEFAULT_MODEL
