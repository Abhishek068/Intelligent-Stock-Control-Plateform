import { apiClient, unwrapList } from "@/lib/api/client";

export const dashboardApi = {
  getStats() {
    return apiClient.get("/dashboard/");
  },

  getTrends(days = 14) {
    return apiClient.get(`/dashboard/trends/?days=${days}`);
  },
};

export const productsApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/products/${query}`);
    return unwrapList(res);
  },

  get(id) {
    return apiClient.get(`/products/${id}/`);
  },

  lookupBySku(sku) {
    return apiClient.get(`/products/lookup_by_sku/?sku=${encodeURIComponent(sku)}`);
  },

  lookup(code) {
    return apiClient.get(`/products/lookup/?code=${encodeURIComponent(code)}`);
  },

  create(data) {
    return apiClient.post("/products/", data);
  },

  update(id, data) {
    return apiClient.patch(`/products/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/products/${id}/`);
  },
  bulkImport(file) {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/products/bulk-import/", formData);
  },
  getBulkImportStatus(jobId) {
    return apiClient.get(`/products/bulk-import/${jobId}/`);
  },
  history(id) {
    return apiClient.get(`/products/${id}/history/`);
  },
  printBarcodes(productIds) {
    return apiClient.post(
      "/products/barcodes/print/",
      { product_ids: productIds },
      { responseType: "blob" }
    );
  },
};

export const categoriesApi = {
  async list() {
    const res = await apiClient.get("/categories/");
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
  },
};

export const locationsApi = {
  async list() {
    const res = await apiClient.get("/locations/");
    return unwrapList(res);
  },

  create(data) {
    return apiClient.post("/locations/", data);
  },

  update(id, data) {
    return apiClient.patch(`/locations/${id}/`, data);
  },

  delete(id) {
    return apiClient.delete(`/locations/${id}/`);
  },
};

export const inventoryBalancesApi = {
  async list(params) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    const res = await apiClient.get(`/inventory-balances/${query}`);
    return unwrapList(res);
  }
};
