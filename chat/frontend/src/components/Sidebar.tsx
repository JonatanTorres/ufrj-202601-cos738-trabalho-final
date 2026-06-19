import type { ModelInfo, ModelKey, Thread } from "../types";
import { LogoMark } from "./illustrations";

interface Props {
  threads: Thread[];
  activeId: string | null;
  models: ModelInfo[];
  model: ModelKey;
  collapsed: boolean;
  onNew: () => void;
  onPick: (id: string) => void;
  onToggle: () => void;
}

export function Sidebar({ threads, activeId, models, model, collapsed, onNew, onPick, onToggle }: Props) {
  const current = models.find(m => m.key === model);
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
            <div className="kv"><span>modelo</span><span>{current?.label ?? model}</span></div>
            <div className="kv"><span>backend</span><span>{current?.provider ?? "—"}</span></div>
            <div className="kv"><span>status</span><span className="ok">● online</span></div>
          </div>
        </>
      )}
    </aside>
  );
}
