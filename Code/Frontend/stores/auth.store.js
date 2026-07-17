import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi, configureApiClient } from "@/lib/api";

function mapApiUser(apiUser) {
  const primaryRole = apiUser.primary_role || (apiUser.is_superuser ? "Super Admin" : "Staff");
  let dashboardRole = "staff";
  if (apiUser.is_superuser) dashboardRole = "admin";
  else if (String(primaryRole).toLowerCase().includes("manager")) dashboardRole = "manager";

  return {
    id: String(apiUser.id),
    name: apiUser.display_name || `${apiUser.first_name || ""} ${apiUser.last_name || ""}`.trim(),
    email: apiUser.email,
    role: dashboardRole,
    primaryRole,
    is_superuser: !!apiUser.is_superuser,
    must_change_password: !!apiUser.must_change_password,
    status: apiUser.status,
    department: apiUser.department || "",
    permissions: apiUser.permissions || {},
    roles: apiUser.roles || [],
    phone: apiUser.phone || "",
  };
}

function getStorage(rememberMe) {
  if (typeof window === "undefined") return undefined;
  return rememberMe ? localStorage : sessionStorage;
}

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,
      rememberMe: true,

      setHydrated: () => set({ isHydrated: true }),

      hasPermission: (module, action = "view") => {
        const user = get().user;
        if (!user) return false;
        if (user.is_superuser) return true;
        const actions = user.permissions?.[module] || [];
        return actions.includes(action) || actions.includes("manage");
      },

      login: async (email, password, rememberMe = false) => {
        const response = await authApi.login(email, password, rememberMe);
        if (!response.success || !response.data) {
          throw new Error(
            typeof response.error === "string"
              ? response.error
              : "Invalid email or password."
          );
        }

        const user = mapApiUser(response.data.user);
        set({
          user,
          accessToken: response.data.access,
          refreshToken: response.data.refresh,
          isAuthenticated: true,
          rememberMe,
        });

        if (typeof window !== "undefined") {
          // Re-persist to the correct storage when remember-me changes
          const data = {
            state: {
              user,
              accessToken: response.data.access,
              refreshToken: response.data.refresh,
              isAuthenticated: true,
              rememberMe,
            },
            version: 0,
          };
          const raw = JSON.stringify(data);
          if (rememberMe) {
            localStorage.setItem("auth-store", raw);
            sessionStorage.removeItem("auth-store");
          } else {
            sessionStorage.setItem("auth-store", raw);
            localStorage.removeItem("auth-store");
          }
        }

        return user;
      },

      setUser: (apiUser) => {
        set({ user: mapApiUser(apiUser) });
      },

      logout: async () => {
        const refresh = get().refreshToken;
        if (refresh) {
          try {
            await authApi.logout(refresh);
          } catch {
            /* ignore */
          }
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-store");
          sessionStorage.removeItem("auth-store");
        }
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
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        // Prefer localStorage if present, else sessionStorage
        const local = localStorage.getItem("auth-store");
        if (local) return localStorage;
        return sessionStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
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
  },
});

export const useUserStore = create(() => ({
  role: null,
}));

useAuthStore.subscribe((state) => {
  useUserStore.setState({ role: state.user?.role ?? null });
});
