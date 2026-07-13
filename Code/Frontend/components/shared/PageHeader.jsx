












import { Badge } from "@/components/ui/badge";

const badgeVariants = {
  teal: "text-teal-600",
  purple: "text-purple-600",
  blue: "text-blue-600",
  amber: "text-amber-600",
  red: "text-red-600"
};

export function PageHeader({ title, description, badge, actions, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          {title}
        </h1>
        {description && <p className="text-slate-400 mt-1">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {badge &&
        <Badge
          variant="outline"
          className={badgeVariants[badge.variant] || "text-teal-600"}>
          
            {badge.icon && <badge.icon className="mr-1 h-3 w-3" />}
            {badge.label}
          </Badge>
        }
        {actions}
        {children}
      </div>
    </div>);

}