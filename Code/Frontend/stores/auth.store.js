import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, configureApiClient } from "@/lib/api";














function mapApiUser(apiUser) {
  return {
    id: String(apiUser.id),
    name: apiUser.display_name || `${apiUser.first_name} ${apiUser.last_name}`.trim(),
    email: apiUser.email,
    role: apiUser.role,
    department: apiUser.department
  };
}

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,

      setHydrated: () => set({ isHydrated: true }),

      login: async (email, password) => {
        const response = await authApi.login(email, password);
        if (!response.success || !response.data) {
          throw new Error(
            typeof response.error === "string" ?
            response.error :
            "Invalid email or password."
          );
        }

        const user = mapApiUser(response.data.user);
        set({
          user,
          accessToken: response.data.access,
          refreshToken: response.data.refresh,
          isAuthenticated: true
        });
        return user;
      },

      logout: async () => {
        const refresh = get().refreshToken;
        if (refresh) {
          try {
            await authApi.logout(refresh);
          } catch {

            
          }}
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        });
      },

      refreshSession: async () => {
        const refresh = get().refreshToken;
        if (!refresh) return null;
        try {
          const response = await authApi.refreshToken(refresh);
          set({ accessToken: response.access });
          return response.access;
        } catch {
          await get().logout();
          return null;
        }
      }
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);

configureApiClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken: () => useAuthStore.getState().refreshSession(),
  onUnauthorized: () => {
    useAuthStore.getState().logout();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
});


export const useUserStore = create(() => ({
  role: null
}));

useAuthStore.subscribe((state) => {
  useUserStore.setState({ role: state.user?.role ?? null });
});