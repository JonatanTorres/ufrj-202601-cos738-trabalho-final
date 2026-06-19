import type { PipelineStepId } from "../types";

interface Props {
  id: PipelineStepId;
}

export function StepIcon({ id }: Props) {
  switch (id) {
    case "translate_pt_en":
    case "translate_en_pt":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h8" /><path d="M7 3v2" /><path d="M11 5c0 4-4 7-8 8" />
          <path d="M5 9c0 2 3 5 7 6" /><path d="M13 21l4-9 4 9" /><path d="M14.5 17h5" />
        </svg>
      );
    case "extract_question":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" />
          <circle cx="12" cy="13" r="2.6" /><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="19" r="2.2" />
          <line x1="7" y1="7" x2="11" y2="12" /><line x1="17" y1="7" x2="13" y2="12" />
          <line x1="11" y1="14" x2="7" y2="17" /><line x1="13" y1="14" x2="17" y2="17" />
        </svg>
      );
    case "mesh_search":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="6" /><line x1="15.5" y1="15.5" x2="20" y2="20" />
          <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      );
    case "pubmed_search":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h11l3 3v13H5z" /><path d="M16 4v3h3" />
          <line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      );
    case "extract_articles":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          <line x1="10" y1="6.5" x2="14" y2="6.5" /><line x1="10" y1="17.5" x2="14" y2="17.5" />
          <line x1="6.5" y1="10" x2="6.5" y2="14" /><line x1="17.5" y1="10" x2="17.5" y2="14" />
        </svg>
      );
    case "verdict":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" />
          <line x1="12" y1="6.5" x2="12" y2="17.5" />
        </svg>
      );
    default:
      return null;
  }
}
