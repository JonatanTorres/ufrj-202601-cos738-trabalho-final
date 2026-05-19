import type { VerdictLabel, VerdictTone } from "../types";

const TONES: Record<VerdictTone, { bg: string; fg: string; dot: string }> = {
  ok:   { bg: "#e7fbe7", fg: "#0a6b25", dot: "#22a06b" },
  warn: { bg: "#fff4d6", fg: "#7a5a00", dot: "#d4a300" },
  info: { bg: "#e6efff", fg: "#1f3d8a", dot: "#3d7dff" },
  bad:  { bg: "#ffe6e6", fg: "#8a1f1f", dot: "#ff4d4d" },
};

interface Props {
  label: VerdictLabel | string;
  tone: VerdictTone;
  title?: string;
}

export function VerdictBadge({ label, tone, title }: Props) {
  const t = TONES[tone];
  return (
    <div className="verdict" style={{ background: t.bg, color: t.fg }}>
      <span className="verdict-dot" style={{ background: t.dot }} />
      <span className="verdict-label">{label}</span>
      {title && <span className="verdict-text">— {title}</span>}
    </div>
  );
}
