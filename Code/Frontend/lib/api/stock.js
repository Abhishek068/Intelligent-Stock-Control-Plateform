import { apiClient, unwrapList } from "@/lib/api/client";







































export const stockApi = {
  stockIn(data) {
    return apiClient.post("/stock-in/", data);
  },

  stockOut(data) {
    return apiClient.post("/stock-out/", data);
  },

  adjust(data) {
    return apiClient.post("/stock-adjustments/", data);
  },

  transfer(data) {
    return apiClient.post("/stock-transfers/", data);
  },

  async listStockIn(productId) {
    const query = productId ? `?product=${productId}` : "";
    const res = await apiClient.get(`/stock-in/${query}`);
    return unwrapList(res);
  },

  async listStockOut(productId) {
    const query = productId ? `?product=${productId}` : "";
    const res = await apiClient.get(`/stock-out/${query}`);
    return unwrapList(res);
  },

  async listAdjustments(productId) {
    const query = productId ? `?product=${productId}` : "";
    const res = await apiClient.get(
      `/stock-adjustments/${query}`
    );
    return unwrapList(res);
  }
};