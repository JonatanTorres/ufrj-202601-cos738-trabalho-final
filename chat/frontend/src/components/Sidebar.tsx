import type { ModelKey, Thread } from "../types";
import { LogoMark } from "./illustrations";

interface Props {
  threads: Thread[];
  activeId: string | null;
  model: ModelKey;
  collapsed: boolean;
  onNew: () => void;
  onPick: (id: string) => void;
  onToggle: () => void;
}

const MODEL_LABELS: Record<ModelKey, string> = {
  qwen: "qwen3:8b",
  llama: "llama3.1:8b",
};

export function Sidebar({ threads, activeId, model, collapsed, onNew, onPick, onToggle }: Props) {
  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-head">
        <div className="logo">
          <div className="logo-mark"><LogoMark /></div>
          {!collapsed && <span className="logo-text mono">MedGraph</span>}
        </div>
        <button className="collapse-btn mono" onClick={onToggle} title="Recolher">
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {!collapsed && (
        <>
          <button className="new-btn mono" onClick={onNew}>
            <span>+ nova consulta</span>
          </button>

          <div className="threads">
            <div className="threads-eyebrow mono">HISTÓRICO</div>
            {threads.length === 0 && (
              <div className="threads-empty mono">nenhuma consulta ainda</div>
            )}
            {threads.map(t => (
              <button
                key={t.id}
                className={"thread" + (t.id === activeId ? " active" : "")}
                onClick={() => onPick(t.id)}
              >
                <div className="thread-title">{t.title}</div>
                <div className="thread-meta mono">{t.messageCount} mensagens</div>
              </button>
            ))}
          </div>

          <div className="sidebar-foot mono">
            <div className="kv"><span>modelo</span><span>{MODEL_LABELS[model]}</span></div>
            <div className="kv"><span>backend</span><span>ollama</span></div>
            <div className="kv"><span>status</span><span className="ok">● online</span></div>
          </div>
        </>
      )}
    </aside>
  );
}
