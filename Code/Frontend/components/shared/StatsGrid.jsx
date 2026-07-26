












import { Card, CardContent } from "@/components/ui/card";

const colorMap = {
  teal: { text: "text-teal-600", border: "border-teal-500" },
  green: { text: "text-green-600", border: "border-green-500" },
  amber: { text: "text-amber-600", border: "border-amber-500" },
  red: { text: "text-red-600", border: "border-red-500" },
  blue: { text: "text-blue-600", border: "border-blue-500" },
  purple: { text: "text-purple-600", border: "border-purple-500" },
  slate: { text: "text-slate-900", border: "border-slate-500" }
};

export function StatsGrid({ stats, columns = 4 }) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4"
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns] || "md:grid-cols-4"}`}>
      {stats.map((stat, index) => {
        const colors = colorMap[stat.color] || colorMap.slate;
        return (
          <Card
            key={stat.label || index}
            className={`overflow-hidden ${stat.highlight ? `border-l-4 ${colors.border} shadow-sm` : ""}`}>
            
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 truncate" title={stat.label}>{stat.label}</p>
              <p
                className={`text-2xl font-bold truncate tracking-tight ${colors.text}`}
                title={typeof stat.value === "string" || typeof stat.value === "number" ? String(stat.value) : undefined}
              >
                {stat.value}
              </p>
              {stat.subtitle &&
              <p className="text-xs text-slate-400 mt-1 truncate" title={stat.subtitle}>{stat.subtitle}</p>
              }
            </CardContent>
          </Card>);

      })}
    </div>);

}