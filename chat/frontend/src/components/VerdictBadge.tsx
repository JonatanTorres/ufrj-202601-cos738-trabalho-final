import type { Verdict } from "../types";

const TONES = {
  ok:   { bg: "#e7fbe7", fg: "#0a6b25", dot: "#22a06b", text: "evidência forte" },
  warn: { bg: "#fff4d6", fg: "#7a5a00", dot: "#d4a300", text: "evidência inconclusiva" },
  info: { bg: "#e6efff", fg: "#1f3d8a", dot: "#3d7dff", text: "fora do escopo" },
  bad:  { bg: "#ffe6e6", fg: "#8a1f1f", dot: "#ff4d4d", text: "contraditória" },
} as const;

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const t = TONES[verdict.tone];
  return (
    <div className="verdict" style={{ background: t.bg, color: t.fg }}>
      <span className="verdict-dot" style={{ background: t.dot }} />
      <span className="verdict-label">{verdict.label}</span>
      <span className="verdict-text">— {t.text}</span>
    </div>
  );
}
