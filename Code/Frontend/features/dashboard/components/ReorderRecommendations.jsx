import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HelpCircle } from "lucide-react";

function mapItem(item) {
  const explanation = item.explanation || item.explanation_json || {};
  return {
    product: item.product || item.product_name,
    stock: item.stock ?? item.current_stock,
    leadTime: item.leadTime ?? item.lead_time_days,
    suggested: item.suggested ?? item.suggested_quantity,
    priority: item.priority,
    reorderPoint: item.reorderPoint ?? item.reorder_point,
    explanation,
  };
}

export function ReorderRecommendations({
  items,
  title = "Smart Reorder Recommendations",
  showAutoGenerate = false,
  onAutoGenerate,
}) {
  const mapped = (items || []).slice(0, 4).map(mapItem);

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {title}
          </CardTitle>
        </div>
        {showAutoGenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-400 hover:text-emerald-300"
            onClick={onAutoGenerate}
          >
            Auto-generate
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3 pt-1">
        {mapped.length === 0 && (
          <p className="text-sm text-slate-400">No recommendations yet</p>
        )}
        {mapped.map((item, idx) => {
          const ex = item.explanation || {};
          const predicted =
            ex.predicted_demand_30d ?? ex.forecast_demand ?? item.suggested ?? "—";
          return (
            <div
              key={idx}
              className="flex flex-col gap-3 rounded-lg border border-white/5 bg-slate-900/50 p-4"
            >
              <div className="flex items-start gap-3">
                {item.priority && (
                  <Badge
                    className={`mt-0.5 ${
                      item.priority === "Critical"
                        ? "bg-rose-500"
                        : item.priority === "High"
                          ? "bg-amber-500"
                          : "bg-indigo-500"
                    }`}
                  >
                    {item.priority}
                  </Badge>
                )}
                <div>
                  <p className="font-medium text-sm text-slate-200">{item.product}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Stock: {item.stock}{" "}
                    <span className="hidden xl:inline">·</span>
                    <br className="xl:hidden" />{" "}
                    {item.reorderPoint
                      ? `Reorder point: ${item.reorderPoint}`
                      : `Lead time: ${item.leadTime || 3} days`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3 mt-1">
                <Link href="/reorder-recommendations">
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      item.priority === "Critical" || item.priority === "High"
                        ? "border-amber-500/30 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                        : "border-emerald-500/30 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                    }
                  >
                    Review {item.suggested}
                  </Button>
                </Link>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-emerald-400"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold">Why reorder {item.product}?</h3>
                      <div className="mt-4 rounded-lg bg-slate-900/50 p-4 space-y-1 text-sm">
                        <p className="font-medium">Forecast demand</p>
                        <p>
                          Next 30 days predicted: <strong>{predicted}</strong> units
                        </p>
                        {ex.avg_daily_demand != null && (
                          <p>Avg daily demand: {ex.avg_daily_demand}</p>
                        )}
                        {ex.current_stock != null && (
                          <p>Current stock: {ex.current_stock}</p>
                        )}
                        {ex.lead_time_days != null && (
                          <p>Lead time: {ex.lead_time_days} days</p>
                        )}
                        {ex.safety_stock != null && (
                          <p>Safety stock: {ex.safety_stock}</p>
                        )}
                      </div>
                      <div className="mt-4 rounded-lg bg-teal-50 p-4 text-teal-900">
                        <p className="font-medium">Recommendation formula</p>
                        <p className="font-mono text-xs mt-1">
                          {ex.reorder_point_formula ||
                            "(avg_daily_demand × lead_time) + safety_stock"}
                        </p>
                        <p className="mt-1 font-mono text-xs">
                          Suggested qty: <strong>{item.suggested}</strong>
                        </p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
