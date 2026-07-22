import { apiClient, unwrapList } from "@/lib/api/client";

export const purchaseOrdersApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/purchase-orders/${query}`);
    return unwrapList(res);
  },

  get(id) {
    return apiClient.get(`/purchase-orders/${id}/`);
  },

  create(data) {
    return apiClient.post("/purchase-orders/", data);
  },

  update(id, data) {
    return apiClient.patch(`/purchase-orders/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/purchase-orders/${id}/`);
  },

  submit(id) {
    return apiClient.post(`/purchase-orders/${id}/submit/`);
  },

  receive(id, data = {}) {
    return apiClient.post(`/purchase-orders/${id}/receive/`, data);
  },

  cancel(id) {
    return apiClient.post(`/purchase-orders/${id}/cancel/`);
  },

  fromReorder(data) {
    return apiClient.post("/purchase-orders/from_reorder/", data);
  },

  async downloadPdf(id, poNumber = "") {
    const res = await apiClient.get(`/purchase-orders/${id}/pdf/`, { responseType: "blob" });
    const blob = res.data || res;
    const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PO-${poNumber || id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
