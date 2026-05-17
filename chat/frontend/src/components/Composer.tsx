import { useRef, useState } from "react";

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function Composer({ disabled, onSend }: Props) {
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
          <div className="composer-hint mono">
            <kbd>↵</kbd> enviar · <kbd>⇧↵</kbd> nova linha
          </div>
          <button type="submit" className="send-btn mono" disabled={!val.trim() || disabled}>
            ANALISAR →
          </button>
        </div>
      </div>
    </form>
  );
}
