import type { GraphData } from "../types";
import { NODE_COLORS } from "./MGGraph";

interface Props {
  data: GraphData;
  onOpen: () => void;
}

export function GraphCard({ data, onOpen }: Props) {
  const previewNodes = data.nodes.slice(0, 8);
  return (
    <button className="graph-card" onClick={onOpen}>
      <div className="graph-card-preview">
        <svg viewBox="0 0 120 60" width="100%" height="100%">
          {data.edges.slice(0, 10).map((_, i) => {
            const ax = 10 + (i % 5) * 24;
            const ay = 12 + ((i % 2) ? 0 : 36);
            const bx = 10 + ((i + 2) % 5) * 24;
            const by = 12 + (((i + 1) % 2) ? 0 : 36);
            return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke="#9ca3af" strokeWidth="0.8" />;
          })}
          {previewNodes.map((n, i) => {
            const c = NODE_COLORS[n.type] || NODE_COLORS.drug;
            const x = 10 + (i % 5) * 24;
            const y = 12 + ((i % 2) ? 0 : 36);
            return <circle key={i} cx={x} cy={y} r={3 + n.size / 14} fill={c.bg} stroke={c.ring} strokeWidth="1" />;
          })}
        </svg>
      </div>
      <div className="graph-card-meta">
        <div className="graph-card-title">
          <span className="badge mono">GRAFO</span>
          Knowledge graph extraído
        </div>
        <div className="graph-card-stats">
          {data.nodes.length} entidades · {data.edges.length} relações · clique para abrir
        </div>
      </div>
      <div className="graph-card-arrow">↗</div>
    </button>
  );
}
