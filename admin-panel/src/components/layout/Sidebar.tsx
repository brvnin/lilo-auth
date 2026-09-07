import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Key,
    Users,
    Package,
    LogOut,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/licenses', label: 'Licenses', icon: Key },
        { href: '/users', label: 'Users', icon: Users },
        { href: '/products', label: 'Products', icon: Package },
    ];

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0e27]/80 border-r border-white/5 backdrop-blur-xl transition-all duration-300">
            <div className="flex h-20 items-center px-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        LILO AUTH
                    </span>
                </div>
            </div>

            <div className="px-4 py-4 flex flex-col h-[calc(100vh-5rem)]">
                <nav className="space-y-2 flex-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "group-hover:text-primary transition-colors")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pb-6">
                    <button
                        onClick={() => logout()}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
}
