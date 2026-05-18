export type ModelKey = "qwen" | "llama";

export type VerdictTone = "ok" | "warn" | "bad" | "info";

export interface Verdict {
  label: string;
  tone: VerdictTone;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export type NodeType = "drug" | "condition" | "mechanism" | "biomarker" | "anatomy" | "study";
export type EdgeType = "induz" | "trata" | "sem relação";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  size: number;
  sub?: string;
  // simulation-only fields
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
  verdict: Verdict | null;
  graph: GraphData | null;
  query: string;
  pending: boolean;
}

export type Message = UserMsg | AssistantMsg;

export interface Thread {
  id: string;
  title: string;
  messageCount: number;
}

export function mapVerdict(result: string): Verdict | null {
  const r = result.trim().toLowerCase();
  if (r.startsWith("confirmado")) return { label: "Confirmado", tone: "ok" };
  if (r.startsWith("refutado")) return { label: "Refutado", tone: "bad" };
  if (r.startsWith("sem relação") || r.startsWith("sem relacao"))
    return { label: "Sem relação", tone: "info" };
  if (r.startsWith("indefinido")) return { label: "Indefinido", tone: "warn" };
  return null;
}

export function parseGraphResult(result: string): GraphData | null {
  try {
    const parsed = JSON.parse(result);
    if (
      parsed &&
      Array.isArray(parsed.nodes) &&
      Array.isArray(parsed.edges) &&
      parsed.nodes.length > 0
    ) {
      return parsed as GraphData;
    }
  } catch {
    /* fallthrough */
  }
  return null;
}
