












import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/constants/status.constants";

export function StatusBadge({
  status,
  colorMap,
  iconMap,
  className = "",
  size = "sm"
}) {
  const bgColor = colorMap?.[status] || "bg-slate-400";
  const IconComponent = iconMap?.[status];
  const iconSize = size === "sm" ? "mr-1 h-3 w-3" : "mr-1 h-4 w-4";

  return (
    <Badge className={`${bgColor} ${className}`}>
      {IconComponent && <IconComponent className={iconSize} />}
      {formatStatus(status)}
    </Badge>);

}