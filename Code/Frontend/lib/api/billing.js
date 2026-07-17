import { apiClient, unwrapList } from "@/lib/api/client";

export const customersApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/customers/${query}`);
    return unwrapList(res);
  },

  get(id) {
    return apiClient.get(`/customers/${id}/`);
  },

  create(data) {
    return apiClient.post("/customers/", data);
  },

  update(id, data) {
    return apiClient.patch(`/customers/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/customers/${id}/`);
  },
};

export const invoicesApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/invoices/${query}`);
    return unwrapList(res);
  },

  get(id) {
    return apiClient.get(`/invoices/${id}/`);
  },

  create(data) {
    return apiClient.post("/invoices/", data);
  },

  update(id, data) {
    return apiClient.patch(`/invoices/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/invoices/${id}/`);
  },

  issue(id) {
    return apiClient.post(`/invoices/${id}/issue/`);
  },

  markPaid(id, data = {}) {
    return apiClient.post(`/invoices/${id}/mark_paid/`, data);
  },

  cancel(id) {
    return apiClient.post(`/invoices/${id}/cancel/`);
  },
};
