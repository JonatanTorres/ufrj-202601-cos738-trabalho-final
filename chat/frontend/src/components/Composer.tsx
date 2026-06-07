import { useRef, useState } from "react";
import type { ModelInfo, ModelKey } from "../types";
import { ModelPicker } from "./ModelPicker";

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
  models: ModelInfo[];
  model: ModelKey;
  onModelChange: (m: ModelKey) => void;
}

export function Composer({ disabled, onSend, models, model, onModelChange }: Props) {
  const [val, setVal] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const t = val.trim();
    if (!t || disabled) return;
    onSend(t);
    setVal("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="composer-inner">
        <textarea
          ref={taRef}
          rows={1}
          value={val}
          placeholder="Pergunte ou afirme algo: ex. 'A Terra orbita o Sol'"
          onChange={(e) => {
            setVal(e.target.value);
            const t = e.target;
            t.style.height = "auto";
            t.style.height = Math.min(160, t.scrollHeight) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer-toolbar">
          <div className="composer-toolbar-left">
            <ModelPicker models={models} value={model} onChange={onModelChange} />
            <span className="composer-hint mono">
              <kbd>↵</kbd> enviar · <kbd>⇧↵</kbd> nova linha
            </span>
          </div>
          <button type="submit" className="send-btn mono" disabled={!val.trim() || disabled}>
            ANALISAR →
          </button>
        </div>
      </div>
    </form>
  );
}
