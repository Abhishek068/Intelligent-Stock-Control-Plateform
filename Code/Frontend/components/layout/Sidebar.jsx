"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Truck,
  ClipboardList,
  Settings,
  Users,
  AlertTriangle,
  FileText,
  LogOut,
  Menu,
  Warehouse,
  ScanBarcode,
  Calendar,
  ShieldCheck,
  BrainCircuit,
  BellRing,
  BarChart3,
  TrendingUp,
  History,
  Mail,
  Activity,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store";
import { useAuthStore } from "@/stores/auth.store";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export function Sidebar() {
  const pathname = usePathname();
  const { isSuperAdmin, isAdmin, role, hasPermission } = useRoleAccess();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const dashHref = isSuperAdmin || isAdmin ? "/admin" : role === "manager" ? "/manager" : "/staff";

  const can = (module, action = "view") => isSuperAdmin || hasPermission(module, action);

  const navGroups = [
    {
      label: "Overview",
      items: [{ name: "Dashboard", href: dashHref, icon: LayoutDashboard, show: true }],
    },
    {
      label: "Inventory",
      items: [
        { name: "Products", href: "/products", icon: Package, show: can("products") },
        { name: "Categories", href: "/categories", icon: Users, show: can("categories") },
        { name: "Suppliers", href: "/suppliers", icon: Users, show: can("suppliers") },
        { name: "Warehouse", href: "/warehouse", icon: Warehouse, show: can("settings") },
        { name: "Barcode Scanner", href: "/barcode", icon: ScanBarcode, show: can("products", "edit") || can("stock_take") },
        { name: "Stock-take", href: "/stock-take", icon: Calendar, show: can("stock_take") },
      ],
    },
    {
      label: "Operations",
      items: [
        { name: "Stock In", href: "/stock-in", icon: Truck, show: can("stock_in") },
        { name: "Stock Out", href: "/stock-out", icon: ClipboardList, show: can("stock_out") },
        { name: "Adjustments", href: "/stock-adjustment", icon: AlertTriangle, show: can("adjustments") },
        { name: "Transfers", href: "/stock-transfer", icon: Package, show: can("transfers") },
        { name: "Invoices", href: "/invoices", icon: Receipt, show: can("invoices") || can("reports") },
        { name: "Customers", href: "/customers", icon: Users, show: can("customers") },
        { name: "Purchase Orders", href: "/purchase-orders", icon: FileText, show: can("purchase_orders") || can("reports") },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { name: "Forecasting", href: "/forecasting", icon: TrendingUp, show: can("forecasting") },
        { name: "AI Alerts", href: "/alerts", icon: BellRing, show: can("alerts") },
        { name: "Notifications", href: "/notifications", icon: BellRing, show: can("notifications") },
        { name: "Reorder", href: "/reorder-recommendations", icon: BrainCircuit, show: can("forecasting") },
      ],
    },
    {
      label: "Reports",
      items: [
        { name: "Reports", href: "/reports", icon: BarChart3, show: can("reports") },
        { name: "Scheduled Reports", href: "/scheduled-reports", icon: Calendar, show: can("reports", "manage") || isSuperAdmin },
        { name: "Audit Log", href: "/audit-log", icon: History, show: can("audit") },
        { name: "Activity Center", href: "/activity", icon: Activity, show: can("audit") || isSuperAdmin },
      ],
    },
    {
      label: "Administration",
      items: [
        { name: "Users", href: "/users", icon: Users, show: can("users") || isSuperAdmin },
        { name: "Roles", href: "/roles", icon: KeyRound, show: can("roles") || isSuperAdmin },
        { name: "Emails", href: "/emails", icon: Mail, show: can("emails") || isSuperAdmin },
        { name: "Settings", href: "/settings", icon: Settings, show: isSuperAdmin || can("settings", "manage") },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-950 border-r border-white/5 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-white/5 transition-all duration-300",
          sidebarCollapsed ? "justify-center px-1" : "justify-between px-4"
        )}
      >
        {sidebarCollapsed ? (
          <div className="flex items-center gap-1">
            <img src="/logo.jpg" alt="Logo" className="w-6 h-6 rounded object-cover shrink-0" />
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Logo" className="w-7 h-7 rounded object-cover" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gradient leading-tight">Stock Control System</span>
                <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase leading-none mt-0.5">
                  Operations
                </span>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto transition-all duration-300 scroll-smooth",
          sidebarCollapsed ? "px-2 py-4" : "px-3 py-4"
        )}
      >
        <div className="space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {!sidebarCollapsed && (
                <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </h4>
              )}
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={cn(
                        "group relative flex items-center rounded-lg py-2 text-sm font-medium transition-all duration-200",
                        sidebarCollapsed ? "justify-center px-0 mx-auto w-10 h-10" : "gap-3 px-3",
                        isActive
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300"
                        )}
                      />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      <div className={cn("border-t border-white/5", sidebarCollapsed ? "p-2" : "p-4")}>
        <button
          onClick={handleLogout}
          className={cn(
            "group flex items-center rounded-lg py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white",
            sidebarCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 w-full"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0 group-hover:text-rose-400" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
