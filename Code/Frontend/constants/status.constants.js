




import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Truck,
  XCircle,
  AlertTriangle } from
"lucide-react";


export const INVOICE_STATUS_COLORS = {
  paid: "bg-green-500",
  unpaid: "bg-amber-500",
  overdue: "bg-red-500",
  draft: "bg-slate-400"
};

export const INVOICE_STATUS_ICONS = {
  paid: CheckCircle,
  unpaid: Clock,
  overdue: AlertCircle,
  draft: FileText
};


export const PO_STATUS_COLORS = {
  draft: "bg-slate-400",
  sent: "bg-blue-500",
  received: "bg-green-500",
  cancelled: "bg-red-500"
};

export const PO_STATUS_ICONS = {
  draft: Clock,
  sent: Truck,
  received: CheckCircle,
  cancelled: XCircle
};


export const STOCK_TAKE_STATUS_COLORS = {
  scheduled: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500"
};

export const STOCK_TAKE_STATUS_ICONS = {
  scheduled: Clock,
  in_progress: AlertTriangle,
  completed: CheckCircle
};


export const PRIORITY_COLORS = {
  Critical: "bg-red-500 text-white",
  High: "bg-amber-500 text-white",
  Medium: "bg-blue-500 text-white",
  Low: "bg-green-500 text-white"
};

export const PRIORITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3
};



export const formatStatus = (status) =>
status.
split("_").
map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
join(" ");