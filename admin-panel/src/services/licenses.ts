import { api } from './api';
import type { License } from '@/types';

export interface GenerateLicenseParams {
    product_id: number;
    subscription_type: string;
    quantity: number;
}

export const licenseService = {
    getAll: async (): Promise<License[]> => {
        const response = await api.get('/admin/licenses');
        return response.data.licenses;
    },

    generate: async (params: GenerateLicenseParams): Promise<string[]> => {
        const response = await api.post('/admin/generate_license', params);
        return response.data.licenses;
    },

    delete: async (license_key: string, force: boolean = false): Promise<void> => {
        // Aligned with the backend fix I made earlier
        await api.post('/admin/delete_license', {
            license_key,
            force
        });
    },

    getRenewals: async (params: { username?: string, license_key?: string, limit?: number } = {}): Promise<any[]> => {
        const response = await api.get('/admin/renewals', { params });
        return response.data.renewals;
    }
};
