interface Props {
  icon: string;
  label: string;
  value: number;
  color?: "default" | "low" | "mod" | "high";
}

const COLORS = {
  default: { bg: "bg-indigo-50",              val: "text-bark" },
  low:     { bg: "bg-[var(--risk-low-bg)]",   val: "text-[var(--risk-low)]" },
  mod:     { bg: "bg-[var(--risk-mod-bg)]",   val: "text-[var(--risk-mod)]" },
  high:    { bg: "bg-[var(--risk-high-bg)]",  val: "text-[var(--risk-high)]" },
};

export default function StatCard({ icon, label, value, color = "default" }: Props) {
  const { bg, val } = COLORS[color];
  return (
    <div className="card p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center text-xl mb-4`}>
        {icon}
      </div>
      <div className={`font-sora text-4xl font-extrabold leading-none ${val}`}>{value}</div>
      <div className="text-sm text-[var(--ink-lt)] font-medium mt-1.5">{label}</div>
    </div>
  );
}
