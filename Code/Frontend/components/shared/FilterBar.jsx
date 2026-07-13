











import { Card, CardContent } from "@/components/ui/card";

export function FilterBar({ children, resultCount, resultLabel = "results" }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        {children}
        {resultCount !== undefined &&
        <span className="ml-auto text-sm text-slate-400">
            {resultCount} {resultLabel}
          </span>
        }
      </CardContent>
    </Card>);

}