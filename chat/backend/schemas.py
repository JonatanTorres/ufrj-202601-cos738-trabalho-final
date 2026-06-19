from typing import Literal

from pydantic import BaseModel, Field
from .agent import DEFAULT_MODEL


class HistoryMsg(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    model: str = DEFAULT_MODEL
    history: list[HistoryMsg] = Field(default_factory=list)
