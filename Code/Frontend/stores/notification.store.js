import { create } from "zustand";
import { notificationsApi } from "@/lib/api";

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  loading: false,

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  fetchUnreadCount: async () => {
    try {
      const res = await notificationsApi.unreadCount();
      const count = res.data?.count ?? 0;
      set({ unreadCount: count });
      return count;
    } catch {
      return get().unreadCount;
    }
  },

  markRead: async (id) => {
    // Optimistic UI update
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
    try {
      await notificationsApi.markRead(id);
    } catch (err) {
      // Re-fetch on error to ensure consistency
      get().fetchUnreadCount();
      throw err;
    }
  },

  markAllRead: async () => {
    // Optimistic UI update - badge disappears immediately
    set({ unreadCount: 0 });
    try {
      await notificationsApi.markAllRead();
    } catch (err) {
      // Re-fetch on error to ensure consistency
      get().fetchUnreadCount();
      throw err;
    }
  },
}));
