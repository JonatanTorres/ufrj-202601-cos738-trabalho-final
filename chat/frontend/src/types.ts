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
  pending: boolean;
}

export type Message = UserMsg | AssistantMsg;

export interface Thread {
  id: string;
  title: string;
  messageCount: number;
}

// Map avaliador output -> visual verdict
export function mapVerdict(result: string): Verdict | null {
  const r = result.trim().toLowerCase();
  if (r.startsWith("confirmado")) return { label: "Confirmado", tone: "ok" };
  if (r.startsWith("refutado")) return { label: "Refutado", tone: "bad" };
  if (r.startsWith("sem relação") || r.startsWith("sem relacao"))
    return { label: "Sem relação", tone: "info" };
  if (r.startsWith("indefinido")) return { label: "Indefinido", tone: "warn" };
  return null;
}
