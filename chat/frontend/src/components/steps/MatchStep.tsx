import { useEffect, useRef, useState } from "react";
import { MGGraph } from "../MGGraph";
import type {
  AggregateStagePayload,
  EdgeType,
  GraphEdge,
  VerdictStagePayload,
} from "../../types";

interface Props {
  data: VerdictStagePayload;
  aggregate: AggregateStagePayload;
}

const CONSENSUS_TO_EDGE_TYPE: Record<string, EdgeType> = {
  confirm: "trata",
  refute: "induz",
  neutral: "sem_relacao",
};

export function MatchStep({ data, aggregate }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 480 });

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

  const consensusEdges: GraphEdge[] = data.edges_consensus.map(c => ({
    s: c.s,
    t: c.t,
    type: CONSENSUS_TO_EDGE_TYPE[c.consensus] || "sem_relacao",
    conf: c.consensus === "neutral" ? 0.3 : 0.9,
    label: c.note || c.consensus,
  }));

  return (
    <div className="step-detail step-detail-graph">
      <div className="match-side">
        <div className={"verdict-card verdict-card-" + data.tone}>
          <div className="step-eyebrow mono">VEREDITO</div>
          <div className="verdict-label-big">{data.label}</div>
          <div className="verdict-title">{data.title}</div>
          <p className="verdict-summary">{data.summary}</p>
        </div>

        <div className="step-eyebrow mono">CONSENSO POR ARESTA</div>
        <div className="consensus-bar">
          <div className="consensus-seg confirm" style={{ flex: data.score.confirms || 0.0001 }}>
            {data.score.confirms}
          </div>
          <div className="consensus-seg neutral" style={{ flex: data.score.neutral || 0.0001 }}>
            {data.score.neutral}
          </div>
          <div className="consensus-seg refute" style={{ flex: data.score.refutes || 0.0001 }}>
            {data.score.refutes}
          </div>
        </div>
        <div className="consensus-legend mono">
          <span><span className="dot-sq confirm" /> confirma</span>
          <span><span className="dot-sq neutral" /> neutro</span>
          <span><span className="dot-sq refute" /> refuta</span>
        </div>

        <div className="step-eyebrow mono" style={{ marginTop: 16 }}>ARESTAS CRÍTICAS</div>
        <div className="critical-edges">
          {data.edges_consensus
            .filter(c => c.consensus !== "confirm" || c.note)
            .slice(0, 5)
            .map((c, i) => {
              const aNode = aggregate.nodes.find(n => n.id === c.s);
              const bNode = aggregate.nodes.find(n => n.id === c.t);
              return (
                <div key={i} className={"crit-edge crit-edge-" + c.consensus}>
                  <div className="crit-edge-relation mono">
                    <span>{aNode?.label || c.s}</span>
                    <span className="crit-arrow">→</span>
                    <span>{bNode?.label || c.t}</span>
                  </div>
                  <div className="crit-edge-meta mono">
                    <span className="crit-edge-type">{c.type}</span>
                    {c.note && <span> · {c.note}</span>}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      <div className="match-graph">
        <div className="step-graph-stage" ref={wrapRef}>
          <MGGraph
            data={{ nodes: aggregate.nodes, edges: consensusEdges }}
            layout="force"
            width={size.w}
            height={size.h}
          />
        </div>
        <div className="match-graph-legend mono">
          Cores das arestas: <span style={{ color: "#22a06b" }}>verde</span>=confirma,
          <span style={{ color: "#ff4d4d" }}> vermelho</span>=refuta,
          <span style={{ color: "#9ca3af" }}> cinza</span>=neutro/inconcluso.
        </div>
      </div>
    </div>
  );
}
