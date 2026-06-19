import { Fragment } from "react";
import {
  PIPELINE_STEP_META,
  PIPELINE_STEP_ORDER,
  type PipelineRunState,
  type PipelineStepId,
  type PipelineStepStatus,
} from "../types";
import { MiniGraph } from "./MiniGraph";
import { StepIcon } from "./StepIcon";

interface Props {
  run: PipelineRunState;
  onPick: (stepId: PipelineStepId) => void;
}

function clampText(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function PipelineStrip({ run, onPick }: Props) {
  const stepIds = PIPELINE_STEP_ORDER;

  return (
    <div className="pipeline">
      <div className="pipeline-head">
        <div className="pipeline-eyebrow mono">PIPELINE · 7 ETAPAS</div>
        {run.consultText && (
          <div className="pipeline-consult mono" title={run.consultText}>
            {clampText(run.consultText, 60)}
          </div>
        )}
        <div className="pipeline-status mono">
          {run.complete ? (
            <span className="ok-text">✓ concluído em {run.totalMs}ms</span>
          ) : (
            <span className="running-text">executando…</span>
          )}
        </div>
      </div>

      <div className="pipeline-strip">
        {stepIds.map((id, i) => {
          const meta = PIPELINE_STEP_META[id];
          const state: PipelineStepStatus = run.states[id] || "idle";
          const isGraph = meta.kind === "graph";
          const interactive = state !== "idle";
          const stateClass =
            state === "ok" || state === "skipped" || state === "error"
              ? "done"
              : state === "needs_clarification"
                ? "warn"
                : state;
          const cls = [
            "pstep",
            "pstep-" + meta.kind,
            "pstep-" + stateClass,
            isGraph ? "pstep-major" : "pstep-minor",
          ].join(" ");

          let miniData: React.ComponentProps<typeof MiniGraph>["data"] = null;
          let miniKind: "default" | "consensus" = "default";
          let miniNodes;
          if (state !== "idle") {
            if (id === "extract_question" && run.data.stage2) {
              miniData = run.data.stage2;
            } else if (id === "extract_articles" && run.data.stage5) {
              miniData = run.data.stage5;
            } else if (id === "verdict" && run.data.stage6 && run.data.stage5) {
              miniData = run.data.stage6;
              miniKind = "consensus";
              miniNodes = run.data.stage5.nodes;
            }
          }

          return (
            <Fragment key={id}>
              <button
                className={cls}
                disabled={!interactive}
                onClick={() => interactive && onPick(id)}
              >
                <div className="pstep-head">
                  <span className="pstep-num mono">{String(meta.num).padStart(2, "0")}</span>
                  <span className="pstep-icon"><StepIcon id={id} /></span>
                  <span className="pstep-state">
                    {state === "running" && <span className="spinner" />}
                    {(state === "ok" || state === "skipped") && <span className="check">✓</span>}
                    {state === "error" && <span className="check" style={{ color: "#ff4d4d" }}>×</span>}
                    {state === "needs_clarification" && (
                      <span
                        className="check"
                        style={{ color: "#c98a00" }}
                        title="Aguardando esclarecimento do usuário"
                      >
                        ?
                      </span>
                    )}
                    {state === "idle" && <span className="idle-dot" />}
                  </span>
                </div>
                <div className="pstep-title">{meta.title}</div>
                <div className="pstep-sub mono">{meta.sub}</div>
                {isGraph && miniData && (
                  <div className="pstep-mini">
                    <MiniGraph data={miniData} kind={miniKind} consensusNodes={miniNodes} />
                  </div>
                )}
                {state === "running" && (
                  <div className="pstep-progress">
                    <div
                      className="pstep-progress-fill"
                      style={{ width: Math.max(8, (run.progress[id] || 0) * 100) + "%" }}
                    />
                  </div>
                )}
              </button>
              {i < stepIds.length - 1 && (
                <div className={"pstep-arrow " + (state === "ok" || state === "skipped" ? "active" : "")}>
                  <svg viewBox="0 0 24 12" width="24" height="12">
                    <line x1="2" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5"
                      strokeDasharray={state === "ok" || state === "skipped" ? "" : "2 2"} />
                    <polyline points="16,2 20,6 16,10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
