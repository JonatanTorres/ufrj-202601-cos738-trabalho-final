import { useEffect, useRef, useState } from "react";
import { MGGraph } from "../MGGraph";
import type {
  AggregateStagePayload,
  EdgeType,
  GraphData,
  GraphEdge,
  PubmedArticle,
  VerdictStagePayload,
} from "../../types";

interface Props {
  data: VerdictStagePayload;
  questionGraph: GraphData;
  aggregate: AggregateStagePayload;
  articles: PubmedArticle[];
}

const CONSENSUS_TO_EDGE_TYPE: Record<string, EdgeType> = {
  confirm: "treats",
  refute: "induces",
  neutral: "no_relation",
};

const EDGE_TYPE_PT: Record<EdgeType, string> = {
  induces: "causa",
  treats: "trata",
  no_relation: "sem relação",
};

interface EdgeArticleGroups {
  apoiam: PubmedArticle[];
  refutam: PubmedArticle[];
  semRelacao: PubmedArticle[];
}

function groupArticlesForEdge(
  s: string,
  t: string,
  aggregate: AggregateStagePayload,
  articles: PubmedArticle[],
): EdgeArticleGroups {
  const aggEdge = aggregate.edges.find(e => e.s === s && e.t === t);
  const votes = aggEdge?.articles || [];
  const supportPmids = new Set(votes.filter(v => v.supports).map(v => v.pmid));
  const refutePmids = new Set(votes.filter(v => !v.supports).map(v => v.pmid));
  const votedPmids = new Set(votes.map(v => v.pmid));
  return {
    apoiam: articles.filter(a => supportPmids.has(a.pmid)),
    refutam: articles.filter(a => refutePmids.has(a.pmid)),
    semRelacao: articles.filter(a => !votedPmids.has(a.pmid)),
  };
}

function ArticleMiniCard({ article }: { article: PubmedArticle }) {
  return (
    <div className="crit-edge-article">
      <div className="crit-edge-article-title">{article.title}</div>
      <div className="crit-edge-article-meta mono">
        <span className="pmid-tag mono">PMID: {article.pmid}</span>
        {article.year && <span>· {article.year}</span>}
        {article.journal && <span className="article-journal">· {article.journal}</span>}
      </div>
    </div>
  );
}

export function MatchStep({ data, questionGraph, aggregate, articles }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 480 });
  const [expanded, setExpanded] = useState<string | null>(null);

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
    type: CONSENSUS_TO_EDGE_TYPE[c.consensus] || "no_relation",
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
              const key = `${c.s}|${c.t}`;
              const isOpen = expanded === key;
              const aNode = questionGraph.nodes.find(n => n.id === c.s);
              const bNode = questionGraph.nodes.find(n => n.id === c.t);
              const groups = groupArticlesForEdge(c.s, c.t, aggregate, articles);
              const toggle = () => setExpanded(isOpen ? null : key);
              return (
                <div
                  key={i}
                  className={"crit-edge crit-edge-" + c.consensus + (isOpen ? " is-open" : "")}
                  onClick={toggle}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                >
                  <div className="crit-edge-head">
                    <div className="crit-edge-relation mono">
                      <span>{aNode?.label || c.s}</span>
                      <span className="crit-arrow">→</span>
                      <span>{bNode?.label || c.t}</span>
                    </div>
                    <span
                      className="crit-edge-chevron mono"
                      aria-hidden="true"
                    >
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                  <div className="crit-edge-meta mono">
                    <span className="crit-edge-type">{EDGE_TYPE_PT[c.type] || c.type}</span>
                    {c.note && <span> · {c.note}</span>}
                  </div>
                  {isOpen && (
                    <div className="crit-edge-articles">
                      <div className="crit-edge-group">
                        <div className="step-eyebrow mono crit-edge-group-head">
                          APOIAM · {groups.apoiam.length}
                        </div>
                        {groups.apoiam.length === 0 ? (
                          <div className="crit-edge-empty mono">Nenhum artigo apoia.</div>
                        ) : (
                          groups.apoiam.map(a => <ArticleMiniCard key={a.pmid} article={a} />)
                        )}
                      </div>
                      <div className="crit-edge-group">
                        <div className="step-eyebrow mono crit-edge-group-head">
                          REFUTAM · {groups.refutam.length}
                        </div>
                        {groups.refutam.length === 0 ? (
                          <div className="crit-edge-empty mono">Nenhum artigo refuta.</div>
                        ) : (
                          groups.refutam.map(a => <ArticleMiniCard key={a.pmid} article={a} />)
                        )}
                      </div>
                      <div className="crit-edge-group">
                        <div className="step-eyebrow mono crit-edge-group-head">
                          SEM RELAÇÃO · {groups.semRelacao.length}
                        </div>
                        {groups.semRelacao.length === 0 ? (
                          <div className="crit-edge-empty mono">Todos os artigos mencionam a relação.</div>
                        ) : (
                          groups.semRelacao.map(a => <ArticleMiniCard key={a.pmid} article={a} />)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
      <div className="match-graph">
        <div className="step-graph-stage" ref={wrapRef}>
          <MGGraph
            data={{ nodes: questionGraph.nodes, edges: consensusEdges }}
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
