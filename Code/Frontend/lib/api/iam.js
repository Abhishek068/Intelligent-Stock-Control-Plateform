import { apiClient, unwrapList } from "@/lib/api/client";

function withQuery(path, params) {
  if (!params || !Object.keys(params).length) return path;
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return qs ? `${path}?${qs}` : path;
}

export const usersApi = {
  list(params) {
    return apiClient.get(withQuery("/users/", params));
  },
  get(id) {
    return apiClient.get(`/users/${id}/`);
  },
  invite(data) {
    return apiClient.post("/users/invite/", data);
  },
  update(id, data) {
    return apiClient.patch(`/users/${id}/`, data);
  },
  delete(id) {
    return apiClient.delete(`/users/${id}/`);
  },
  suspend(id) {
    return apiClient.post(`/users/${id}/suspend/`);
  },
  activate(id) {
    return apiClient.post(`/users/${id}/activate/`);
  },
  archive(id) {
    return apiClient.post(`/users/${id}/archive/`);
  },
  deactivate(id) {
    return apiClient.post(`/users/${id}/deactivate/`);
  },
  resendVerification(id) {
    return apiClient.post(`/users/${id}/resend_verification/`);
  },
  getVerificationLink(id) {
    return apiClient.get(`/users/${id}/verification_link/`);
  },
  instantVerify(id) {
    return apiClient.post(`/users/${id}/instant_verify/`);
  },
  setRoles(id, roleIds) {
    return apiClient.post(`/users/${id}/set_roles/`, { role_ids: roleIds });
  },
  getOverrides(id) {
    return apiClient.get(`/users/${id}/overrides/`);
  },
  setOverrides(id, permissions) {
    return apiClient.put(`/users/${id}/overrides/`, { permissions });
  },
};

export const rolesApi = {
  list(params) {
    return apiClient.get(withQuery("/roles/", params));
  },
  get(id) {
    return apiClient.get(`/roles/${id}/`);
  },
  create(data) {
    return apiClient.post("/roles/", data);
  },
  update(id, data) {
    return apiClient.patch(`/roles/${id}/`, data);
  },
  remove(id) {
    return apiClient.delete(`/roles/${id}/`);
  },
  clone(id, name) {
    return apiClient.post(`/roles/${id}/clone/`, { name });
  },
  members(id) {
    return apiClient.get(`/roles/${id}/members/`);
  },
  assignMembers(id, userIds) {
    return apiClient.post(`/roles/${id}/assign_members/`, { user_ids: userIds });
  },
  getPermissions(id) {
    return apiClient.get(`/roles/${id}/permissions/`);
  },
  setPermissions(id, permissions) {
    return apiClient.put(`/roles/${id}/permissions/`, { permissions });
  },
  catalog() {
    return apiClient.get("/permissions/catalog/");
  },
};

export const emailsApi = {
  templates() {
    return apiClient.get("/email-templates/");
  },
  updateTemplate(id, data) {
    return apiClient.patch(`/email-templates/${id}/`, data);
  },
  queue(params) {
    return apiClient.get(withQuery("/email-queue/", params));
  },
  retry(id) {
    return apiClient.post(`/email-queue/${id}/retry/`);
  },
  processQueue() {
    return apiClient.post("/email-queue/process/");
  },
  logs(params) {
    return apiClient.get(withQuery("/email-logs/", params));
  },
  config() {
    return apiClient.get("/email-config/");
  },
  saveConfig(data) {
    return apiClient.post("/email-config/", data);
  },
};

export const activityApi = {
  list(params) {
    return apiClient.get(withQuery("/activity/", params));
  },
};

export const adminDashboardApi = {
  get() {
    return apiClient.get("/admin-dashboard/").catch(() => ({ success: false, data: null }));
  },
  getOverview() {
    return apiClient.get("/admin-dashboard/").catch(() => ({ success: false, data: null }));
  },
};

export const searchApi = {
  search(q) {
    return apiClient.get(withQuery("/search/", { q }));
  },
};

export const scheduledReportsApi = {
  list() {
    return apiClient.get("/scheduled-reports/");
  },
  create(data) {
    return apiClient.post("/scheduled-reports/", data);
  },
  update(id, data) {
    return apiClient.patch(`/scheduled-reports/${id}/`, data);
  },
  remove(id) {
    return apiClient.delete(`/scheduled-reports/${id}/`);
  },
  runNow(id) {
    return apiClient.post(`/scheduled-reports/${id}/run_now/`);
  },
};

export { unwrapList };
