import { PIPELINE_STEP_META, PIPELINE_STEP_ORDER } from "../types";
import { StepIcon } from "./StepIcon";

const EXAMPLES = [
  "Suplementação de creatina causa calvície",
  "Methotrexate causa fibrose hepática",
  "Estatinas previnem demência?",
];

interface Props {
  onPick: (q: string) => void;
}

export function Welcome({ onPick }: Props) {
  return (
    <div className="pwelcome">
      <div className="pwelcome-content">
        <div className="eyebrow mono">MEDGRAPH PIPELINE · v0.5 · 7 etapas</div>
        <h1>
          Pergunte. <br />
          <span className="hl">Veja o raciocínio.</span>
        </h1>
        <p className="subtitle">
          Cada consulta passa por um pipeline de 7 etapas — tradução, extração de grafo,
          lookup MeSH, busca PubMed, extração por artigo e veredito por consenso.
          Cada etapa é inspecionável.
        </p>

        <div className="pipeline-preview-strip">
          {PIPELINE_STEP_ORDER.map(id => {
            const meta = PIPELINE_STEP_META[id];
            return (
              <div key={id} className={"preview-step preview-step-" + meta.kind}>
                <span className="preview-num mono">{String(meta.num).padStart(2, "0")}</span>
                <span className="preview-icon"><StepIcon id={id} /></span>
                <span className="preview-title">{meta.title}</span>
              </div>
            );
          })}
        </div>

        <div className="example-grid">
          {EXAMPLES.map((q, i) => (
            <button key={i} className="example-card" onClick={() => onPick(q)}>
              <div className="example-eyebrow mono">EXEMPLO {String(i + 1).padStart(2, "0")}</div>
              <div className="example-q">{q}</div>
              <div className="example-cta mono">rodar pipeline →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
