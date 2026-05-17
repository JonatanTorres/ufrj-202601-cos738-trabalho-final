export function ThinkingState() {
  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar mono">MG</div>
      <div className="msg-body">
        <div className="msg-eyebrow mono">
          MEDGRAPH · ANALISANDO<span className="cursor-pulse" />
        </div>
        <div className="thinking mono">
          <div className="thinking-step"><span className="dot-think"></span>consultando modelo</div>
          <div className="thinking-step"><span className="dot-think"></span>verificando afirmação</div>
          <div className="thinking-step"><span className="dot-think"></span>formulando resposta</div>
        </div>
      </div>
    </div>
  );
}
