import type { AssistantMsg, PipelineStepId } from "../types";
import { ToolCallChip } from "./ToolCallChip";
import { VerdictBadge } from "./VerdictBadge";

interface Props {
  msg: AssistantMsg;
  onOpenStep?: (stepId: PipelineStepId) => void;
}

export function AssistantMessage({ msg, onOpenStep }: Props) {
  const pipeline = msg.pipeline;
  const verdict = pipeline?.data.stage6 || null;
  const articleCount = pipeline?.data.stage4?.articles.length ?? 0;
  const finalText = pipeline?.data.final_text_pt || msg.text;

  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar mono">MG</div>
      <div className="msg-body">
        <div className="msg-eyebrow mono">
          MEDGRAPH · {verdict ? "VEREDITO" : msg.pending ? "GERANDO…" : "RESPOSTA"}
          {msg.pending && !verdict && <span className="cursor-pulse" />}
        </div>

        {verdict && (
          <VerdictBadge label={verdict.label} tone={verdict.tone} title={verdict.title} />
        )}

        {msg.toolCalls
          .filter(tc => tc.name !== "pipeline_medico")
          .map((tc, i) => (
            <ToolCallChip key={i} call={tc} />
          ))}

        {finalText && (
          <div className="msg-text">
            {finalText}
            {msg.pending && !verdict && <span className="cursor">▍</span>}
          </div>
        )}

        {pipeline && pipeline.complete && onOpenStep && (
          <div className="msg-actions">
            <button className="ghost-btn mono" onClick={() => onOpenStep("verdict")}>
              ver grafo de consenso →
            </button>
            <button className="ghost-btn mono" onClick={() => onOpenStep("pubmed_search")}>
              ver artigos ({articleCount}) →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
