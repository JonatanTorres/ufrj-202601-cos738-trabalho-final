import type { TranslateStagePayload } from "../../types";

interface Props {
  data: TranslateStagePayload;
  direction: "in" | "out";
}

export function TranslateStep({ data, direction }: Props) {
  const fromLang = direction === "in" ? "PT-BR" : "EN";
  const toLang = direction === "in" ? "EN" : "PT-BR";
  const name = direction === "in" ? "Tradutor PT→EN" : "Tradutor EN→PT";

  return (
    <div className="step-detail">
      <div className="step-persona">
        <div className="step-eyebrow mono">PERSONA</div>
        <div className="step-persona-body">
          <div className="avatar-tile">MD</div>
          <div>
            <div className="step-persona-name">{name}</div>
            <div className="step-persona-sub mono">{data.persona}</div>
          </div>
        </div>
      </div>

      <div className="translate-pair">
        <div className="translate-card">
          <div className="translate-head mono">
            <span className="lang-badge">{fromLang}</span>
            <span>input</span>
          </div>
          <p>{data.input}</p>
        </div>
        <div className="translate-arrow">→</div>
        <div className="translate-card translate-card-out">
          <div className="translate-head mono">
            <span className="lang-badge lang-badge-out">{toLang}</span>
            <span>output</span>
          </div>
          <p>{data.output}</p>
        </div>
      </div>

      {data.notes && data.notes.length > 0 && (
        <div className="step-notes">
          <div className="step-eyebrow mono">NOTAS DO TRADUTOR</div>
          <ul>
            {data.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      {data.glossary && data.glossary.length > 0 && (
        <div className="step-glossary">
          <div className="step-eyebrow mono">DICIONÁRIO</div>
          <div className="step-glossary-list">
            {data.glossary.map((g, i) => (
              <div key={i} className="step-glossary-item">
                <span className="step-glossary-pt">{g.term_pt}</span>
                <span className="step-glossary-arrow mono">→</span>
                <span className="step-glossary-en">{g.term_en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="step-stats mono">
        <span>{data.tokens_in} → {data.tokens_out} tokens</span>
        <span>·</span>
        <span>{data.latency_ms} ms</span>
        <span>·</span>
        <span>model: {data.model}</span>
      </div>
    </div>
  );
}
