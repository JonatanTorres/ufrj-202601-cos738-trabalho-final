import json
import time

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from .models import TranslateStagePayload

PERSONA = "Tradutor médico-clínico · register acadêmico"

PT_EN_PROMPT = """Você é um Tradutor Médico-Clínico (PT-BR → EN), com persona de médico
acadêmico. Sua função é traduzir afirmações ou perguntas médicas para inglês acadêmico
adequado a busca em literatura científica (PubMed/MeSH).

Diretrizes:
- Preserve termos técnicos consagrados em inglês quando aplicável (ex.: "methotrexate",
  não "metotrexato"; "statins").
- Expanda condições para o termo MeSH preferido quando óbvio
  (ex.: "calvície" → "androgenetic alopecia"; "demência" → "dementia or cognitive impairment").
- Preserve a estrutura (afirmação vs. interrogativa).
- Se o texto já estiver em inglês acadêmico, devolva-o praticamente inalterado.

Responda APENAS com um JSON no formato exato:
{"output": "<tradução em inglês>",
 "notes": ["<1 a 3 bullets curtos explicando decisões de tradução>"]}

Não inclua texto adicional, markdown ou code fences."""

EN_PT_PROMPT = """Você é um Tradutor Médico-Clínico (EN → PT-BR), com persona de médico
acadêmico. Sua função é traduzir respostas médicas curtas do inglês para português
brasileiro claro, mantendo precisão técnica.

Diretrizes:
- Preserve nomes de medicamentos em inglês quando consagrados (ex.: "methotrexate").
- Mantenha números, estatísticas e siglas (RCT, ECR, etc.) — use a forma em PT quando houver
  equivalente comum (ex.: RCT → ECR é opcional).
- Traduza condições para o termo médico em português (ex.: "liver fibrosis" → "fibrose hepática").
- Mantenha o tom conciso e factual.

Responda APENAS com um JSON no formato exato:
{"output": "<tradução em português>",
 "notes": ["<1 a 3 bullets curtos, opcionais>"]}

Não inclua texto adicional, markdown ou code fences."""


def _extract_json_blob(text: str) -> str | None:
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _approx_tokens(text: str) -> int:
    return max(1, len(text.split()))


async def _translate(text: str, system_prompt: str, model_id: str) -> tuple[str, list[str]]:
    llm = ChatOllama(model=model_id, think=False)
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=text)]
    response = await llm.ainvoke(messages)
    raw = (response.content or "").strip()
    blob = _extract_json_blob(raw)
    if not blob:
        return raw or text, []
    try:
        parsed = json.loads(blob)
        return parsed.get("output", text) or text, list(parsed.get("notes", []) or [])
    except (json.JSONDecodeError, AttributeError):
        return text, []


async def translate_pt_to_en(text: str, model_id: str) -> TranslateStagePayload:
    started = time.monotonic()
    try:
        output, notes = await _translate(text, PT_EN_PROMPT, model_id)
    except Exception:
        output, notes = text, []
    return TranslateStagePayload(
        input=text,
        output=output,
        persona=PERSONA,
        notes=notes,
        tokens_in=_approx_tokens(text),
        tokens_out=_approx_tokens(output),
        latency_ms=int((time.monotonic() - started) * 1000),
        model=model_id,
    )


async def translate_en_to_pt(text: str, model_id: str) -> TranslateStagePayload:
    started = time.monotonic()
    try:
        output, notes = await _translate(text, EN_PT_PROMPT, model_id)
    except Exception:
        output, notes = text, []
    return TranslateStagePayload(
        input=text,
        output=output,
        persona=PERSONA,
        notes=notes,
        tokens_in=_approx_tokens(text),
        tokens_out=_approx_tokens(output),
        latency_ms=int((time.monotonic() - started) * 1000),
        model=model_id,
    )
