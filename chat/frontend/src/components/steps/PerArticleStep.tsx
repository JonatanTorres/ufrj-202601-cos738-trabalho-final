import { useEffect, useRef, useState } from "react";
import { MGGraph } from "../MGGraph";
import type {
  AggregateStagePayload,
  GraphEdge,
  PipelineProgress,
  PubmedArticle,
} from "../../types";

interface Props {
  data: AggregateStagePayload;
  articles: PubmedArticle[];
  progress?: PipelineProgress | null;
  isRunning?: boolean;
}

export function PerArticleStep({ data, articles, progress, isRunning }: Props) {
  const processedSet = new Set(progress?.processed_pmids || []);
  const hasProgress = !!progress;
  const [sel, setSel] = useState<string | null>(null);
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

  const perArt: Record<string, { edges: number; supports: number }> = {};
  data.edges.forEach(e => {
    e.articles.forEach(a => {
      if (!perArt[a.pmid]) perArt[a.pmid] = { edges: 0, supports: 0 };
      perArt[a.pmid].edges++;
      if (a.supports) perArt[a.pmid].supports++;
    });
  });

  const graphEdges: GraphEdge[] = data.edges.map(e => {
    const total = e.articles.length;
    const supports = e.articles.filter(a => a.supports).length;
    const inSel = sel ? e.articles.some(a => a.pmid === sel) : true;
    return {
      s: e.s,
      t: e.t,
      type: e.type,
      conf: 0.25 + (total > 0 ? supports / total : 0) * 0.7,
      label: sel ? (e.articles.find(a => a.pmid === sel)?.supports ? "apoia" : "refuta") : String(total),
      // Used only for visual dim via styling; MGGraph doesn't read this.
      ...(inSel ? {} : { conf: 0.08 }),
    };
  });
  const usedIds = new Set<string>();
  data.edges.forEach(e => {
    if (sel && !e.articles.some(a => a.pmid === sel)) return;
    usedIds.add(e.s); usedIds.add(e.t);
  });
  const filteredNodes = sel ? data.nodes.filter(n => usedIds.has(n.id)) : data.nodes;
  const filteredEdges = sel ? graphEdges.filter(e => usedIds.has(e.s) && usedIds.has(e.t)) : graphEdges;

  const processedCount = progress?.current ?? articles.length;
  const totalCount = progress?.total ?? articles.length;

  return (
    <div className="step-detail step-detail-graph">
      <div className="per-article-side">
        <div className="step-eyebrow mono">
          ARTIGO ATIVO
          {hasProgress && isRunning && (
            <span style={{ float: "right", color: "var(--muted)" }}>
              {processedCount}/{totalCount} processados
            </span>
          )}
        </div>
        {hasProgress && isRunning && (
          <div style={{
            height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden", marginBottom: 6,
          }}>
            <div style={{
              height: "100%",
              width: `${(processedCount / Math.max(1, totalCount)) * 100}%`,
              background: "var(--ink)",
              transition: "width 0.3s",
            }} />
          </div>
        )}

        <button
          className={"per-art-row" + (sel === null ? " active" : "")}
          onClick={() => setSel(null)}
        >
          <div className="per-art-title">⊕ Agregado dos {processedCount} artigos</div>
          <div className="per-art-meta mono">{data.edges.length} arestas · todas fontes</div>
        </button>
        {articles.map(a => {
          const stat = perArt[a.pmid] || { edges: 0, supports: 0 };
          const isProcessed = !hasProgress || processedSet.has(a.pmid);
          const isPending = hasProgress && !isProcessed;
          return (
            <button
              key={a.pmid}
              className={"per-art-row" + (sel === a.pmid ? " active" : "")}
              onClick={() => isProcessed && setSel(a.pmid)}
              disabled={isPending}
              style={isPending ? { opacity: 0.55 } : undefined}
            >
              <div className="per-art-title">
                {isPending && (
                  <span
                    className="spinner"
                    style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }}
                  />
                )}
                {a.title}
              </div>
              <div className="per-art-meta mono">
                <span className="pmid-tag mono">PMID {a.pmid}</span>
                {isProcessed ? (
                  <span> · {stat.edges} arestas · {stat.supports} apoiam</span>
                ) : (
                  <span> · processando…</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="per-article-graph">
        <div className="step-graph-stage" ref={wrapRef}>
          <MGGraph data={{ nodes: filteredNodes, edges: filteredEdges }} layout="force" width={size.w} height={size.h} />
        </div>
        <div className="per-article-legend mono">
          {sel === null
            ? "Espessura das arestas = nº de artigos que as sustentam. Clique em um artigo para isolar."
            : "Mostrando apenas relações citadas pelo artigo selecionado."}
        </div>
      </div>
    </div>
  );
}
