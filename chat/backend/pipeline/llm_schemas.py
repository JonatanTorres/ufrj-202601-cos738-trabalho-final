from typing import Literal

from pydantic import BaseModel, Field


class LLMEntity(BaseModel):
    id: str = Field(
        description="ASCII English lowercase snake_case identifier "
                    "(e.g. 'methotrexate', 'liver_fibrosis'). Never in Portuguese."
    )
    label_pt: str = Field(description="Brazilian Portuguese display name.")


class LLMRelation(BaseModel):
    chemical_id: str = Field(description="Matches the id of an entry in 'chemicals'.")
    disease_id: str = Field(description="Matches the id of an entry in 'diseases'.")
    type: Literal["induces", "treats", "no_relation"] = Field(
        description=(
            "induces = chemical causes/induces/increases risk of the disease; "
            "treats = chemical treats/cures/prevents/improves the disease; "
            "no_relation = no clear relation, or text states there is none."
        )
    )


class LLMExtractorResult(BaseModel):
    chemicals: list[LLMEntity] = Field(default_factory=list)
    diseases: list[LLMEntity] = Field(default_factory=list)
    relations: list[LLMRelation] = Field(default_factory=list)


class LLMSynonyms(BaseModel):
    synonyms: list[str] = Field(
        default_factory=list,
        description="English medical synonyms, ordered most-canonical to most-colloquial.",
    )


class GlossaryTerm(BaseModel):
    term_pt: str = Field(
        description="Brazilian Portuguese form of the medical term, "
                    "as written by the user (or canonical PT-BR if input was EN)."
    )
    term_en: str = Field(
        description="English form of the medical term used in the translation output."
    )


class LLMTranslation(BaseModel):
    output: str = Field(description="Translated text.")
    notes: list[str] = Field(
        default_factory=list,
        description="0 to 3 short bullets explaining translation decisions.",
    )
    glossary: list[GlossaryTerm] = Field(
        default_factory=list,
        description=(
            "Key medical terms (drugs, conditions, procedures) mentioned in the "
            "input, paired as PT-BR ↔ EN. Used by downstream extractor to align "
            "labels with the user's wording."
        ),
    )
