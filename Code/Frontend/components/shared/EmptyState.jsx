











import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title = "No results",
  description,
  action,
  onAction
}) {
  return (
    <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
      {Icon &&
      <div className="rounded-full bg-slate-100 p-3">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      }
      <div>
        <p className="text-lg font-semibold text-slate-700">{title}</p>
        {description &&
        <p className="mt-1 text-sm text-slate-500">{description}</p>
        }
      </div>
      {action && onAction &&
      <Button variant="outline" onClick={onAction}>
          {action}
        </Button>
      }
    </div>);

}