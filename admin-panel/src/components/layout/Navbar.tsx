import { useAuth } from '@/hooks/useAuth';
import { UserCircle } from 'lucide-react';

export function Navbar() {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-40 w-full bg-[#0a0e27]/40 backdrop-blur-md border-b border-white/5">
            <div className="flex h-20 items-center justify-end px-12">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 text-sm font-bold text-white bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl shadow-lg">
                        <UserCircle className="h-5 w-5 text-primary" />
                        <span>{user?.username || 'Administrator'}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
