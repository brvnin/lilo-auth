import { api } from './api';
import type { User } from '@/types';

export const userService = {
    getAll: async (): Promise<User[]> => {
        const response = await api.get('/admin/users');
        return response.data.users;
    },

    ban: async (username: string) => {
        await api.post('/admin/ban_user', { username });
    },

    unban: async (username: string) => {
        await api.post('/admin/ban_user', { username }); // Toggle on backend
    },

    banHwid: async (username: string) => {
        await api.post('/admin/hwid_ban', { username });
    },

    resetHwid: async (username: string) => {
        await api.post('/admin/hwid_reset', { username });
    },

    delete: async (username: string) => {
        await api.post('/admin/delete_user', { username });
    },

    updateSubscription: async (username: string, data: { subscription_type: string, product_id?: number }) => {
        await api.post('/admin/edit_subscription', { username, ...data });
    },

    extendSubscription: async (username: string, days: number, product_id?: number) => {
        await api.post('/admin/extend_subscription', { username, days, product_id });
    },

    resetPassword: async (username: string, newPassword: string) => {
        await api.post('/admin/reset_password', { username, new_password: newPassword });
    }
};
