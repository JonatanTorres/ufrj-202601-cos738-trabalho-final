import type { ModelInfo, ModelKey } from "../types";

interface Props {
  models: ModelInfo[];
  value: ModelKey;
  onChange: (m: ModelKey) => void;
}

export function ModelPicker({ models, value, onChange }: Props) {
  return (
    <select
      className="model-select mono"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Selecionar modelo"
    >
      {models.map(m => (
        <option key={m.key} value={m.key} title={m.provider}>
          {m.label || m.key}
        </option>
      ))}
    </select>
  );
}
