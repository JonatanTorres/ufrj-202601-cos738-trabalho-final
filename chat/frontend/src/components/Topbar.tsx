import type { ModelInfo, ModelKey } from "../types";
import { ModelPicker } from "./ModelPicker";

interface Props {
  sessionId: string | null;
  models: ModelInfo[];
  model: ModelKey;
  onModelChange: (m: ModelKey) => void;
}

export function Topbar({ sessionId, models, model, onModelChange }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-left mono">
        <span className="dot ok"></span>
        sessão · {sessionId ? sessionId.slice(0, 10) : "nova"}
      </div>
      <div className="topbar-right mono">
        <ModelPicker models={models} value={model} onChange={onModelChange} />
        <span>pesquisador</span>
        <span className="user-avatar">RS</span>
      </div>
    </header>
  );
}
