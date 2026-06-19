import type { ModelInfo, ModelKey, PipelineStepEvent } from "./types";

export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export type SSEEvent =
  | { type: "token"; data: { text: string } }
  | { type: "tool_call"; data: { name: string; args: Record<string, unknown>; result: string } }
  | { type: "pipeline_step"; data: PipelineStepEvent }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data: Record<string, never> };

const API_BASE = "/api";

export async function fetchModels(): Promise<{ models: ModelInfo[]; default: ModelKey }> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error(`GET /models failed: ${res.status}`);
  return res.json();
}

/**
 * POST /chat e itera sobre eventos SSE.
 * EventSource só suporta GET, então parseamos o stream manualmente.
 */
export async function* streamChat(
  message: string,
  model: ModelKey,
  history: HistoryItem[] = [],
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, model, history }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`POST /chat failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: eventos separados por linha em branco. sse-starlette usa CRLF.
    let m: RegExpExecArray | null;
    const SEP = /\r?\n\r?\n/;
    while ((m = SEP.exec(buffer)) !== null) {
      const rawEvent = buffer.slice(0, m.index);
      buffer = buffer.slice(m.index + m[0].length);
      const parsed = parseSSEEvent(rawEvent);
      if (parsed) yield parsed;
    }
  }
}

function parseSSEEvent(raw: string): SSEEvent | null {
  let type: string | null = null;
  const dataLines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith(":")) continue; // comentário/ping
    if (line.startsWith("event:")) {
      type = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (!type || dataLines.length === 0) return null;
  try {
    const data = JSON.parse(dataLines.join("\n"));
    return { type, data } as SSEEvent;
  } catch {
    return null;
  }
}
