import type { ToolCall } from "../types";

export function ToolCallChip({ call }: { call: ToolCall }) {
  return (
    <div className="tool-call-chip">
      <span>🔧 ferramenta</span>
      <span className="tool-name">{call.name}</span>
      <span className="tool-result">{call.result}</span>
    </div>
  );
}
