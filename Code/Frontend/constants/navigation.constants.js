




import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardCheck,
  Layers,
  BarChart3,
  Bell,
  FileText,
  TrendingUp,
  Lightbulb,
  ShoppingCart,
  Receipt,
  Warehouse,
  ScanBarcode,
  Settings,

  Users } from
"lucide-react";


export const NAV_GROUPS = [
{
  label: "Overview",
  items: [
  {
    label: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["admin"]
  },
  {
    label: "Manager Dashboard",
    href: "/manager",
    icon: LayoutDashboard,
    roles: ["manager"]
  },
  {
    label: "Staff Dashboard",
    href: "/staff",
    icon: LayoutDashboard,
    roles: ["staff"]
  }]

},
{
  label: "Inventory",
  items: [
  { label: "Products", href: "/products", icon: Package, roles: [] },
  {
    label: "Categories",
    href: "/categories",
    icon: Layers,
    roles: []
  },
  {
    label: "Barcode / SKU",
    href: "/barcode",
    icon: ScanBarcode,
    roles: []
  }]

},
{
  label: "Stock Operations",
  items: [
  {
    label: "Stock In",
    href: "/stock-in",
    icon: ArrowDownToLine,
    roles: []
  },
  {
    label: "Stock Out",
    href: "/stock-out",
    icon: ArrowUpFromLine,
    roles: []
  },
  {
    label: "Stock Transfer",
    href: "/stock-transfer",
    icon: ArrowLeftRight,
    roles: []
  },
  {
    label: "Stock Adjustment",
    href: "/stock-adjustment",
    icon: ClipboardCheck,
    roles: []
  },
  {
    label: "Stock-take",
    href: "/stock-take",
    icon: ClipboardCheck,
    roles: []
  }]

},
{
  label: "Procurement",
  items: [
  {
    label: "Purchase Orders",
    href: "/purchase-orders",
    icon: ShoppingCart,
    roles: []
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: Users,
    roles: []
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
    roles: []
  }]

},
{
  label: "Intelligence",
  items: [
  {
    label: "Forecasting",
    href: "/forecasting",
    icon: TrendingUp,
    roles: []
  },
  {
    label: "Reorder",
    href: "/reorder-recommendations",
    icon: Lightbulb,
    roles: []
  }]

},
{
  label: "Reporting",
  items: [
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: []
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
    roles: []
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    icon: FileText,
    roles: ["admin", "manager"]
  }]

},
{
  label: "System",
  items: [
  {
    label: "Warehouse",
    href: "/warehouse",
    icon: Warehouse,
    roles: []
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin"]
  }]

}];