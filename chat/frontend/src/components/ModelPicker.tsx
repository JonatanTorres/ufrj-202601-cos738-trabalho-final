import type { ModelInfo, ModelKey } from "../types";

interface Props {
  models: ModelInfo[];
  value: ModelKey;
  onChange: (m: ModelKey) => void;
}

export function ModelPicker({ models, value, onChange }: Props) {
  return (
    <div className="model-picker" role="tablist">
      {models.map(m => (
        <button
          key={m.key}
          className={"model-btn" + (value === m.key ? " active" : "")}
          onClick={() => onChange(m.key)}
          role="tab"
          aria-selected={value === m.key}
          title={`${m.label} · ${m.provider}`}
        >
          {m.label || m.key}
        </button>
      ))}
    </div>
  );
}
