




import { create } from "zustand";
import { persist } from "zustand/middleware";








export const useUserStore = create()(
  persist(
    (set) => ({
      role: null,
      setRole: (role) => set({ role }),
      clearRole: () => set({ role: null })
    }),
    { name: "user-store" }
  )
);