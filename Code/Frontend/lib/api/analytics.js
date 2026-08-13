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

  async listForecasts(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/forecasts/${query}`);
    return unwrapList(res);
  },

  getForecastSummary() {
    return apiClient.get("/forecasts/summary/");
  },

  getAccuracyHistory(productId = "all") {
    const q = productId ? `?product=${encodeURIComponent(productId)}` : "";
    return apiClient.get(`/forecasts/accuracy-history/${q}`);
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

  getReport(type, params = {}) {
    const qs = new URLSearchParams({ type, ...params }).toString();
    return apiClient.get(`/reports/?${qs}`);
  },

  async listPredictiveAlerts(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/predictive-alerts/${query}`);
    return unwrapList(res);
  },

  resolvePredictiveAlert(id) {
    return apiClient.post(`/predictive-alerts/${id}/resolve/`);
  },

  chatbotQuery(message) {
    return apiClient.post("/chatbot/query/", { message });
  },

  getAbcXyzMatrix() {
    return apiClient.get("/analytics/abc-xyz-matrix/");
  },

  recalculateAbcXyz() {
    return apiClient.post("/analytics/recalculate-abc-xyz/");
  },

  calculateStochasticSafetyStock(targetServiceLevel = 98.0) {
    return apiClient.post("/analytics/calculate-stochastic-safety-stock/", {
      target_service_level: targetServiceLevel,
    });
  },
};
