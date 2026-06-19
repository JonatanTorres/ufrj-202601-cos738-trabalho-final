import { useState } from "react";
import type { FetchStagePayload } from "../../types";

interface Props {
  data: FetchStagePayload;
}

export function FetchStep({ data }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="step-detail">
      <div className="fetch-summary">
        <div className="fetch-summary-item">
          <div className="step-eyebrow mono">QUERY MESH</div>
          <code className="mono code-line code-line-wrap">{data.query || "—"}</code>
        </div>
        <div className="fetch-summary-stats">
          <div className="fetch-stat">
            <div className="big-num">{data.total_found.toLocaleString("pt-BR")}</div>
            <div className="step-eyebrow mono">encontrados</div>
          </div>
          <div className="fetch-stat">
            <div className="big-num">{data.returned}</div>
            <div className="step-eyebrow mono">baixados</div>
          </div>
        </div>
      </div>

      <div className="step-eyebrow mono" style={{ marginTop: 16 }}>
        ARTIGOS · ORDEM DE RELEVÂNCIA
      </div>
      <div className="article-list">
        {data.articles.map((a, i) => {
          const isOpen = expanded === a.pmid;
          const open = () => setExpanded(a.pmid);
          const close = () => setExpanded(null);
          return (
            <div
              key={a.pmid}
              className={"article-card" + (isOpen ? " is-open" : "")}
              onClick={isOpen ? undefined : open}
              role={isOpen ? undefined : "button"}
              tabIndex={isOpen ? -1 : 0}
              aria-expanded={isOpen}
              onKeyDown={(e) => {
                if (!isOpen && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  open();
                }
              }}
            >
              <div className="article-rank mono">{String(i + 1).padStart(2, "0")}</div>
              <div className="article-body">
                <div className="article-title-row">
                  <div className="article-title">{a.title}</div>
                  <button
                    type="button"
                    className="article-chevron mono"
                    aria-label={isOpen ? "Fechar abstract" : "Abrir abstract"}
                    onClick={(e) => {
                      e.stopPropagation();
                      isOpen ? close() : open();
                    }}
                  >
                    {isOpen ? "−" : "+"}
                  </button>
                </div>
                <div className="article-meta mono">
                  {a.authors && <span>{a.authors}</span>}
                  {a.year && (<><span>·</span><span>{a.year}</span></>)}
                  {a.journal && (<><span>·</span><span className="article-journal">{a.journal}</span></>)}
                  {a.design && (<><span>·</span><span>{a.design}</span></>)}
                  {a.n != null && (<><span>·</span><span>n={a.n.toLocaleString("pt-BR")}</span></>)}
                </div>
                <div className="article-tags">
                  <span className="pmid-tag mono">PMID: {a.pmid}</span>
                  <span className="weight-tag mono" title="Peso atribuído à evidência (qualidade × design)">
                    peso {(a.weight * 100).toFixed(0)}
                  </span>
                  <div className="weight-bar">
                    <div className="weight-bar-fill" style={{ width: (a.weight * 100) + "%" }} />
                  </div>
                </div>
                {isOpen && (
                  <div className="article-abstract">
                    <div className="step-eyebrow mono">ABSTRACT</div>
                    <p className="article-abstract-text">
                      {a.abstract?.trim() || "Abstract indisponível para este artigo."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {data.articles.length === 0 && (
          <div className="mono" style={{ color: "var(--muted)", padding: 12 }}>
            Nenhum artigo retornado para a consulta MeSH.
          </div>
        )}
      </div>
    </div>
  );
}
