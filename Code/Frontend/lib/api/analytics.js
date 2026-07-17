import { apiClient, unwrapList } from "@/lib/api/client";

export const notificationsApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/notifications/${query}`);
    return unwrapList(res);
  },

  markRead(id) {
    return apiClient.post(`/notifications/${id}/mark_read/`);
  },

  markAllRead() {
    return apiClient.post("/notifications/mark_all_read/");
  },

  unreadCount() {
    return apiClient.get("/notifications/unread_count/");
  },

  registerDevice(token, platform = "web") {
    return apiClient.post("/device-tokens/", { token, platform });
  },
};

export const auditApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/audit-logs/${query}`);
    return unwrapList(res);
  },
};

export const analyticsApi = {
  getForecast(productId) {
    return apiClient.get(`/forecasts/?product=${productId}`);
  },

  generateForecast(productId, horizonDays = 30) {
    return apiClient.post("/forecasts/generate/", {
      product_id: productId,
      horizon_days: horizonDays,
    });
  },

  async listRecommendations(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/reorder-recommendations/${query}`);
    return unwrapList(res);
  },

  generateRecommendations() {
    return apiClient.post("/reorder-recommendations/generate/");
  },

  getReport(type) {
    return apiClient.get(`/reports/?type=${type}`);
  },

  async listPredictiveAlerts(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/predictive-alerts/${query}`);
    return unwrapList(res);
  },

  resolvePredictiveAlert(id) {
    return apiClient.post(`/predictive-alerts/${id}/resolve/`);
  },
};
