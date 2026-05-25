from langchain_core.tools import tool
from pydantic import BaseModel, Field


class PipelineMedicoArgs(BaseModel):
    enunciado: str = Field(
        description="Pergunta ou afirmação do usuário em PT-BR envolvendo "
                    "um químico/medicamento/suplemento e uma doença/condição/sintoma."
    )


@tool(args_schema=PipelineMedicoArgs)
def pipeline_medico(enunciado: str) -> str:
    """Pipeline médico completo. Use SEMPRE que o usuário fizer uma afirmação ou
    pergunta envolvendo um químico/medicamento/suplemento e uma doença/condição/sintoma.

    O pipeline executa, em ordem:
    1) tradução PT→EN com persona de médico tradutor;
    2) extração de grafo (químicos × doenças × relações);
    3) busca de termos MeSH no NCBI;
    4) busca de artigos na PubMed (top 5);
    5) extração de grafo de cada artigo;
    6) agregação por voto majoritário para gerar veredito;
    7) tradução final EN→PT.

    Devolve veredito (Confirmado / Refutado / Indefinido / Contraditório / Sem evidência)
    e a resposta final em português."""
    return "{}"


TOOLS = [pipeline_medico]
TOOL_MAP = {t.name: t for t in TOOLS}
