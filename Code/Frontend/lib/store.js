



export { useAuthStore } from "@/stores/auth.store";
export { useUIStore } from "@/stores/ui.store";


import { useAuthStore } from "@/stores/auth.store";


export function useUserStore() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;
  const setRole = (_role) => {

    
  };const clearRole = () => {
    useAuthStore.getState().logout();
  };
  return { role, user, setRole, clearRole };
}