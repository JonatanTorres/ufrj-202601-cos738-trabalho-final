"""Registro central de modelos e factory de LLM.

Concentra a escolha de provedor (Ollama local x OpenAI x Anthropic) num único
lugar. O resto do código trabalha apenas com `model_key` (ex.: "qwen",
"gpt-5.4-mini", "claude-sonnet-4-6") e chama `build_chat_model(model_key)`; o
provedor é inferido a partir de `MODEL_REGISTRY`.
"""
from dataclasses import dataclass, field

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models import BaseChatModel
from langchain_ollama import ChatOllama
from langchain_openai import AzureChatOpenAI, ChatOpenAI

from .config import get_settings


@dataclass(frozen=True)
class ModelSpec:
    key: str             # identificador usado pelo frontend/agente
    provider: str        # "ollama" | "openai" | "anthropic"
    model: str           # nome real passado ao SDK
    label: str           # rótulo exibido no frontend
    params: dict = field(default_factory=dict)


MODEL_REGISTRY: dict[str, ModelSpec] = {
    "qwen":                   ModelSpec("qwen",                   "ollama",    "qwen3:8b",                  "Qwen 3 8B",          {"reasoning": False}),
    "llama":                  ModelSpec("llama",                  "ollama",    "llama3.1:8b",               "Llama 3.1 8B",       {"reasoning": False}),
    "gpt-5.4-mini":           ModelSpec("gpt-5.4-mini",           "openai",    "gpt-5.4-mini",              "GPT-5.4 mini",       {}),
    "gpt-5.4":                ModelSpec("gpt-5.4",                "openai",    "gpt-5.4",                   "GPT-5.4",            {}),
    "azure-gpt-5.4-mini":     ModelSpec("azure-gpt-5.4-mini",     "azure",     "gpt-5.4-mini",              "GPT-5.4 mini (Az)",  {}),
    "azure-gpt-5.4":          ModelSpec("azure-gpt-5.4",          "azure",     "gpt-5.4",                   "GPT-5.4 (Az)",       {}),
    "claude-sonnet-4-6":      ModelSpec("claude-sonnet-4-6",      "anthropic", "claude-sonnet-4-6",         "Claude Sonnet 4.6",  {"max_tokens": 4096}),
    "claude-haiku-4-5":       ModelSpec("claude-haiku-4-5",       "anthropic", "claude-haiku-4-5-20251001", "Claude Haiku 4.5",   {"max_tokens": 4096}),
}
DEFAULT_MODEL = "qwen"


def build_chat_model(model_key: str) -> BaseChatModel:
    """Instancia o chat model do provedor correto para `model_key`.

    A chave da OpenAI só é exigida quando um modelo OpenAI é efetivamente usado —
    quem roda apenas com Ollama não precisa de `.env`.
    """
    spec = MODEL_REGISTRY[model_key]
    if spec.provider == "ollama":
        return ChatOllama(model=spec.model, **spec.params)
    if spec.provider == "openai":
        api_key = get_settings().openai_api_key
        if not api_key:
            raise RuntimeError(
                f"Modelo '{model_key}' requer OpenAI, mas OPENAI_API_KEY não está definida."
            )
        return ChatOpenAI(model=spec.model, api_key=api_key, **spec.params)
    if spec.provider == "azure":
        s = get_settings()
        if not s.azure_openai_api_key or not s.azure_openai_endpoint:
            raise RuntimeError(
                f"Modelo '{model_key}' requer Azure OpenAI, mas AZURE_OPENAI_API_KEY ou "
                "AZURE_OPENAI_ENDPOINT não estão definidas."
            )
        return AzureChatOpenAI(
            azure_deployment=spec.model,
            azure_endpoint=s.azure_openai_endpoint,
            api_version=s.azure_openai_api_version,
            api_key=s.azure_openai_api_key,
            **spec.params,
        )
    if spec.provider == "anthropic":
        api_key = get_settings().anthropic_api_key
        if not api_key:
            raise RuntimeError(
                f"Modelo '{model_key}' requer Anthropic, mas ANTHROPIC_API_KEY não está definida."
            )
        return ChatAnthropic(model=spec.model, api_key=api_key, **spec.params)
    raise ValueError(f"provider desconhecido: {spec.provider!r}")


def model_display_name(model_key: str) -> str:
    """Nome real do modelo (para exibição/telemetria nos payloads do pipeline)."""
    return MODEL_REGISTRY[model_key].model
