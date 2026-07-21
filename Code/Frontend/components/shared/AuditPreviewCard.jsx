import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuditPreviewCard({ entries, onClose, title = "Audit Log Preview" }) {
  if (!entries || entries.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-amber-800">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-1 rounded bg-white/70 p-3">
          {entries.map((entry, idx) =>
          <span key={idx} className={idx % 2 === 0 ? "font-medium" : ""}>
              {idx % 2 === 0 ? `${entry.label}:` : entry.value}
            </span>
          )}
        </div>
        {onClose &&
        <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        }
      </CardContent>
    </Card>);

}