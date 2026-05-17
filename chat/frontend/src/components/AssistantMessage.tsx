import type { AssistantMsg } from "../types";
import { ToolCallChip } from "./ToolCallChip";
import { VerdictBadge } from "./VerdictBadge";

export function AssistantMessage({ msg }: { msg: AssistantMsg }) {
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
      </div>
    </div>
  );
}
