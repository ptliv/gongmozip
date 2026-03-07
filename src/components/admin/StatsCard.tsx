import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: "blue" | "green" | "orange" | "violet" | "gray";
  sub?: string;
}

const colorMap = {
  blue: {
    icon: "bg-blue-100 text-blue-600",
    value: "text-blue-700",
    bar: "from-blue-400 to-blue-600",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
    bar: "from-emerald-400 to-emerald-600",
  },
  orange: {
    icon: "bg-orange-100 text-orange-600",
    value: "text-orange-700",
    bar: "from-orange-400 to-orange-600",
  },
  violet: {
    icon: "bg-violet-100 text-violet-600",
    value: "text-violet-700",
    bar: "from-violet-400 to-violet-600",
  },
  gray: {
    icon: "bg-gray-100 text-gray-500",
    value: "text-gray-700",
    bar: "from-gray-300 to-gray-500",
  },
};

export function StatsCard({ label, value, icon, color = "blue", sub }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 p-5 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      {/* 상단 컬러 바 */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", c.bar)} />

      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.icon)}>
          {icon}
        </div>
      </div>

      <div className={cn("text-2xl font-black tracking-tight", c.value)}>{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1.5">{sub}</div>}
    </div>
  );
}
