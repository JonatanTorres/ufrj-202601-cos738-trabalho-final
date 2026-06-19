interface Props {
  sessionId: string | null;
}

export function Topbar({ sessionId }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-left mono">
        <span className="dot ok"></span>
        sessão · {sessionId ? sessionId.slice(0, 10) : "nova"}
      </div>
      <div className="topbar-right mono">
        <span>pesquisador</span>
        <span className="user-avatar">RS</span>
      </div>
    </header>
  );
}
