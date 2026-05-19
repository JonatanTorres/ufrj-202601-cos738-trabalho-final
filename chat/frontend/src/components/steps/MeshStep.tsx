import { useState } from "react";
import type { MeshLookup, MeshStagePayload } from "../../types";

interface Props {
  data: MeshStagePayload;
}

export function MeshStep({ data }: Props) {
  const [selected, setSelected] = useState<MeshLookup | null>(data.lookups[0] || null);

  if (!selected) {
    return (
      <div className="step-detail">
        <div className="mesh-url-row">
          <div className="step-eyebrow mono">URL TEMPLATE</div>
          <code className="mono code-line">{data.url_template}</code>
        </div>
        <p style={{ color: "var(--muted)" }}>Nenhum termo foi consultado.</p>
      </div>
    );
  }

  return (
    <div className="step-detail">
      <div className="mesh-url-row">
        <div className="step-eyebrow mono">URL TEMPLATE</div>
        <code className="mono code-line">{data.url_template}</code>
      </div>

      <div className="mesh-split">
        <div className="mesh-table">
          <div className="step-eyebrow mono">TERMOS · {data.lookups.length}</div>
          <div className="mesh-rows">
            {data.lookups.map(l => (
              <button
                key={l.term}
                className={"mesh-row" + (l === selected ? " active" : "")}
                onClick={() => setSelected(l)}
              >
                <div className="mesh-row-main">
                  <div className="mesh-term">{l.term}</div>
                  <div className="mesh-id mono">{l.mesh_id || "—"}</div>
                </div>
                <div className="mesh-row-meta mono">
                  <span className="ok-pill" style={l.ok ? {} : { background: "#fdd6d6", color: "#8a1f1f" }}>
                    {l.ok ? "200" : "404"}
                  </span>
                  <span>{l.ms}ms</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mesh-detail">
          <div className="step-eyebrow mono">GET</div>
          <code className="mono code-line code-line-wrap">{selected.url}</code>

          <div className="step-eyebrow mono" style={{ marginTop: 16 }}>RESPONSE</div>
          <pre className="json-box mono">{JSON.stringify({
            header: { type: "esearch", version: "0.3" },
            esearchresult: {
              count: String(selected.count),
              idlist: selected.mesh_id ? [selected.mesh_id] : [],
              translationset: selected.mesh_label ? [{
                from: selected.term,
                to: `"${selected.mesh_label}"[MeSH Terms]`,
              }] : [],
            },
          }, null, 2)}</pre>

          {selected.ok && selected.mesh_id && (
            <div className="mesh-pick">
              <span className="step-eyebrow mono">MAPEAMENTO</span>
              <div className="mesh-pick-row mono">
                <span className="mesh-pick-term">{selected.term}</span>
                <span>→</span>
                <span className="mesh-pick-id">{selected.mesh_id}</span>
                <span className="mesh-pick-label">{selected.mesh_label}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
