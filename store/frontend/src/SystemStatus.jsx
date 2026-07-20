import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Server,
    Database,
    Globe,
    Cpu,
    Activity,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const SystemStatus = () => {
    const [services, setServices] = useState([
        { id: 'api', name: 'Store API', icon: Server, status: 'checking', lastCheck: null },
        { id: 'database', name: 'Database Cluster', icon: Database, status: 'checking', lastCheck: null },
        { id: 'website', name: 'Web Store', icon: Globe, status: 'checking', lastCheck: null },
        { id: 'loader', name: 'Cheat Loader API', icon: Cpu, status: 'checking', lastCheck: null },
    ]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const checkHealth = async () => {
        setIsRefreshing(true);
        const now = new Date().toISOString();

        try {
            // Check all services from backend (including loader via proxy)
            const storeRes = await fetch(`${API_BASE}/api/health`);
            const storeData = await storeRes.json();

            setServices(prev => prev.map(s => {
                if (s.id === 'api') return { ...s, status: storeData.services?.api || 'operational', lastCheck: now };
                if (s.id === 'database') return { ...s, status: storeData.services?.database || 'operational', lastCheck: now };
                if (s.id === 'website') return { ...s, status: storeData.services?.website || 'operational', lastCheck: now };
                if (s.id === 'loader') return { ...s, status: storeData.services?.loader || 'down', lastCheck: now };
                return s;
            }));
        } catch (err) {
            console.error('Health check failed:', err);
            setServices(prev => prev.map(s => ({ ...s, status: 'down', lastCheck: now })));
        }

        setLastUpdated(now);
        setIsRefreshing(false);
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'operational': return 'text-green-400';
            case 'degraded': return 'text-yellow-400';
            case 'down': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusBg = (status) => {
        switch (status) {
            case 'operational': return 'bg-green-500/10 border-green-500/30';
            case 'degraded': return 'bg-yellow-500/10 border-yellow-500/30';
            case 'down': return 'bg-red-500/10 border-red-500/30';
            default: return 'bg-gray-500/10 border-gray-500/30';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'operational': return <CheckCircle className="w-5 h-5" />;
            case 'degraded': return <AlertTriangle className="w-5 h-5" />;
            case 'down': return <XCircle className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5 animate-pulse" />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'operational': return 'Operational';
            case 'degraded': return 'Degraded';
            case 'down': return 'Offline';
            default: return 'Checking...';
        }
    };

    const allOperational = services.every(s => s.status === 'operational');

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-16">
            {/* Background effects */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black -z-10" />
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 -z-10" />

            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-mono uppercase tracking-widest">Back to Store</span>
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-white font-rajdhani uppercase tracking-tight mb-2">
                                System Status
                            </h1>
                            <p className="text-gray-400 font-mono text-sm">
                                Real-time service health monitoring
                            </p>
                        </div>
                        <button
                            onClick={checkHealth}
                            disabled={isRefreshing}
                            className="p-3 border border-white/10 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </motion.div>

                {/* Overall Status Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`mb-8 p-6 rounded-xl border ${allOperational ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${allOperational ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                            {allOperational ? (
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                            )}
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${allOperational ? 'text-green-400' : 'text-yellow-400'}`}>
                                {allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Checking...'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Service List */}
                <div className="space-y-4">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className={`p-6 rounded-xl border backdrop-blur-sm ${getStatusBg(service.status)}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                        <service.icon className="w-6 h-6 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{service.name}</h3>
                                        <p className="text-gray-500 text-xs font-mono uppercase">
                                            {service.lastCheck ? `Checked ${new Date(service.lastCheck).toLocaleTimeString()}` : 'Pending...'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusBg(service.status)} ${getStatusColor(service.status)}`}>
                                    {getStatusIcon(service.status)}
                                    <span className="font-bold uppercase text-sm tracking-wider">
                                        {getStatusText(service.status)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center text-gray-500 text-sm font-mono"
                >
                    <p>Status updates every 30 seconds automatically</p>
                    <p className="mt-1">For support, visit our <Link to="/support" className="text-cyan-400 hover:underline">ticket system</Link></p>
                </motion.div>
            </div>
        </div>
    );
};

export default SystemStatus;
