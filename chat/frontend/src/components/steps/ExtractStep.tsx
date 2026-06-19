import { useEffect, useRef, useState } from "react";
import { MGGraph, NODE_COLORS } from "../MGGraph";
import type { GraphData } from "../../types";

interface Props {
  data: GraphData;
}

export function ExtractStep({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 460 });

  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: Math.max(420, r.width), h: Math.max(360, r.height) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const types = Array.from(new Set(data.nodes.map(n => n.type)));

  return (
    <div className="step-detail step-detail-graph">
      <div>
        <div className="extract-summary mono">
          <div>
            <div className="step-eyebrow">ENTIDADES</div>
            <div className="big-num">{data.nodes.length}</div>
          </div>
          <div>
            <div className="step-eyebrow">RELAÇÕES</div>
            <div className="big-num">{data.edges.length}</div>
          </div>
          <div>
            <div className="step-eyebrow">TIPOS</div>
            <div className="types-row">
              {types.map(t => {
                const c = NODE_COLORS[t] || NODE_COLORS.drug;
                return (
                  <span key={t} className="type-chip" style={{
                    background: c.bg, color: c.fg, borderColor: c.ring,
                  }}>{t}</span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="step-graph-stage" ref={wrapRef}>
        <MGGraph data={data} layout="force" width={size.w} height={size.h} />
      </div>
    </div>
  );
}
