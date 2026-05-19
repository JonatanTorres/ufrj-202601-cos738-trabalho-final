from typing import Literal, Optional

from pydantic import BaseModel, Field


StepName = Literal[
    "translate_pt_en",
    "extract_question",
    "mesh_search",
    "pubmed_search",
    "extract_articles",
    "verdict",
    "translate_en_pt",
    "final",
]

StepStatus = Literal["running", "ok", "error", "skipped"]

NodeType = Literal["drug", "condition"]
EdgeType = Literal["induz", "trata", "sem_relacao"]
ConsensusType = Literal["confirm", "refute", "neutral"]
VerdictLabel = Literal["Confirmado", "Refutado", "Indefinido", "Sem evidência", "Contraditório"]
VerdictTone = Literal["ok", "bad", "info", "warn"]


class GraphNode(BaseModel):
    id: str
    label: str
    type: NodeType
    size: int = 24


class GraphEdge(BaseModel):
    s: str
    t: str
    type: EdgeType
    label: str = ""
    conf: float = 0.5


class GraphPayload(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class TranslateStagePayload(BaseModel):
    input: str
    output: str
    persona: str
    notes: list[str] = Field(default_factory=list)
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    model: str = ""


class MeshLookup(BaseModel):
    term: str
    url: str
    mesh_id: Optional[str] = None
    mesh_label: Optional[str] = None
    count: int = 0
    ok: bool = True
    ms: int = 0


class MeshStagePayload(BaseModel):
    url_template: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=mesh&term={TERM}&retmode=json"
    lookups: list[MeshLookup] = Field(default_factory=list)


class PubmedArticle(BaseModel):
    pmid: str
    title: str
    authors: str = ""
    year: Optional[int] = None
    journal: str = ""
    design: Optional[str] = None
    n: Optional[int] = None
    abstract: str = ""
    weight: float = 0.5


class FetchStagePayload(BaseModel):
    query: str
    total_found: int = 0
    returned: int = 0
    articles: list[PubmedArticle] = Field(default_factory=list)


class ArticleVote(BaseModel):
    pmid: str
    supports: bool
    note: Optional[str] = None


class EdgeWithArticles(BaseModel):
    s: str
    t: str
    type: EdgeType
    articles: list[ArticleVote] = Field(default_factory=list)


class AggregateStagePayload(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[EdgeWithArticles] = Field(default_factory=list)


class EdgeConsensus(BaseModel):
    s: str
    t: str
    type: EdgeType
    consensus: ConsensusType
    note: Optional[str] = None


class VerdictScore(BaseModel):
    confirms: int = 0
    refutes: int = 0
    neutral: int = 0
    total_articles: int = 0


class VerdictStagePayload(BaseModel):
    label: VerdictLabel
    tone: VerdictTone
    title: str
    summary: str
    score: VerdictScore = Field(default_factory=VerdictScore)
    edges_consensus: list[EdgeConsensus] = Field(default_factory=list)


class PipelineResult(BaseModel):
    stage1: TranslateStagePayload
    stage2: GraphPayload
    stage3: MeshStagePayload
    stage4: FetchStagePayload
    stage5: AggregateStagePayload
    stage6: VerdictStagePayload
    stage7: TranslateStagePayload
    final_text_pt: str


class PipelineStepEvent(BaseModel):
    step: StepName
    status: StepStatus
    payload: dict = Field(default_factory=dict)
