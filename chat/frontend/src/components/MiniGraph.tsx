import { NODE_COLORS } from "./MGGraph";
import type {
  AggregateStagePayload,
  EdgeConsensus,
  GraphData,
  GraphNode,
  VerdictStagePayload,
} from "../types";

type MiniSource =
  | { kind: "graph"; data: GraphData }
  | { kind: "aggregate"; data: AggregateStagePayload }
  | { kind: "consensus"; nodes: GraphNode[]; edges: EdgeConsensus[] };

interface Props {
  data:
    | GraphData
    | AggregateStagePayload
    | (VerdictStagePayload & { _nodes?: GraphNode[] })
    | null;
  kind?: "default" | "consensus";
  // Optional: pass aggregate nodes alongside verdict consensus edges
  consensusNodes?: GraphNode[];
}

function pickSource(
  data: Props["data"],
  kind: Props["kind"],
  consensusNodes?: GraphNode[],
): MiniSource | null {
  if (!data) return null;
  if (kind === "consensus") {
    const verdict = data as VerdictStagePayload;
    const nodes = consensusNodes || (verdict as VerdictStagePayload & { _nodes?: GraphNode[] })._nodes || [];
    return { kind: "consensus", nodes, edges: verdict.edges_consensus || [] };
  }
  const maybeAgg = data as AggregateStagePayload;
  if (Array.isArray(maybeAgg.nodes) && Array.isArray(maybeAgg.edges) && maybeAgg.edges.length > 0 && "articles" in (maybeAgg.edges[0] as object)) {
    return { kind: "aggregate", data: maybeAgg };
  }
  return { kind: "graph", data: data as GraphData };
}

export function MiniGraph({ data, kind = "default", consensusNodes }: Props) {
  const src = pickSource(data, kind, consensusNodes);
  if (!src) return null;

  const W = 120;
  const H = 60;
  const allNodes: GraphNode[] =
    src.kind === "graph"
      ? src.data.nodes
      : src.kind === "aggregate"
      ? src.data.nodes
      : src.nodes;
  const nodes = allNodes.slice(0, 9);
  const pos = nodes.map((_, i) => {
    const a = (i * 2.7) % (Math.PI * 2);
    const r = 18 + ((i * 13) % 18);
    return { x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r * 0.7 };
  });

  type RenderEdge = { s: string; t: string; color: string };
  let edges: RenderEdge[] = [];
  if (src.kind === "graph") {
    edges = src.data.edges.slice(0, 12).map(e => ({
      s: e.s, t: e.t, color: e.type === "induz" ? "#ff4d4d" : e.type === "trata" ? "#22a06b" : "#9ca3af",
    }));
  } else if (src.kind === "aggregate") {
    edges = src.data.edges.slice(0, 12).map(e => ({
      s: e.s, t: e.t, color: "#9ca3af",
    }));
  } else {
    edges = src.edges.slice(0, 12).map(e => ({
      s: e.s, t: e.t,
      color: e.consensus === "confirm" ? "#22a06b" : e.consensus === "refute" ? "#ff4d4d" : "#9ca3af",
    }));
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {edges.map((e, i) => {
        const aIdx = nodes.findIndex(n => n.id === e.s);
        const bIdx = nodes.findIndex(n => n.id === e.t);
        if (aIdx < 0 || bIdx < 0) return null;
        return (
          <line
            key={i}
            x1={pos[aIdx].x} y1={pos[aIdx].y}
            x2={pos[bIdx].x} y2={pos[bIdx].y}
            stroke={e.color} strokeWidth="0.9" opacity="0.7"
          />
        );
      })}
      {nodes.map((n, i) => {
        const c = NODE_COLORS[n.type] || NODE_COLORS.drug;
        return (
          <circle
            key={n.id}
            cx={pos[i].x} cy={pos[i].y}
            r={2.4 + (n.size || 18) / 14}
            fill={c.bg} stroke={c.ring} strokeWidth="0.8"
          />
        );
      })}
    </svg>
  );
}
