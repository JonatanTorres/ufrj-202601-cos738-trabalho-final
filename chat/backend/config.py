"""Configuração via variáveis de ambiente / `.env`.

O `.env` mora na raiz de `chat/` (mesmo CWD do `uvicorn backend.main:app` e do
REPL `chat.py`) e NÃO é commitado (ver `.gitignore`). Use `chat/.env.example`
como referência.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str | None = None     # OPENAI_API_KEY
    anthropic_api_key: str | None = None  # ANTHROPIC_API_KEY


@lru_cache
def get_settings() -> Settings:
    return Settings()
