"use client";
import Link from "next/link";
import { Warehouse, ScanBarcode, Calendar } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Receipt, Package, Truck, ClipboardList,
  Settings, Users, AlertTriangle, FileText, LogOut,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore, useUIStore } from "@/lib/store";

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useUserStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const navItems = [
    { name: "Dashboard", href: `/${role}`, icon: LayoutDashboard },
    { name: "Products", href: "/products", icon: Package },
    { name: "Categories", href: "/categories", icon: Users },
    { name: "Suppliers", href: "/suppliers", icon: Users },
    { name: "Stock In", href: "/stock-in", icon: Truck },
    { name: "Stock Out", href: "/stock-out", icon: ClipboardList },
    { name: "Adjustments", href: "/stock-adjustment", icon: AlertTriangle },
    { name: "Transfers", href: "/stock-transfer", icon: Package },
    { name: "Alerts", href: "/alerts", icon: AlertTriangle },
    { name: "Invoices", href: "/invoices", icon: Receipt },
    { name: "Forecast", href: "/forecasting", icon: LayoutDashboard },
    { name: "Reorder", href: "/reorder-recommendations", icon: FileText },
    ...(role !== "staff" ? [
      { name: "Reports", href: "/reports", icon: FileText },
      { name: "Audit Log", href: "/audit-log", icon: FileText }
    ] : []),
    { name: "Purchase Orders", href: "/purchase-orders", icon: FileText },
    { name: "Warehouse", href: "/warehouse", icon: Warehouse },
    { name: "Barcode Scanner", href: "/barcode", icon: ScanBarcode },
    { name: "Stock-take", href: "/stock-take", icon: Calendar },
    ...(role === 'admin' ? [{ name: "Settings", href: "/settings", icon: Settings }] : []),
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-secondary border-r border-slate-700 flex flex-col transition-all duration-300",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      <div className={cn(
        "flex h-16 items-center border-b border-slate-700 px-4 transition-all duration-300",
        sidebarCollapsed ? "justify-center" : "justify-between"
      )}>
        {!sidebarCollapsed && (
          <div className="flex flex-col">
            <span className="text-base font-bold text-teal-400 leading-tight">Stock Control</span>
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase leading-none">System</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {!sidebarCollapsed && (
            <span className="rounded-full bg-teal-600/20 px-2 py-0.5 text-[10px] font-medium text-teal-300 uppercase">
              {role}
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <nav className={cn(
        "flex-1 space-y-1 overflow-y-auto transition-all duration-300",
        sidebarCollapsed ? "p-1.5" : "p-4"
      )}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.name : undefined}
              className={cn(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-all",
                sidebarCollapsed ? "justify-center px-0 mx-auto w-10 h-10" : "gap-3 px-3",
                isActive
                  ? "bg-teal-600/10 text-teal-400 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn(
        "border-t border-slate-700 transition-all duration-300",
        sidebarCollapsed ? "p-1.5" : "p-4"
      )}>
        <button
          title={sidebarCollapsed ? "Logout" : undefined}
          className={cn(
            "flex items-center rounded-lg py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all",
            sidebarCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 w-full"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}