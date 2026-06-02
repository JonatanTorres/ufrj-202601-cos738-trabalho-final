import time

from langchain_core.prompts import ChatPromptTemplate

from ..llm import build_chat_model, model_display_name
from .llm_schemas import LLMTranslation
from .models import GlossaryEntry, TranslateStagePayload
from .prompts import EN_PT_TEMPLATE, PT_EN_TEMPLATE

PERSONA = "Tradutor médico-clínico · register acadêmico"


def _approx_tokens(text: str) -> int:
    return max(1, len(text.split()))


async def _translate(
    text: str, template: ChatPromptTemplate, model_key: str
) -> LLMTranslation | None:
    llm = build_chat_model(model_key).with_structured_output(
        LLMTranslation, method="json_schema"
    )
    chain = template | llm
    try:
        return await chain.ainvoke({"text": text})
    except Exception:
        return None


async def translate_pt_to_en(text: str, model_key: str) -> TranslateStagePayload:
    started = time.monotonic()
    result = await _translate(text, PT_EN_TEMPLATE, model_key)
    output = (result.output if result else None) or text
    notes = list(result.notes) if result else []
    glossary = [
        GlossaryEntry(term_pt=g.term_pt, term_en=g.term_en)
        for g in (result.glossary if result else [])
        if g.term_pt.strip() and g.term_en.strip()
    ]
    return TranslateStagePayload(
        input=text,
        output=output,
        persona=PERSONA,
        notes=notes,
        glossary=glossary,
        tokens_in=_approx_tokens(text),
        tokens_out=_approx_tokens(output),
        latency_ms=int((time.monotonic() - started) * 1000),
        model=model_display_name(model_key),
    )


async def translate_en_to_pt(text: str, model_key: str) -> TranslateStagePayload:
    started = time.monotonic()
    result = await _translate(text, EN_PT_TEMPLATE, model_key)
    output = (result.output if result else None) or text
    notes = list(result.notes) if result else []
    return TranslateStagePayload(
        input=text,
        output=output,
        persona=PERSONA,
        notes=notes,
        tokens_in=_approx_tokens(text),
        tokens_out=_approx_tokens(output),
        latency_ms=int((time.monotonic() - started) * 1000),
        model=model_display_name(model_key),
    )
