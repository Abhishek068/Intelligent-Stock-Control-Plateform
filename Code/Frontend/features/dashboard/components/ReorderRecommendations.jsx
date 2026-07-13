import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, HelpCircle } from "lucide-react";
















export function ReorderRecommendations({ items, title = "Smart Reorder Recommendations", showAutoGenerate = false }) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {title}
          </CardTitle>
        </div>
        {showAutoGenerate &&
        <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
            <Sparkles className="mr-1 h-3 w-3" /> Auto-generate
          </Button>
        }
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) =>
        <div key={idx} className="flex flex-col gap-3 rounded-lg border border-white/5 bg-slate-900/50 p-4">
            <div className="flex items-start gap-3">
              {item.priority &&
                <Badge className={`mt-0.5 ${item.priority === "Critical" ? "bg-rose-500" : item.priority === "High" ? "bg-amber-500" : "bg-indigo-500"}`}>
                  {item.priority}
                </Badge>
              }
              <div>
                <p className="font-medium text-sm text-slate-200">{item.product}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stock: {item.stock} <span className="hidden xl:inline">·</span><br className="xl:hidden" /> {item.reorderPoint ? `Reorder point: ${item.reorderPoint}` : `Lead time: ${item.leadTime || 3} days`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3 mt-1">
              <div className="text-right">
                <Button variant="outline" size="sm" className={
                  item.priority === "Critical" || item.priority === "High" ?
                  "border-amber-500/30 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" :
                  "border-emerald-500/30 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                }>
                  Order {item.suggested}
                </Button>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-400">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold">Why reorder {item.product}?</h3>
                    <div className="mt-4 rounded-lg bg-slate-900/50 p-4">
                      <p className="font-medium">📊 Forecast Demand</p>
                      <p>Next 14 days predicted: <strong>45 units</strong></p>
                    </div>
                    <div className="mt-4 rounded-lg bg-teal-50 p-4">
                      <p className="font-medium text-teal-900">✅ Recommendation Formula</p>
                      <p className="font-mono text-xs">(Forecast × Lead Time) + Safety Stock − Current Stock</p>
                      <p className="mt-1 font-mono text-xs">= <strong>{item.suggested}</strong></p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        )}
      </CardContent>
    </Card>);

}
