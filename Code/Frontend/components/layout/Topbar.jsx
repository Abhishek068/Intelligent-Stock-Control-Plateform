"use client";
import { useRouter } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth.store";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 bg-slate-950/80 backdrop-blur-md px-6 shadow-sm">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Search products, suppliers..."
          className="pl-9 bg-white/5 border-0 text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-lg"
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="hidden rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium uppercase text-indigo-400 sm:inline">
          {user?.role}
        </span>
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-200 hover:bg-slate-800" onClick={() => router.push("/alerts")}>
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 border border-indigo-500/30">
              <Avatar className="h-8 w-8 bg-indigo-600">
                <AvatarFallback className="text-white bg-gradient-to-br from-indigo-500 to-purple-600">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
            <DropdownMenuItem disabled className="text-slate-400">{user?.email}</DropdownMenuItem>
            {user?.role === "admin" && (
              <DropdownMenuItem className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer" onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-rose-400 hover:bg-rose-950/50 focus:bg-rose-950/50 cursor-pointer" onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
