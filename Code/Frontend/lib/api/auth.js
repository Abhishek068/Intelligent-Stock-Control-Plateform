import { apiClient } from "@/lib/api/client";

export const authApi = {
  login(email, password, rememberMe = false) {
    return apiClient.post("/auth/login/", {
      email,
      password,
      remember_me: rememberMe,
    });
  },

  logout(refresh) {
    return apiClient.post("/auth/logout/", { refresh });
  },

  me() {
    return apiClient.get("/auth/me/");
  },

  refreshToken(refresh) {
    return apiClient.post("/auth/token/refresh/", { refresh });
  },

  forgotPassword(email) {
    return apiClient.post("/auth/forgot-password/", { email });
  },

  resetPassword(token, newPassword) {
    return apiClient.post("/auth/reset-password/", {
      token,
      new_password: newPassword,
    });
  },

  changePassword(currentPassword, newPassword) {
    return apiClient.post("/auth/change-password/", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  verifyEmail(token) {
    return apiClient.post("/auth/verify-email/", { token });
  },
};

export const settingsApi = {
  get() {
    return apiClient.get("/settings/");
  },

  update(id, data) {
    return apiClient.patch(`/settings/${id}/`, data);
  },
};
