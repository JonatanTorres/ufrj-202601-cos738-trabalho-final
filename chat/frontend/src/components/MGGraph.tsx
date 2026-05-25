import { useEffect, useRef, useState } from "react";
import type { EdgeType, GraphData, GraphEdge, GraphNode, NodeType } from "../types";

export const NODE_COLORS: Record<NodeType, { bg: string; fg: string; ring: string }> = {
  drug:      { bg: "#0a0a0a", fg: "#c6ff3d", ring: "#c6ff3d" },
  condition: { bg: "#ff4d4d", fg: "#fff",    ring: "#ff4d4d" },
};

export const EDGE_STYLES: Record<EdgeType, { color: string; dash: string }> = {
  "induces":     { color: "#ff4d4d", dash: "" },
  "treats":      { color: "#22a06b", dash: "" },
  "no_relation": { color: "#9ca3af", dash: "2 3" },
};

export type Layout = "force" | "hierarchical" | "radial";

interface Props {
  data: GraphData;
  layout?: Layout;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  width?: number;
  height?: number;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

export function MGGraph({
  data,
  layout = "force",
  onSelect,
  selectedId = null,
  width = 720,
  height = 520,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [, setTick] = useState(0);
  const stateRef = useRef<{ nodes: SimNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

  useEffect(() => {
    const cx = width / 2;
    const cy = height / 2;
    const nodes: SimNode[] = data.nodes.map(n => ({
      ...n,
      x: 0, y: 0, vx: 0, vy: 0,
    }));
    const edges: GraphEdge[] = data.edges.map(e => ({ ...e }));

    if (layout === "radial") {
      const deg: Record<string, number> = {};
      edges.forEach(e => {
        deg[e.s] = (deg[e.s] || 0) + 1;
        deg[e.t] = (deg[e.t] || 0) + 1;
      });
      nodes.sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0));
      const center = nodes[0];
      center.x = cx; center.y = cy; center.fx = cx; center.fy = cy;
      const adj: Record<string, string[]> = {};
      edges.forEach(e => {
        (adj[e.s] = adj[e.s] || []).push(e.t);
        (adj[e.t] = adj[e.t] || []).push(e.s);
      });
      const dist: Record<string, number> = { [center.id]: 0 };
      const queue = [center.id];
      while (queue.length) {
        const cur = queue.shift()!;
        (adj[cur] || []).forEach(nb => {
          if (dist[nb] == null) { dist[nb] = dist[cur] + 1; queue.push(nb); }
        });
      }
      const rings: Record<number, SimNode[]> = {};
      nodes.slice(1).forEach(n => {
        const d = dist[n.id] || 1;
        (rings[d] = rings[d] || []).push(n);
      });
      Object.keys(rings).forEach(rKey => {
        const r = parseInt(rKey, 10);
        const ring = rings[r];
        const radius = Math.min(width, height) * 0.32 * r;
        ring.forEach((n, i) => {
          const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2 + r * 0.3;
          n.x = cx + Math.cos(a) * radius;
          n.y = cy + Math.sin(a) * radius;
        });
      });
    } else if (layout === "hierarchical") {
      const deg: Record<string, number> = {};
      edges.forEach(e => {
        deg[e.s] = (deg[e.s] || 0) + 1;
        deg[e.t] = (deg[e.t] || 0) + 1;
      });
      const root = [...nodes].sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0))[0];
      const adj: Record<string, string[]> = {};
      edges.forEach(e => {
        (adj[e.s] = adj[e.s] || []).push(e.t);
        (adj[e.t] = adj[e.t] || []).push(e.s);
      });
      const dist: Record<string, number> = { [root.id]: 0 };
      const queue = [root.id];
      while (queue.length) {
        const cur = queue.shift()!;
        (adj[cur] || []).forEach(nb => {
          if (dist[nb] == null) { dist[nb] = dist[cur] + 1; queue.push(nb); }
        });
      }
      const layers: Record<number, SimNode[]> = {};
      nodes.forEach(n => {
        const d = dist[n.id] != null ? dist[n.id] : 99;
        (layers[d] = layers[d] || []).push(n);
      });
      const layerKeys = Object.keys(layers).map(Number).sort((a, b) => a - b);
      const layerCount = layerKeys.length;
      layerKeys.forEach((d, li) => {
        const arr = layers[d];
        const y = 60 + (li / Math.max(1, layerCount - 1)) * (height - 120);
        arr.forEach((n, i) => {
          n.x = (width / (arr.length + 1)) * (i + 1);
          n.y = y;
        });
      });
    } else {
      nodes.forEach((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2;
        const r = 80 + Math.random() * 60;
        n.x = cx + Math.cos(a) * r;
        n.y = cy + Math.sin(a) * r;
      });
    }

    stateRef.current = { nodes, edges };
    setTick(t => t + 1);
  }, [data, layout, width, height]);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const { nodes, edges } = stateRef.current;
      const cx = width / 2;
      const cy = height / 2;
      const strength = layout === "force" ? 1 : 0.15;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.fx != null) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.01; }
          const d = Math.sqrt(d2);
          const minDist = (a.size + b.size) * 0.9 + 18;
          const repel = (1600 * strength) / d2;
          a.vx += (dx / d) * repel;
          a.vy += (dy / d) * repel;
          if (b.fx == null) {
            b.vx -= (dx / d) * repel;
            b.vy -= (dy / d) * repel;
          }
          if (d < minDist) {
            const push = (minDist - d) * 0.4;
            a.vx += (dx / d) * push;
            a.vy += (dy / d) * push;
            if (b.fx == null) {
              b.vx -= (dx / d) * push;
              b.vy -= (dy / d) * push;
            }
          }
        }
      }

      edges.forEach(e => {
        const a = nodes.find(n => n.id === e.s);
        const b = nodes.find(n => n.id === e.t);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = 120;
        const f = (d - target) * 0.02 * strength;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        if (a.fx == null) { a.vx += fx; a.vy += fy; }
        if (b.fx == null) { b.vx -= fx; b.vy -= fy; }
      });

      nodes.forEach(n => {
        if (n.fx != null) return;
        n.vx += (cx - n.x) * 0.005 * strength;
        n.vy += (cy - n.y) * 0.005 * strength;
      });

      nodes.forEach(n => {
        if (n.fx != null) { n.x = n.fx; n.y = n.fy!; return; }
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
        const pad = n.size + 8;
        if (n.x < pad) { n.x = pad; n.vx = 0; }
        if (n.x > width - pad) { n.x = width - pad; n.vx = 0; }
        if (n.y < pad) { n.y = pad; n.vy = 0; }
        if (n.y > height - pad) { n.y = height - pad; n.vy = 0; }
      });

      setTick(t => (t + 1) % 100000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [layout, width, height, data]);

  const dragRef = useRef<SimNode | null>(null);
  const onPointerDown = (e: React.PointerEvent, node: SimNode) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    if (onSelect) onSelect(node.id);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    dragRef.current.fx = x;
    dragRef.current.fy = y;
  };
  const onPointerUp = () => {
    if (dragRef.current) {
      dragRef.current.fx = null;
      dragRef.current.fy = null;
      dragRef.current = null;
    }
  };

  const { nodes, edges } = stateRef.current;
  if (!nodes.length) return null;

  const connected = new Set<string>();
  if (selectedId) {
    connected.add(selectedId);
    edges.forEach(e => {
      if (e.s === selectedId) connected.add(e.t);
      if (e.t === selectedId) connected.add(e.s);
    });
  }
  const dim = (id: string) => !!selectedId && !connected.has(id);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ display: "block", background: "#fafaf6", borderRadius: 8 }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <defs>
        <pattern id="mg-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="0.6" cy="0.6" r="0.6" fill="#d4d4d0" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#mg-grid)" />

      <g>
        {edges.map((e, i) => {
          const a = nodes.find(n => n.id === e.s);
          const b = nodes.find(n => n.id === e.t);
          if (!a || !b) return null;
          const style = EDGE_STYLES[e.type] || EDGE_STYLES["no_relation"];
          const isDim = selectedId && !(e.s === selectedId || e.t === selectedId);
          const opacity = isDim ? 0.12 : 0.35 + e.conf * 0.55;
          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len, uy = dy / len;
          const endX = b.x - ux * (b.size + 4);
          const endY = b.y - uy * (b.size + 4);
          const startX = a.x + ux * (a.size + 2);
          const startY = a.y + uy * (a.size + 2);
          return (
            <g key={i} opacity={opacity}>
              <line
                x1={startX} y1={startY} x2={endX} y2={endY}
                stroke={style.color}
                strokeWidth={1 + e.conf * 2.2}
                strokeDasharray={style.dash}
              />
              <polygon
                points={`${endX},${endY} ${endX - ux * 8 + uy * 4},${endY - uy * 8 - ux * 4} ${endX - ux * 8 - uy * 4},${endY - uy * 8 + ux * 4}`}
                fill={style.color}
              />
              {e.label && (
                <g transform={`translate(${(startX + endX) / 2}, ${(startY + endY) / 2})`}>
                  <rect x="-30" y="-7" width="60" height="14" rx="2" fill="#fafaf6" opacity="0.9" />
                  <text textAnchor="middle" dy="3" fontSize="9" fontFamily="JetBrains Mono, monospace" fill={style.color}>
                    {e.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      <g>
        {nodes.map(n => {
          const c = NODE_COLORS[n.type] || NODE_COLORS.drug;
          const sel = n.id === selectedId;
          const d = dim(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              opacity={d ? 0.2 : 1}
              style={{ cursor: "pointer" }}
              onPointerDown={(e) => onPointerDown(e, n)}
              onClick={() => onSelect && onSelect(n.id)}
            >
              {sel && (
                <circle r={n.size + 8} fill="none" stroke={c.ring} strokeWidth={1.5} strokeDasharray="3 3" />
              )}
              <circle
                r={n.size}
                fill={c.bg}
                stroke={c.ring}
                strokeWidth={0}
              />
              <text
                textAnchor="middle"
                dy={n.size + 14}
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight={600}
                fill="#0a0a0a"
              >
                {n.label}
              </text>
              {n.sub && (
                <text
                  textAnchor="middle"
                  dy={n.size + 26}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fill="#6b7280"
                >
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
