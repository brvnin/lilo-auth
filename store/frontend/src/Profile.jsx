import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, ShoppingBag, LogOut, ArrowLeft, Package, Clock } from 'lucide-react';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const statusRes = await axios.get('/api/auth/status');
            if (!statusRes.data.authenticated) {
                navigate('/login');
                return;
            }

            setUser(statusRes.data);

            // Load purchase history
            const purchasesRes = await axios.get('/api/purchases');
            setPurchases(purchasesRes.data.purchases || []);
        } catch (err) {
            console.error('Failed to load profile:', err);
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            window.location.href = '/';
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-cyan-400 text-xl font-mono">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <h1 className="text-4xl font-black text-white mb-2 font-rajdhani uppercase tracking-wider">Your Profile</h1>
                    <p className="text-gray-400">Manage your account and view your purchase history</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Account Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-1"
                    >
                        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-6">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/30">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
                                    {user?.is_admin && (
                                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider shadow-lg">
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {user?.email}
                                </p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                                    <div className="flex items-center gap-3 text-gray-400 text-sm mb-2">
                                        <Calendar className="w-4 h-4 text-cyan-400" />
                                        <span>Member Since</span>
                                    </div>
                                    <p className="text-white font-semibold ml-7">{formatDate(user?.created_at)}</p>
                                </div>

                                <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                                    <div className="flex items-center gap-3 text-gray-400 text-sm mb-2">
                                        <ShoppingBag className="w-4 h-4 text-cyan-400" />
                                        <span>Total Purchases</span>
                                    </div>
                                    <p className="text-white font-semibold ml-7">{purchases.length}</p>
                                </div>
                            </div>

                            {user?.is_admin && (
                                <Link
                                    to="/admin"
                                    className="w-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 font-bold py-3 rounded transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm mb-4"
                                >
                                    <Package className="w-4 h-4" />
                                    Admin Panel
                                </Link>
                            )}

                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-bold py-3 rounded transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </motion.div>

                    {/* Purchase History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2"
                    >
                        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white font-rajdhani uppercase tracking-wider">Purchase History</h2>
                                <Package className="w-6 h-6 text-cyan-400" />
                            </div>

                            {purchases.length === 0 ? (
                                <div className="text-center py-12">
                                    <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 mb-4">No purchases yet</p>
                                    <Link
                                        to="/"
                                        className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-3 rounded transition-all uppercase tracking-wider text-sm"
                                    >
                                        Browse Products
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {purchases.map((purchase) => (
                                        <motion.div
                                            key={purchase.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-black/30 border border-white/5 rounded-lg p-4 hover:border-cyan-500/30 transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white mb-1">{purchase.product_name}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDate(purchase.purchase_date)}
                                                        </span>
                                                        <span className="text-cyan-400 font-mono">${purchase.price}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-green-500/10 border border-green-500/30 px-3 py-1 rounded text-green-400 text-xs font-semibold uppercase">
                                                    Completed
                                                </div>
                                            </div>

                                            {purchase.license_key && (
                                                <div className="bg-zinc-800/50 border border-cyan-500/20 rounded p-3 mt-3">
                                                    <p className="text-xs text-gray-400 mb-1">License Key</p>
                                                    <code className="text-cyan-400 font-mono text-sm break-all">{purchase.license_key}</code>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
