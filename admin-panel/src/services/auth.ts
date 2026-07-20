import { api } from './api';

export interface User {
    username: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export const authService = {
    login: async (username: string, password: string): Promise<User> => {
        const response = await api.post('/admin/login', { username, password });
        return { username: response.data.username };
    },

    logout: async (): Promise<void> => {
        await api.post('/admin/logout');
    },

    verify: async (): Promise<User> => {
        const response = await api.get('/admin/verify');
        return { username: response.data.username };
    },

    getCsrfToken: async (): Promise<string> => {
        const response = await api.get('/admin/csrf');
        return response.data.csrf_token;
    }
};
