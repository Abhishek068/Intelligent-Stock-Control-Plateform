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

  async listTransfers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/stock-transfers/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  shipTransfer(id, productId) {
    return apiClient.post(`/stock-transfers/${id}/ship/`, { product_id: productId });
  },

  completeTransfer(id, productId) {
    return apiClient.post(`/stock-transfers/${id}/complete/`, { product_id: productId });
  },

  cancelTransfer(id) {
    return apiClient.post(`/stock-transfers/${id}/cancel/`);
  },

  async downloadTransferPdf(id) {
    const res = await apiClient.get(`/stock-transfers/${id}/pdf/`, { responseType: "blob" });
    const blob = new Blob([res], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Transfer-TR-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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
    const res = await apiClient.get(`/stock-adjustments/${query}`);
    return unwrapList(res);
  },

  async listStockTakes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/stock-takes/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  getStockTake(id) {
    return apiClient.get(`/stock-takes/${id}/`);
  },

  createStockTake(data) {
    return apiClient.post("/stock-takes/", data);
  },

  deleteStockTake(id) {
    return apiClient.delete(`/stock-takes/${id}/`);
  },

  startStockTake(id) {
    return apiClient.post(`/stock-takes/${id}/start/`);
  },

  recordStockTakeCounts(id, counts) {
    return apiClient.post(`/stock-takes/${id}/record_counts/`, { counts });
  },

  completeStockTake(id, applyAdjustments = true) {
    return apiClient.post(`/stock-takes/${id}/complete/`, {
      apply_adjustments: applyAdjustments,
    });
  },

  cancelStockTake(id) {
    return apiClient.post(`/stock-takes/${id}/cancel/`);
  },

  async listBatches(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null))
    ).toString();
    const res = await apiClient.get(`/batches/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  triggerExpiryScan() {
    return apiClient.post("/batches/trigger_expiry_scan/");
  },

  getExpirySummary() {
    return apiClient.get("/batches/expiry_summary/");
  },

  async listSupplierReturns(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/supplier-returns/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  getSupplierReturn(id) {
    return apiClient.get(`/supplier-returns/${id}/`);
  },

  createSupplierReturn(data) {
    return apiClient.post("/supplier-returns/", data);
  },

  shipSupplierReturn(id) {
    return apiClient.post(`/supplier-returns/${id}/ship/`);
  },

  completeSupplierReturn(id) {
    return apiClient.post(`/supplier-returns/${id}/complete/`);
  },

  cancelSupplierReturn(id) {
    return apiClient.post(`/supplier-returns/${id}/cancel/`);
  },
};
