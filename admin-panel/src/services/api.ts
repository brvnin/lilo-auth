import axios from 'axios';

// Create axios instance with default config
export const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add CSRF token for mutations
api.interceptors.request.use(async (config) => {
    // Only non-GET requests need CSRF
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        try {
            // Fetch a fresh token from the backend
            // Use window.fetch or a separate axios instance to avoid infinite loops
            const response = await fetch('/api/admin/csrf', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.csrf_token) {
                    config.headers['X-CSRF-Token'] = data.csrf_token;
                }
            }
        } catch (error) {
            console.error('Failed to fetch CSRF token', error);
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor to handle 401s (token expiry)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Redirect to login or handle session expiry
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/admin/login')) {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);
