import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export default function AdminLayout() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Sidebar />
            <div className="pl-64">
                <Navbar />
                <main className="p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
