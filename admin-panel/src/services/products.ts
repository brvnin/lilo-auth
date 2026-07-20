import { api } from './api';
import type { Product } from '@/types';

export const productService = {
    getAll: async (): Promise<Product[]> => {
        const response = await api.get('/admin/products');
        return response.data.products;
    },

    // Product methods
    create: async (data: any) => api.post('/admin/products/create', data),
    update: async (id: number, data: any) => api.put(`/admin/products/${id}`, data),
    delete: async (id: number) => api.delete(`/admin/products/${id}`),
    toggle: async (id: number) => api.post(`/admin/products/${id}/toggle`),

    // Details & Files
    getDetails: async (id: number) => {
        const response = await api.get(`/admin/products/${id}/details`);
        return response.data.details;
    },
    updateDetails: async (id: number, data: any) => api.post(`/admin/products/${id}/details`, data),
    uploadCheat: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/admin/products/${id}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Images
    getImages: async (id: number) => {
        const response = await api.get(`/admin/products/${id}/images`);
        return response.data.images;
    },
    addImage: async (id: number, fileOrUrl: File | string, type: 'icon' | 'banner' | 'screenshot' | 'preview' = 'screenshot') => {
        if (fileOrUrl instanceof File) {
            const formData = new FormData();
            formData.append('file', fileOrUrl);
            formData.append('image_type', type);
            return api.post(`/admin/products/${id}/images/add`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } else {
            return api.post(`/admin/products/${id}/images/add`, {
                image_url: fileOrUrl,
                image_type: type
            });
        }
    },
    deleteImage: async (imageId: number) => api.delete(`/admin/products/images/${imageId}`),
};
