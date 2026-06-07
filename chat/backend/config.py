"""Configuração via variáveis de ambiente / `.env`.

O `.env` mora na raiz de `chat/` (mesmo CWD do `uvicorn backend.main:app` e do
REPL `chat.py`) e NÃO é commitado (ver `.gitignore`). Use `chat/.env.example`
como referência.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str | None = None            # OPENAI_API_KEY
    azure_openai_api_key: str | None = None      # AZURE_OPENAI_API_KEY
    azure_openai_endpoint: str | None = None     # AZURE_OPENAI_ENDPOINT
    azure_openai_api_version: str = "2024-02-01" # AZURE_OPENAI_API_VERSION
    anthropic_api_key: str | None = None         # ANTHROPIC_API_KEY

    # NCBI E-utilities: a api_key sobe o limite de 3→10 req/s e reduz 429s.
    # tool/email são apenas etiqueta recomendada pela NCBI.
    ncbi_api_key: str | None = None       # NCBI_API_KEY
    ncbi_email: str | None = None         # NCBI_EMAIL
    ncbi_tool: str = "medgraph"           # NCBI_TOOL


@lru_cache
def get_settings() -> Settings:
    return Settings()
