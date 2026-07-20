import { useQuery } from '@tanstack/react-query';
import { statsService } from '@/services/stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    UserCheck,
    UserX,
    Key,
    RefreshCw,
    Zap,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['stats'],
        queryFn: statsService.getStats,
        refetchInterval: 30000, // Refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Fallback for null stats (just in case API fails gracefully or empty)
    if (!stats) return null;

    const statCards = [
        {
            title: "Total Users",
            value: stats.users.total,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            title: "Active Users",
            value: stats.users.active,
            icon: UserCheck,
            color: "text-green-500",
            bg: "bg-green-500/10",
            border: "border-green-500/20"
        },
        {
            title: "Banned Users",
            value: stats.users.banned,
            icon: UserX,
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/20"
        },
        {
            title: "Available Licenses",
            value: stats.licenses.available,
            icon: Key,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            title: "Total Renewals",
            value: stats.activity.total_renewals,
            icon: RefreshCw,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20"
        },
        {
            title: "Active Products",
            value: stats.products.active,
            icon: Zap,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20"
        }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Dashboard Overview
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={i} className="glass-card group hover:scale-[1.02] transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                                    {stat.title}
                                </CardTitle>
                                <div className={cn("p-3 rounded-xl transition-all duration-300", stat.bg)}>
                                    <Icon className={cn("h-5 w-5", stat.color)} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
