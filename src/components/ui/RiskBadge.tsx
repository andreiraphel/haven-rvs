import type { RiskLevel } from "@/types";

interface Props {
  level: RiskLevel;
  showDot?: boolean;
}

const CONFIG: Record<RiskLevel, { cls: string; label: string }> = {
  "LOW RISK":      { cls: "risk-badge-low",  label: "Low Risk" },
  "MODERATE RISK": { cls: "risk-badge-mod",  label: "Moderate Risk" },
  "HIGH RISK":     { cls: "risk-badge-high", label: "High Risk" },
};

export default function RiskBadge({ level, showDot = true }: Props) {
  const conf = CONFIG[level] || { cls: "bg-sand text-[var(--ink-lt)] border-[var(--border)]", label: "Unknown" };
  const { cls, label } = conf;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {showDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
