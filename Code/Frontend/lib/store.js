import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({
      role: null, // 'admin', 'manager', 'staff'
      setRole: (role) => set({ role }),
      logout: () => set({ role: null }),
    }),
    {
      name: "user-storage",
    }
  )
);

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));