import type { ModelKey } from "../types";

interface Props {
  value: ModelKey;
  onChange: (m: ModelKey) => void;
}

const OPTIONS: Array<{ key: ModelKey; label: string }> = [
  { key: "qwen", label: "qwen" },
  { key: "llama", label: "llama" },
];

export function ModelPicker({ value, onChange }: Props) {
  return (
    <div className="model-picker" role="tablist">
      {OPTIONS.map(o => (
        <button
          key={o.key}
          className={"model-btn" + (value === o.key ? " active" : "")}
          onClick={() => onChange(o.key)}
          role="tab"
          aria-selected={value === o.key}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
