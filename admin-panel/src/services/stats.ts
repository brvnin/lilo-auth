import { api } from './api';
import type { Stats } from '@/types';

export const statsService = {
    getStats: async (): Promise<Stats> => {
        const response = await api.get('/admin/stats');
        return response.data;
    }
};
