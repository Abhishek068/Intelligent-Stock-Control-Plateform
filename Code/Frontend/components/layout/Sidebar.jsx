"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Truck,
  ClipboardList,
  ArrowLeftRight,
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
  Layers,
  Undo2,
  KeyRound,
  Bot,
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
        { name: "Barcode Scanner", href: "/barcode", icon: ScanBarcode, show: can("products", "edit") || can("stock_take") },
        { name: "Batches & Lots", href: "/batches", icon: Layers, show: can("stock_in") },
        { name: "Stock-take", href: "/stock-take", icon: Calendar, show: can("stock_take") },
      ],
    },
    {
      label: "Operations",
      items: [
        { name: "Stock In", href: "/stock-in", icon: Truck, show: can("stock_in") },
        { name: "Stock Out", href: "/stock-out", icon: ClipboardList, show: can("stock_out") },
        { name: "Store / Branch Transfers", href: "/stock-transfer", icon: ArrowLeftRight, show: true },
        { name: "Adjustments", href: "/stock-adjustment", icon: AlertTriangle, show: can("adjustments") },
        { name: "Supplier Returns", href: "/supplier-returns", icon: Undo2, show: can("stock_out") },
        { name: "Supplier Inbox & Issues", href: "/supplier-inbox", icon: Mail, show: true },
        { name: "Purchase Orders", href: "/purchase-orders", icon: FileText, show: can("purchase_orders") || can("reports") },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { name: "Forecasting", href: "/forecasting", icon: TrendingUp, show: can("forecasting") },
        { name: "AI Assistant", href: "/chatbot", icon: Bot, show: can("forecasting") },
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
        "fixed left-0 top-0 z-40 h-screen bg-white/95 dark:bg-slate-950/80 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/5 flex flex-col transition-all duration-300 shadow-xl shadow-slate-200/40 dark:shadow-black/50 text-slate-800 dark:text-slate-200",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-200/80 dark:border-white/5 transition-all duration-300 relative overflow-hidden",
          sidebarCollapsed ? "justify-center px-1" : "justify-between px-4"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        
        {sidebarCollapsed ? (
          <div className="flex items-center gap-1 z-10">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-lg shadow-black/10 dark:shadow-black/20 border border-slate-200 dark:border-white/10" />
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 z-10">
              <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-black/10 dark:shadow-black/20 border border-slate-200 dark:border-white/10" />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-gradient leading-tight tracking-wide">StockSense</span>
                <span className="text-[10px] font-semibold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase leading-none mt-0.5">
                  Operations
                </span>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors z-10 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto custom-scrollbar transition-all duration-300 scroll-smooth",
          sidebarCollapsed ? "px-2 py-6" : "px-4 py-6"
        )}
      >
        <div className="space-y-8">
          {navGroups.map((group, idx) => (
            <div key={idx} className="relative">
              {!sidebarCollapsed && (
                <h4 className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  {group.label}
                  <div className="h-px bg-slate-200/80 dark:bg-white/5 flex-1" />
                </h4>
              )}
              <nav className="space-y-1.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
                        sidebarCollapsed ? "justify-center px-0 mx-auto w-11 h-11" : "gap-3 px-3",
                        isActive
                          ? "bg-indigo-50 text-indigo-700 shadow-[inset_3px_0_0_0_rgba(99,102,241,1)] dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                      )}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-50" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 relative z-10 transition-colors",
                          isActive
                            ? "text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                            : "text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-300"
                        )}
                      />
                      {!sidebarCollapsed && <span className="relative z-10 truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      <div className={cn("border-t border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-slate-950/50", sidebarCollapsed ? "p-3" : "p-5")}>
        <button
          onClick={handleLogout}
          className={cn(
            "group flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 w-full cursor-pointer",
            sidebarCollapsed ? "justify-center px-0 h-11" : "gap-3 px-3",
            "text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 hover:shadow-[inset_3px_0_0_0_rgba(244,63,94,1)]"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 transition-colors group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          {!sidebarCollapsed && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
