import { ILLUSTRATIONS } from "./illustrations";

const EXAMPLES = [
  "A Terra orbita o Sol",
  "Vacinas causam autismo",
  "Café é melhor que chá",
];

interface Props {
  onPick: (q: string) => void;
}

export function Welcome({ onPick }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-bg" aria-hidden="true">
        {ILLUSTRATIONS.map(({ Comp, label }, i) => (
          <div key={i} className={"illus illus-" + i}>
            <Comp />
            <div className="illus-label mono">{label}</div>
          </div>
        ))}
      </div>
      <div className="welcome-content">
        <div className="eyebrow mono">MEDGRAPH · v0.1 · experimental</div>
        <h1>
          Pergunte. <br />
          <span className="hl">Receba uma resposta avaliada.</span>
        </h1>
        <p className="subtitle">
          Interface conversacional com agente avaliador. Cada afirmação factual
          é classificada por uma ferramenta dedicada (Confirmado, Refutado, Sem
          relação ou Indefinido) antes de ser respondida pelo modelo.
        </p>

        <div className="example-grid">
          {EXAMPLES.map((q, i) => (
            <button key={i} className="example-card" onClick={() => onPick(q)}>
              <div className="example-eyebrow mono">EXEMPLO {String(i + 1).padStart(2, "0")}</div>
              <div className="example-q">{q}</div>
              <div className="example-cta mono">analisar →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
