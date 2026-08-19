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
  Users,
  KeyRound,
  Mail,
  Activity,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, module: "dashboard" }],
  },
  {
    label: "Inventory",
    items: [
      { label: "Products", href: "/products", icon: Package, module: "products" },
      { label: "Categories", href: "/categories", icon: Layers, module: "categories" },
      { label: "Barcode / SKU", href: "/barcode", icon: ScanBarcode, module: "products" },
      { label: "Stock-take", href: "/stock-take", icon: ClipboardCheck, module: "products" },
    ],
  },
  {
    label: "Stock Operations",
    items: [
      { label: "Stock In", href: "/stock-in", icon: ArrowDownToLine, module: "stock_in" },
      { label: "Stock Out", href: "/stock-out", icon: ArrowUpFromLine, module: "stock_out" },
      { label: "Stock Transfer", href: "/stock-transfer", icon: ArrowLeftRight, module: "transfers" },
      { label: "Stock Adjustment", href: "/stock-adjustment", icon: ClipboardCheck, module: "adjustments" },
    ],
  },
  {
    label: "Procurement",
    items: [
      { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, module: "reports" },
      { label: "Suppliers", href: "/suppliers", icon: Users, module: "suppliers" },
      { label: "Invoices", href: "/invoices", icon: Receipt, module: "reports" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Forecasting", href: "/forecasting", icon: TrendingUp, module: "forecasting" },
      { label: "Reorder", href: "/reorder-recommendations", icon: Lightbulb, module: "forecasting" },
      { label: "Alerts", href: "/alerts", icon: Bell, module: "alerts" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, module: "reports" },
      { label: "Audit Log", href: "/audit-log", icon: FileText, module: "audit" },
      { label: "Activity Center", href: "/activity", icon: Activity, module: "dashboard" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/users", icon: Users, module: "users" },
      { label: "Roles", href: "/roles", icon: KeyRound, module: "roles" },
      { label: "Emails", href: "/emails", icon: Mail, module: "emails" },
      { label: "Settings", href: "/settings", icon: Settings, module: "settings", action: "manage" },
    ],
  },
];
