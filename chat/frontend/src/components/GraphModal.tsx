import { useEffect, useRef, useState } from "react";
import type { GraphData } from "../types";
import { EDGE_STYLES, MGGraph, NODE_COLORS, type Layout } from "./MGGraph";

interface Props {
  data: GraphData;
  query: string;
  layout: Layout;
  onLayout: (l: Layout) => void;
  onClose: () => void;
}

const LAYOUTS: Layout[] = ["force", "hierarchical", "radial"];
const LAYOUT_LABEL: Record<Layout, string> = {
  force: "force",
  hierarchical: "hier",
  radial: "radial",
};

const NODE_LEGEND: { type: "drug" | "condition"; label: string }[] = [
  { type: "drug", label: "Químico" },
  { type: "condition", label: "Doença" },
];

export function GraphModal({ data, query, layout, onLayout, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 720, h: 520 });
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: Math.max(400, r.width), h: Math.max(360, r.height) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const node = selectedId ? data.nodes.find(n => n.id === selectedId) : null;
  const relatedEdges = selectedId
    ? data.edges.filter(e => e.s === selectedId || e.t === selectedId)
    : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <span className="badge mono">GRAFO</span>
            <span>{query}</span>
          </div>
          <div className="modal-controls">
            <div className="layout-toggle" role="tablist">
              {LAYOUTS.map(l => (
                <button
                  key={l}
                  className={"layout-btn mono" + (layout === l ? " active" : "")}
                  onClick={() => onLayout(l)}
                >
                  {LAYOUT_LABEL[l]}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="graph-stage" ref={wrapRef}>
            <MGGraph
              data={data}
              layout={layout}
              onSelect={setSelectedId}
              selectedId={selectedId}
              width={size.w}
              height={size.h}
            />
            <div className="graph-legend">
              {NODE_LEGEND.map(({ type, label }) => {
                const c = NODE_COLORS[type];
                return (
                  <div key={type} className="legend-item mono">
                    <span className="legend-dot" style={{ background: c.bg, borderColor: c.ring }} />
                    {label}
                  </div>
                );
              })}
              {Object.entries(EDGE_STYLES).map(([k, s]) => (
                <div key={k} className="legend-item mono">
                  <svg width="22" height="8">
                    <line x1="1" y1="4" x2="21" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} />
                  </svg>
                  {k}
                </div>
              ))}
            </div>
          </div>

          <aside className="graph-side">
            {!node && (
              <div className="empty-side">
                <div className="empty-side-eyebrow mono">SELECIONE UM NÓ</div>
                <p>Clique em qualquer entidade do grafo para ver suas relações e nível de confiança.</p>
                <div className="legend-block">
                  <div className="legend-title mono">RELAÇÕES</div>
                  {Object.entries(EDGE_STYLES).map(([k, s]) => (
                    <div key={k} className="legend-row mono">
                      <svg width="28" height="10">
                        <line x1="2" y1="5" x2="26" y2="5" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} />
                      </svg>
                      <span>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {node && (
              <div className="node-detail">
                <div className="node-detail-head">
                  <div className="node-type mono">{node.type.toUpperCase()}</div>
                  <h3>{node.label}</h3>
                  {node.sub && <div className="node-sub mono">{node.sub}</div>}
                </div>
                <div className="section-eyebrow mono">RELAÇÕES ({relatedEdges.length})</div>
                <div className="edges-list">
                  {relatedEdges.map((e, i) => {
                    const other = e.s === selectedId ? e.t : e.s;
                    const otherNode = data.nodes.find(n => n.id === other);
                    const style = EDGE_STYLES[e.type] || EDGE_STYLES["sem_relacao"];
                    const dir = e.s === selectedId ? "→" : "←";
                    return (
                      <div key={i} className="edge-row" onClick={() => setSelectedId(other)}>
                        <div className="edge-dir mono">
                          <span style={{ color: style.color }}>{e.type}</span> {dir}
                        </div>
                        <div className="edge-target">{otherNode ? otherNode.label : other}</div>
                        <div className="conf-bar">
                          <div className="conf-fill" style={{ width: e.conf * 100 + "%", background: style.color }} />
                          <span className="conf-num mono">{(e.conf * 100).toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
