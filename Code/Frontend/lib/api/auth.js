import { apiClient } from "@/lib/api/client";



export const authApi = {
  login(email, password) {
    return apiClient.post("/auth/login/", { email, password });
  },

  logout(refresh) {
    return apiClient.post("/auth/logout/", { refresh });
  },

  me() {
    return apiClient.get("/auth/me/");
  },

  refreshToken(refresh) {
    return apiClient.post("/auth/token/refresh/", { refresh });
  }
};

export const settingsApi = {
  get() {
    return apiClient.get("/settings/");
  },

  update(id, data) {
    return apiClient.patch(`/settings/${id}/`, data);
  }
};