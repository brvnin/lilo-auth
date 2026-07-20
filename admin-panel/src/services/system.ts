import { api } from './api';

import type { Announcement, LoaderVersion, LoaderFeature } from '@/types';

export const systemService = {
    // Announcements
    getAnnouncements: async (): Promise<Announcement[]> => {
        const response = await api.get('/admin/announcements');
        return response.data.announcements;
    },
    createAnnouncement: async (data: any) => api.post('/admin/announcements/create', data),
    updateAnnouncement: async (id: number, data: any) => api.put(`/admin/announcements/${id}`, data),
    deleteAnnouncement: async (id: number) => api.delete(`/admin/announcements/${id}`),

    // Loader Versions
    getVersions: async (): Promise<LoaderVersion[]> => {
        const response = await api.get('/admin/loader/versions');
        return response.data.versions;
    },
    createVersion: async (data: any) => api.post('/admin/loader/versions/create', data),
    setCurrentVersion: async (id: number) => api.post(`/admin/loader/versions/${id}/set_current`),
    setRequiredVersion: async (id: number) => api.post(`/admin/loader/versions/${id}/set_required`),
    deleteVersion: async (id: number) => api.delete(`/admin/loader/versions/${id}`),

    // Features
    getFeatures: async (): Promise<LoaderFeature[]> => {
        const response = await api.get('/admin/features');
        return response.data.features;
    },
    createFeature: async (data: any) => api.post('/admin/features/create', data),
    updateFeature: async (id: number, data: any) => api.put(`/admin/features/${id}`, data),
    deleteFeature: async (id: number) => api.delete(`/admin/features/${id}`),

    // Renewal History
    getRenewals: async () => {
        const response = await api.get('/admin/renewals');
        return response.data.renewals;
    }
};
