




import { create } from "zustand";
import { persist } from "zustand/middleware";







export const useUIStore = create()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
      set({ sidebarCollapsed: collapsed })
    }),
    { name: "ui-store" }
  )
);