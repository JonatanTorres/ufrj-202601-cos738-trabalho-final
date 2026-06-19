/* Flat geometric science illustrations.
 * Portadas do design original (_design-reference/project/app.jsx, linhas 5–78). */

export function MoleculeIllustration() {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <line x1="40" y1="50" x2="80" y2="80" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="120" y2="50" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="80" y2="125" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="40" y1="50" x2="20" y2="100" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="120" y1="50" x2="140" y2="100" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="40" cy="50" r="14" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="120" cy="50" r="14" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="80" cy="80" r="18" fill="#0a0a0a" />
      <circle cx="80" cy="125" r="12" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="20" cy="100" r="10" fill="#ffd400" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="140" cy="100" r="10" fill="#ffd400" stroke="#0a0a0a" strokeWidth="2" />
    </svg>
  );
}

export function DnaIllustration() {
  const rungs = [];
  for (let i = 0; i < 7; i++) {
    const y = 20 + i * 18;
    const phase = i * 0.7;
    const x1 = 80 + Math.sin(phase) * 36;
    const x2 = 80 - Math.sin(phase) * 36;
    rungs.push(<line key={"r" + i} x1={x1} y1={y} x2={x2} y2={y} stroke="#0a0a0a" strokeWidth="1.5" />);
    rungs.push(<circle key={"l" + i} cx={x1} cy={y} r="6" fill={i % 2 ? "#3d7dff" : "#c6ff3d"} stroke="#0a0a0a" strokeWidth="1.5" />);
    rungs.push(<circle key={"r2" + i} cx={x2} cy={y} r="6" fill={i % 2 ? "#ffd400" : "#ff4d4d"} stroke="#0a0a0a" strokeWidth="1.5" />);
  }
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <path d="M 116,20 Q 44,52 116,84 Q 188,116 44,148" fill="none" stroke="#0a0a0a" strokeWidth="2" transform="translate(-20,0)" />
      <path d="M 44,20 Q 116,52 44,84 Q -28,116 116,148" fill="none" stroke="#0a0a0a" strokeWidth="2" transform="translate(20,0)" />
      {rungs}
    </svg>
  );
}

export function NeuronIllustration() {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <line x1="80" y1="80" x2="20" y2="40" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="30" y2="80" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="20" y2="120" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="50" y2="20" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="55" y2="135" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="145" y2="80" stroke="#0a0a0a" strokeWidth="3" />
      <line x1="145" y1="80" x2="155" y2="65" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="145" y1="80" x2="155" y2="95" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="20" cy="40" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="30" cy="80" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="20" cy="120" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="50" cy="20" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="55" cy="135" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="80" cy="80" r="22" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="80" cy="80" r="8" fill="#0a0a0a" />
      <circle cx="155" cy="65" r="5" fill="#ff4d4d" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="155" cy="95" r="5" fill="#ff4d4d" stroke="#0a0a0a" strokeWidth="1.5" />
    </svg>
  );
}

export function PetriIllustration() {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <circle cx="80" cy="80" r="62" fill="#fafaf6" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="80" cy="80" r="50" fill="none" stroke="#0a0a0a" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="60" cy="60" r="10" fill="#ff4d4d" />
      <circle cx="100" cy="55" r="6" fill="#ff4d4d" />
      <circle cx="105" cy="95" r="14" fill="#3d7dff" />
      <circle cx="55" cy="100" r="8" fill="#3d7dff" />
      <circle cx="80" cy="115" r="5" fill="#3d7dff" />
      <circle cx="72" cy="78" r="4" fill="#ffd400" />
      <circle cx="118" cy="75" r="5" fill="#c6ff3d" />
    </svg>
  );
}

export const ILLUSTRATIONS = [
  { Comp: MoleculeIllustration, label: "Compostos" },
  { Comp: DnaIllustration, label: "Genética" },
  { Comp: NeuronIllustration, label: "Neurociência" },
  { Comp: PetriIllustration, label: "Microbiologia" },
];

export function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <circle cx="6" cy="6" r="3" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="18" cy="8" r="3" fill="#ff4d4d" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="12" cy="18" r="3" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <line x1="6" y1="6" x2="18" y2="8" stroke="#0a0a0a" strokeWidth="1.5" />
      <line x1="6" y1="6" x2="12" y2="18" stroke="#0a0a0a" strokeWidth="1.5" />
      <line x1="18" y1="8" x2="12" y2="18" stroke="#0a0a0a" strokeWidth="1.5" />
    </svg>
  );
}
