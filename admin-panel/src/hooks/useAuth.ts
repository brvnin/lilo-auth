import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['auth', 'user'],
        queryFn: authService.verify,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const loginMutation = useMutation({
        mutationFn: ({ username, password }: any) => authService.login(username, password),
        onSuccess: (data) => {
            queryClient.setQueryData(['auth', 'user'], data);
            navigate('/dashboard');
        },
    });

    const logoutMutation = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            queryClient.setQueryData(['auth', 'user'], null);
            navigate('/login');
        },
    });

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login: loginMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        loginError: loginMutation.error,
        logout: logoutMutation.mutate,
    };
}
