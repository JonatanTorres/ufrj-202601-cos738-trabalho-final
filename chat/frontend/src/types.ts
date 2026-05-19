export type ModelKey = "qwen" | "llama";

export type VerdictTone = "ok" | "warn" | "bad" | "info";
export type VerdictLabel =
  | "Confirmado"
  | "Refutado"
  | "Indefinido"
  | "Sem evidência"
  | "Contraditório";

export type NodeType = "drug" | "condition";
export type EdgeType = "induz" | "trata" | "sem_relacao";
export type ConsensusType = "confirm" | "refute" | "neutral";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  size: number;
  sub?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  s: string;
  t: string;
  type: EdgeType;
  conf: number;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Pipeline payloads (espelham chat/backend/pipeline/models.py) ──────────
export type PipelineStepId =
  | "translate_pt_en"
  | "extract_question"
  | "mesh_search"
  | "pubmed_search"
  | "extract_articles"
  | "verdict"
  | "translate_en_pt"
  | "final";

export type PipelineStepStatus = "idle" | "running" | "ok" | "error" | "skipped";

export interface TranslateStagePayload {
  input: string;
  output: string;
  persona: string;
  notes: string[];
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  model: string;
}

export interface MeshLookup {
  term: string;
  url: string;
  mesh_id: string | null;
  mesh_label: string | null;
  count: number;
  ok: boolean;
  ms: number;
}

export interface MeshStagePayload {
  url_template: string;
  lookups: MeshLookup[];
}

export interface PubmedArticle {
  pmid: string;
  title: string;
  authors: string;
  year: number | null;
  journal: string;
  design: string | null;
  n: number | null;
  abstract: string;
  weight: number;
}

export interface FetchStagePayload {
  query: string;
  total_found: number;
  returned: number;
  articles: PubmedArticle[];
}

export interface ArticleVote {
  pmid: string;
  supports: boolean;
  note: string | null;
}

export interface EdgeWithArticles {
  s: string;
  t: string;
  type: EdgeType;
  articles: ArticleVote[];
}

export interface AggregateStagePayload {
  nodes: GraphNode[];
  edges: EdgeWithArticles[];
}

export interface EdgeConsensus {
  s: string;
  t: string;
  type: EdgeType;
  consensus: ConsensusType;
  note: string | null;
}

export interface VerdictScore {
  confirms: number;
  refutes: number;
  neutral: number;
  total_articles: number;
}

export interface VerdictStagePayload {
  label: VerdictLabel;
  tone: VerdictTone;
  title: string;
  summary: string;
  score: VerdictScore;
  edges_consensus: EdgeConsensus[];
}

export interface PipelineResult {
  stage1: TranslateStagePayload;
  stage2: GraphData;
  stage3: MeshStagePayload;
  stage4: FetchStagePayload;
  stage5: AggregateStagePayload;
  stage6: VerdictStagePayload;
  stage7: TranslateStagePayload;
  final_text_pt: string;
}

export interface PipelineStepEvent {
  step: PipelineStepId;
  status: PipelineStepStatus;
  payload: Record<string, unknown>;
}

export interface PipelineRunState {
  consultText: string;
  states: Record<PipelineStepId, PipelineStepStatus>;
  progress: Record<PipelineStepId, number>;
  data: Partial<PipelineResult>;
  complete: boolean;
  totalMs: number;
  startedAt: number;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface UserMsg {
  id: string;
  role: "user";
  text: string;
}

export interface AssistantMsg {
  id: string;
  role: "assistant";
  text: string;
  toolCalls: ToolCall[];
  pipeline: PipelineRunState | null;
  query: string;
  pending: boolean;
}

export type Message = UserMsg | AssistantMsg;

export interface Thread {
  id: string;
  title: string;
  messageCount: number;
  verdict?: VerdictLabel;
  tone?: VerdictTone;
  articleCount?: number;
}

export const PIPELINE_STEP_ORDER: PipelineStepId[] = [
  "translate_pt_en",
  "extract_question",
  "mesh_search",
  "pubmed_search",
  "extract_articles",
  "verdict",
  "translate_en_pt",
];

export const PIPELINE_STEP_META: Record<
  PipelineStepId,
  { num: number; title: string; sub: string; kind: "agent" | "tool" | "graph" }
> = {
  translate_pt_en:   { num: 1, title: "Tradutor PT→EN", sub: "Médico-tradutor", kind: "agent" },
  extract_question:  { num: 2, title: "Extração",       sub: "Entidades + grafo", kind: "graph" },
  mesh_search:       { num: 3, title: "MeSH Lookup",    sub: "esearch.fcgi", kind: "tool" },
  pubmed_search:     { num: 4, title: "Buscar artigos", sub: "PubMed · 5 docs", kind: "tool" },
  extract_articles:  { num: 5, title: "Grafo por artigo", sub: "Agregação", kind: "graph" },
  verdict:           { num: 6, title: "Match · Veredito", sub: "Consenso", kind: "graph" },
  translate_en_pt:   { num: 7, title: "Tradutor EN→PT", sub: "Resposta final", kind: "agent" },
  final:             { num: 8, title: "Final", sub: "—", kind: "tool" },
};

export function emptyPipelineState(consultText: string): PipelineRunState {
  return {
    consultText,
    states: PIPELINE_STEP_ORDER.reduce((acc, id) => {
      acc[id] = "idle";
      return acc;
    }, {} as Record<PipelineStepId, PipelineStepStatus>),
    progress: PIPELINE_STEP_ORDER.reduce((acc, id) => {
      acc[id] = 0;
      return acc;
    }, {} as Record<PipelineStepId, number>),
    data: {},
    complete: false,
    totalMs: 0,
    startedAt: Date.now(),
  };
}

const STAGE_KEY: Record<Exclude<PipelineStepId, "final">, keyof PipelineResult> = {
  translate_pt_en: "stage1",
  extract_question: "stage2",
  mesh_search: "stage3",
  pubmed_search: "stage4",
  extract_articles: "stage5",
  verdict: "stage6",
  translate_en_pt: "stage7",
};

export function applyPipelineEvent(
  prev: PipelineRunState,
  evt: PipelineStepEvent,
): PipelineRunState {
  if (evt.step === "final") {
    const final = evt.payload as unknown as PipelineResult;
    return {
      ...prev,
      data: final,
      complete: true,
      totalMs: Date.now() - prev.startedAt,
    };
  }
  const key = STAGE_KEY[evt.step];
  const nextData: Partial<PipelineResult> = { ...prev.data };
  if (evt.status === "ok" || evt.status === "skipped") {
    const payload =
      evt.step === "extract_question"
        ? (evt.payload as { graph: GraphData }).graph
        : evt.payload;
    (nextData as Record<string, unknown>)[key] = payload;
  }
  return {
    ...prev,
    states: { ...prev.states, [evt.step]: evt.status },
    progress: { ...prev.progress, [evt.step]: evt.status === "running" ? 0.5 : 1 },
    data: nextData,
  };
}
