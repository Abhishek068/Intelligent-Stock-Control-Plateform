import { apiClient, unwrapList } from "@/lib/api/client";


export const suppliersApi = {
  async list(search) {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await apiClient.get(
      `/suppliers/${query}`
    );
    return unwrapList(res);
  },

  get(id) {
    return apiClient.get(`/suppliers/${id}/`);
  },

  create(data) {
    return apiClient.post("/suppliers/", data);
  },

  update(id, data) {
    return apiClient.patch(`/suppliers/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/suppliers/${id}/`);
  }
};