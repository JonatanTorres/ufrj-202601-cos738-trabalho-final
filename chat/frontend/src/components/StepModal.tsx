import { useEffect } from "react";
import {
  PIPELINE_STEP_META,
  PIPELINE_STEP_ORDER,
  type PipelineRunState,
  type PipelineStepId,
} from "../types";
import { StepIcon } from "./StepIcon";
import { TranslateStep } from "./steps/TranslateStep";
import { ExtractStep } from "./steps/ExtractStep";
import { MeshStep } from "./steps/MeshStep";
import { FetchStep } from "./steps/FetchStep";
import { PerArticleStep } from "./steps/PerArticleStep";
import { MatchStep } from "./steps/MatchStep";

interface Props {
  stepId: PipelineStepId;
  run: PipelineRunState;
  onClose: () => void;
  onNav: (delta: 1 | -1) => void;
}

export function StepModal({ stepId, run, onClose, onNav }: Props) {
  const meta = PIPELINE_STEP_META[stepId];
  const idx = PIPELINE_STEP_ORDER.indexOf(stepId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNav]);

  let body: React.ReactNode = null;
  const d = run.data;
  if (stepId === "translate_pt_en" && d.stage1) {
    body = <TranslateStep data={d.stage1} direction="in" />;
  } else if (stepId === "extract_question" && d.stage2) {
    body = <ExtractStep data={d.stage2} />;
  } else if (stepId === "mesh_search" && d.stage3) {
    body = <MeshStep data={d.stage3} />;
  } else if (stepId === "pubmed_search" && d.stage4) {
    body = <FetchStep data={d.stage4} />;
  } else if (stepId === "extract_articles" && d.stage5 && d.stage4) {
    body = (
      <PerArticleStep
        data={d.stage5}
        articles={d.stage4.articles}
        progress={run.extractProgress}
        isRunning={run.states.extract_articles === "running"}
      />
    );
  } else if (stepId === "verdict" && d.stage6 && d.stage2 && d.stage5 && d.stage4) {
    body = (
      <MatchStep
        data={d.stage6}
        questionGraph={d.stage2}
        aggregate={d.stage5}
        articles={d.stage4.articles}
      />
    );
  } else if (stepId === "translate_en_pt" && d.stage7) {
    body = <TranslateStep data={d.stage7} direction="out" />;
  } else {
    body = (
      <div style={{ padding: 40, color: "var(--muted)", textAlign: "center" }}>
        Aguardando dados desta etapa…
      </div>
    );
  }

  return (
    <div className="modal-backdrop step-modal-backdrop" onClick={onClose}>
      <div className="modal step-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <span className="step-num-big mono">{String(meta.num).padStart(2, "0")}</span>
            <span className="step-icon-big"><StepIcon id={stepId} /></span>
            <div>
              <div className="step-modal-title">{meta.title}</div>
              <div className="step-modal-sub mono">{meta.sub} · etapa {meta.num}/7</div>
            </div>
          </div>
          <div className="modal-controls">
            <div className="step-nav">
              <button className="icon-btn" onClick={() => onNav(-1)} disabled={idx <= 0} title="Anterior (←)">‹</button>
              <button className="icon-btn" onClick={() => onNav(1)} disabled={idx >= PIPELINE_STEP_ORDER.length - 1} title="Próximo (→)">›</button>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>
        <div className="step-modal-body">
          {body}
        </div>
      </div>
    </div>
  );
}
