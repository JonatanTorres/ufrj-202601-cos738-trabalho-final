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

  const unresolved = data.unresolved || [];

  return (
    <div className="step-detail">
      <div className="mesh-url-row">
        <div className="step-eyebrow mono">URL TEMPLATE</div>
        <code className="mono code-line">{data.url_template}</code>
      </div>

      {unresolved.length > 0 && (
        <div
          className="mesh-unresolved"
          style={{
            background: "#fff5e0",
            border: "1px solid #e0b25a",
            padding: "8px 12px",
            borderRadius: 6,
            margin: "8px 0",
            color: "#7a5400",
            fontSize: 13,
          }}
        >
          <div className="step-eyebrow mono" style={{ color: "#7a5400" }}>
            AGUARDANDO ESCLARECIMENTO · {unresolved.length} TERMO(S)
          </div>
          <div style={{ marginTop: 4 }}>
            {unresolved.map(u => (
              <div key={u.id} className="mono">
                • <strong>{u.label}</strong> ({u.type}) — tentei: {u.attempts.join(", ") || "—"}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mesh-split">
        <div className="mesh-table">
          <div className="step-eyebrow mono">TERMOS · {data.lookups.length}</div>
          <div className="mesh-rows">
            {data.lookups.map(l => {
              const attempts = l.attempts || [];
              const retried = attempts.length > 1;
              return (
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
                    <span
                      className="ok-pill"
                      style={l.ok ? {} : { background: "#fdd6d6", color: "#8a1f1f" }}
                    >
                      {l.ok ? "200" : "404"}
                    </span>
                    <span>{l.ms}ms</span>
                  </div>
                  {retried && (
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 4,
                        width: "100%",
                      }}
                    >
                      tentou: {attempts.join(", ")}
                      {l.matched_term && l.matched_term !== l.term && (
                        <> · <span style={{ color: "#2a7a2a" }}>✓ {l.matched_term}</span></>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
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
