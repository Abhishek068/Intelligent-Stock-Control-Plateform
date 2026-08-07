export { configureApiClient, apiClient, ApiError } from "@/lib/api/client";
export { authApi, settingsApi } from "@/lib/api/auth";
export { dashboardApi, productsApi, categoriesApi, locationsApi, inventoryBalancesApi } from "@/lib/api/inventory";
export { suppliersApi } from "@/lib/api/suppliers";
export { stockApi } from "@/lib/api/stock";
export { purchaseOrdersApi } from "@/lib/api/procurement";
export { customersApi, invoicesApi } from "@/lib/api/billing";
export { notificationsApi, auditApi, analyticsApi } from "@/lib/api/analytics";
export {
  usersApi,
  rolesApi,
  emailsApi,
  activityApi,
  adminDashboardApi,
  searchApi,
  scheduledReportsApi,
} from "@/lib/api/iam";
