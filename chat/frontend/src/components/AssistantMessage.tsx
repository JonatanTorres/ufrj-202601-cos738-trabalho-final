import type { AssistantMsg, GraphData } from "../types";
import { GraphCard } from "./GraphCard";
import { ToolCallChip } from "./ToolCallChip";
import { VerdictBadge } from "./VerdictBadge";

interface Props {
  msg: AssistantMsg;
  onOpenGraph?: (graph: GraphData, query: string) => void;
}

export function AssistantMessage({ msg, onOpenGraph }: Props) {
  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar mono">MG</div>
      <div className="msg-body">
        <div className="msg-eyebrow mono">
          MEDGRAPH · {msg.pending ? "GERANDO…" : "RESPOSTA"}
          {msg.pending && <span className="cursor-pulse" />}
        </div>

        {msg.verdict && <VerdictBadge verdict={msg.verdict} />}

        {msg.toolCalls.map((tc, i) => (
          <ToolCallChip key={i} call={tc} />
        ))}

        {msg.text && (
          <div className="msg-text">
            {msg.text}
            {msg.pending && <span className="cursor">▍</span>}
          </div>
        )}

        {msg.graph && !msg.pending && onOpenGraph && (
          <GraphCard data={msg.graph} onOpen={() => onOpenGraph(msg.graph!, msg.query)} />
        )}
      </div>
    </div>
  );
}
