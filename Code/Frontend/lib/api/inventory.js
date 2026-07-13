import { apiClient, unwrapList } from "@/lib/api/client";









export const dashboardApi = {
  getStats() {
    return apiClient.get("/dashboard/");
  }
};

export const productsApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(
      `/products/${query}`
    );
    return unwrapList(res);
  },

  get(id) {
    return apiClient.get(`/products/${id}/`);
  },

  lookupBySku(sku) {
    return apiClient.get(`/products/lookup_by_sku/?sku=${encodeURIComponent(sku)}`);
  },

  create(data) {
    return apiClient.post("/products/", data);
  },

  update(id, data) {
    return apiClient.patch(`/products/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/products/${id}/`);
  }
};

export const categoriesApi = {
  async list() {
    const res = await apiClient.get(
      "/categories/"
    );
    return unwrapList(res);
  },

  create(data) {
    return apiClient.post("/categories/", data);
  },

  update(id, data) {
    return apiClient.patch(`/categories/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/categories/${id}/`);
  }
};

export const locationsApi = {
  async list() {
    const res = await apiClient.get(
      "/locations/"
    );
    return unwrapList(res);
  }
};