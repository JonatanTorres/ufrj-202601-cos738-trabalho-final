export type ModelKey = string;

export interface ModelInfo {
  key: ModelKey;
  label: string;
  provider: string;
}

export type VerdictTone = "ok" | "warn" | "bad" | "info";
export type VerdictLabel =
  | "Confirmado"
  | "Refutado"
  | "Indefinido"
  | "Sem evidência"
  | "Contraditório";

export type NodeType = "drug" | "condition";
export type EdgeType = "induces" | "treats" | "no_relation";
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

export type PipelineStepStatus =
  | "idle"
  | "running"
  | "ok"
  | "error"
  | "skipped"
  | "needs_clarification";

export interface GlossaryEntry {
  term_pt: string;
  term_en: string;
}

export interface TranslateStagePayload {
  input: string;
  output: string;
  persona: string;
  notes: string[];
  glossary?: GlossaryEntry[];
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
  attempts: string[];
  matched_term: string | null;
}

export interface UnresolvedTerm {
  id: string;
  label: string;
  type: NodeType;
  attempts: string[];
}

export interface MeshStagePayload {
  url_template: string;
  lookups: MeshLookup[];
  unresolved: UnresolvedTerm[];
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
  type: EdgeType;
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

export interface PipelineProgress {
  current: number;
  total: number;
  processed_pmids: string[];
}

export interface PipelineRunState {
  consultText: string;
  states: Record<PipelineStepId, PipelineStepStatus>;
  progress: Record<PipelineStepId, number>;
  data: Partial<PipelineResult>;
  extractProgress: PipelineProgress | null;
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
    extractProgress: null,
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

function payloadHasGraph(p: Record<string, unknown>): boolean {
  return Array.isArray(p.nodes) || Array.isArray(p.edges) || "graph" in p;
}

function extractProgressOf(p: Record<string, unknown>): PipelineProgress | null {
  const pg = p.progress as Partial<PipelineProgress> | undefined;
  if (!pg || typeof pg.current !== "number" || typeof pg.total !== "number") return null;
  return {
    current: pg.current,
    total: pg.total,
    processed_pmids: Array.isArray(pg.processed_pmids) ? pg.processed_pmids : [],
  };
}

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

  const isTerminal =
    evt.status === "ok" ||
    evt.status === "skipped" ||
    evt.status === "needs_clarification";
  const hasRunningData = evt.status === "running" && payloadHasGraph(evt.payload);

  if (isTerminal || hasRunningData) {
    const payload =
      evt.step === "extract_question"
        ? (evt.payload as { graph: GraphData }).graph
        : evt.payload;
    (nextData as Record<string, unknown>)[key] = payload;
  }

  let progressValue = prev.progress[evt.step] || 0;
  if (isTerminal) {
    progressValue = 1;
  } else if (evt.status === "running") {
    const pg = extractProgressOf(evt.payload);
    if (pg && pg.total > 0) {
      progressValue = pg.current / pg.total;
    } else if (progressValue === 0) {
      progressValue = 0.05;
    }
  }

  const newExtractProgress =
    evt.step === "extract_articles"
      ? extractProgressOf(evt.payload) ?? prev.extractProgress
      : prev.extractProgress;

  return {
    ...prev,
    states: { ...prev.states, [evt.step]: evt.status },
    progress: { ...prev.progress, [evt.step]: progressValue },
    data: nextData,
    extractProgress: newExtractProgress,
  };
}
