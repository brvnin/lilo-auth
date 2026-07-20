import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Lock, Plus, Trash2, Edit2, Save, X, LogOut, Upload, Package, MessageSquare,
    LayoutDashboard, Settings, Users, ShoppingCart, TrendingUp, AlertCircle,
    ChevronRight, Search, Bell, Menu, Eye, DollarSign, Activity, Download, HardDrive, CheckCircle
} from 'lucide-react';
import AdminTickets from './AdminTickets';


// Form Field Component - MUST be outside AdminPanel to prevent re-creation on each render
const FormField = ({ label, children }) => (
    <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">{label}</label>
        {children}
    </div>
);

const AdminPanel = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [products, setProducts] = useState([]);
    const [isEditing, setIsEditing] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [error, setError] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [ipAllowed, setIpAllowed] = useState(null); // null = checking, true = allowed, false = blocked
    const [stats, setStats] = useState({
        totalProducts: 0,
        activeProducts: 0,
        totalRevenue: 0,
        totalRevenue: 0,
        pendingTickets: 0,
        pendingOrders: 0
    });

    // Orders State
    const [orders, setOrders] = useState([]);

    // Check IP whitelist on load
    useEffect(() => {
        checkIpWhitelist();
    }, []);

    // Check auth on load
    useEffect(() => {
        if (ipAllowed) {
            checkAuth();
        }
    }, [ipAllowed]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchProducts();
            fetchStats();
            if (activeTab === 'orders') fetchOrders();
        }
    }, [isAuthenticated, activeTab]);

    const checkIpWhitelist = async () => {
        try {
            const res = await axios.get('/api/admin/ip-check');
            // Only returns is_ip_allowed for security (no IP info exposed)
            setIpAllowed(res.data.is_ip_allowed);
        } catch (e) {
            // If the request fails, assume IP is not allowed (safer default)
            setIpAllowed(false);
        }
    };

    const checkAuth = async () => {
        try {
            await axios.get('/api/admin/check');
            setIsAuthenticated(true);
        } catch (e) {
            setIsAuthenticated(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            setProducts(res.data);
            setStats(prev => ({
                ...prev,
                totalProducts: res.data.length,
                activeProducts: res.data.filter(p => p.status === 'Undetected').length
            }));
        } catch (e) {
            console.error("Failed to fetch products");
        }
    };



    const fetchOrders = async () => {
        try {
            const res = await axios.get('/api/admin/orders');
            setOrders(res.data);
        } catch (e) {
            console.error("Failed to fetch orders");
        }
    };

    const handleApproveOrder = async (orderId) => {
        if (!window.confirm("Approve this order and send keys?")) return;
        try {
            await axios.post(`/api/admin/orders/${orderId}/approve`);
            alert("Order approved!");
            fetchOrders();
            fetchStats();
        } catch (e) {
            alert(e.response?.data?.error || "Failed to approve");
        }
    };

    const handleRejectOrder = async (orderId) => {
        if (!window.confirm("Reject this order?")) return;
        try {
            await axios.post(`/api/admin/orders/${orderId}/reject`);
            fetchOrders();
        } catch (e) {
            alert("Failed to reject");
        }
    };

    const fetchStats = async () => {
        try {
            const [ticketRes, productRes, orderRes] = await Promise.all([
                axios.get('/api/admin/tickets'),
                axios.get('/api/products'),
                axios.get('/api/admin/orders?status=verification_pending')
            ]);

            setStats(prev => ({
                ...prev,
                pendingTickets: ticketRes.data.tickets?.filter(t => t.status === 'Open').length || 0,
                pendingOrders: orderRes.data.length || 0,
                totalProducts: productRes.data.length
            }));
        } catch (e) {
            console.error("Failed to fetch stats");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/login', { username, password });
            setIsAuthenticated(true);
            setError('');
        } catch (e) {
            setError('Invalid credentials');
        }
    };

    const handleLogout = async () => {
        await axios.post('/api/admin/logout');
        setIsAuthenticated(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        await axios.delete(`/api/admin/products/${id}`);
        fetchProducts();
    };

    const handleSmartImport = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n');
        const newCategories = [];
        let currentCategory = null;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // If line is all uppercase and no spaces/symbols, treat as category title
            // OR if it's a known header like "ESP", "AIMBOT", etc.
            const isHeader = /^[A-Z\s]{3,}$/.test(trimmedLine);

            if (isHeader) {
                const icon = trimmedLine.includes('AIMBOT') ? 'crosshair' :
                    trimmedLine.includes('ESP') ? 'eye' :
                        trimmedLine.includes('RADAR') ? 'globe' :
                            trimmedLine.includes('MISC') ? 'zap' :
                                trimmedLine.includes('SETTINGS') ? 'settings' : 'zap';

                currentCategory = {
                    name: trimmedLine,
                    icon: icon,
                    features: []
                };
                newCategories.push(currentCategory);
            } else if (currentCategory) {
                currentCategory.features.push(trimmedLine);
            }
        });

        if (newCategories.length > 0) {
            setEditForm({
                ...editForm,
                feature_categories: [...(editForm.feature_categories || []), ...newCategories]
            });
            setImportText('');
            setIsImportModalOpen(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...editForm,
                features: typeof editForm.features === 'string' ? editForm.features.split(/[\r\n,]+/).map(f => f.trim()).filter(f => f) : editForm.features,
                highlights: typeof editForm.highlights === 'string' ? editForm.highlights.split(/[\r\n,]+/).map(f => f.trim()).filter(f => f) : editForm.highlights,
                gallery_images: editForm.gallery_images || [],
                video_url: editForm.video_url || ''
            };

            if (editForm.id) {
                await axios.put(`/api/admin/products/${editForm.id}`, payload);
            } else {
                await axios.post('/api/admin/products', payload);
            }
            setIsEditing(null);
            fetchProducts();
        } catch (e) {
            alert('Failed to save');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEditForm({ ...editForm, image_url: res.data.url });
        } catch (err) {
            console.error('Upload failed', err);
            alert('Image upload failed');
        }
    };

    const handleGalleryImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        try {
            const uploadPromises = files.map(file => {
                const formData = new FormData();
                formData.append('file', file);
                return axios.post('/api/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            });

            const responses = await Promise.all(uploadPromises);
            const newUrls = responses.map(res => res.data.url);
            const currentGallery = editForm.gallery_images || [];

            setEditForm({ ...editForm, gallery_images: [...currentGallery, ...newUrls] });
        } catch (err) {
            console.error('Gallery upload failed', err);
            alert('Gallery image upload failed');
        }
    };

    const handleRemoveGalleryImage = (index) => {
        const newGallery = [...(editForm.gallery_images || [])];
        newGallery.splice(index, 1);
        setEditForm({ ...editForm, gallery_images: newGallery });
    };

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEditForm({ ...editForm, video_url: res.data.url });
        } catch (err) {
            console.error('Video upload failed', err);
            alert('Video upload failed');
        }
    };

    // Navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'loader', label: 'Loader', icon: HardDrive },
        { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: stats.pendingOrders },
        { id: 'tickets', label: 'Tickets', icon: MessageSquare, badge: stats.pendingTickets },
    ];

    // IP Blocked Screen
    if (ipAllowed === false) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[128px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="w-full max-w-md relative">
                    {/* Glass Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-red-500/30 p-8 rounded-3xl shadow-2xl border-2">
                        <div className="flex justify-center mb-8">
                            <div className="p-4 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl shadow-lg shadow-red-500/25">
                                <AlertCircle className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white text-center mb-2">Access Denied</h2>
                        <p className="text-gray-300 text-center mb-4">Your IP address is not whitelisted for admin access.</p>
                        <p className="text-gray-400 text-center text-sm">Please contact the administrator if you believe this is an error.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading Screen
    if (ipAllowed === null) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="w-full max-w-md relative">
                    {/* Glass Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl">
                        <div className="flex justify-center mb-8">
                            <div className="p-4 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/25 animate-spin">
                                <Activity className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white text-center mb-2">Verifying Access</h2>
                        <p className="text-gray-400 text-center mb-8">Checking your IP address...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="w-full max-w-md relative">
                    {/* Glass Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl">
                        <div className="flex justify-center mb-8">
                            <div className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg shadow-purple-500/25">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white text-center mb-2">Admin Access</h2>
                        <p className="text-gray-400 text-center mb-8">Sign in to manage your store</p>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                    placeholder="Enter username"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/25"
                            >
                                Sign In
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard View
    const DashboardView = () => (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Products"
                    value={stats.totalProducts}
                    icon={Package}
                    color="purple"
                    trend="+12%"
                />
                <StatCard
                    title="Active Products"
                    value={stats.activeProducts}
                    icon={Activity}
                    color="green"
                    trend="Undetected"
                />
                <StatCard
                    title="Open Tickets"
                    value={stats.pendingTickets}
                    icon={MessageSquare}
                    color="yellow"
                    trend="Pending"
                />
                <StatCard
                    title="Total Revenue"
                    value="$---"
                    icon={DollarSign}
                    color="blue"
                    trend="Coming soon"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-400" />
                        Recent Products
                    </h3>
                    <div className="space-y-3">
                        {products.slice(0, 5).map(product => (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${product.accent || 'from-purple-600 to-blue-600'}`} />
                                    <div>
                                        <div className="font-medium text-white">{product.title}</div>
                                        <div className="text-sm text-gray-400">{product.game}</div>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${product.status === 'Undetected' ? 'bg-green-500/20 text-green-400' :
                                    product.status === 'Updating' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                    {product.status}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setActiveTab('products')}
                        className="w-full mt-4 py-3 text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center justify-center gap-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        View All Products <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => {
                                setActiveTab('products');
                                setEditForm({
                                    title: '', game: '', price: 0, category: 'FPS',
                                    status: 'Undetected', features: '', highlights: '',
                                    price_day: 0, price_week: 0, price_month: 0,
                                    gallery_images: [], video_url: '',
                                    color: '#a855f7', accent: 'from-purple-600 to-blue-600',
                                    loader_product_id: 0
                                });
                                setIsEditing(true);
                            }}
                            className="p-4 bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-all group"
                        >
                            <Plus className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                            <div className="text-white font-medium">Add Product</div>
                            <div className="text-xs text-gray-400">Create new listing</div>
                        </button>
                        <button
                            onClick={() => setActiveTab('tickets')}
                            className="p-4 bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all group"
                        >
                            <MessageSquare className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <div className="text-white font-medium">View Tickets</div>
                            <div className="text-xs text-gray-400">{stats.pendingTickets} pending</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Stat Card Component
    const StatCard = ({ title, value, icon: Icon, color, trend }) => {
        const colors = {
            purple: 'from-purple-600 to-purple-800 shadow-purple-500/20',
            green: 'from-green-600 to-green-800 shadow-green-500/20',
            yellow: 'from-yellow-600 to-yellow-800 shadow-yellow-500/20',
            blue: 'from-blue-600 to-blue-800 shadow-blue-500/20',
        };

        return (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">{title}</p>
                        <p className="text-3xl font-bold text-white">{value}</p>
                        <p className="text-xs text-gray-500 mt-2">{trend}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>
        );
    };

    // Loader View
    const LoaderView = () => {
        const [loaders, setLoaders] = useState([]);
        const [uploading, setUploading] = useState(false);
        const [version, setVersion] = useState('');
        const [selectedFile, setSelectedFile] = useState(null);

        useEffect(() => {
            fetchLoaders();
        }, []);

        const fetchLoaders = async () => {
            try {
                const res = await axios.get('/api/admin/loaders');
                setLoaders(res.data);
            } catch (e) {
                console.error('Failed to fetch loaders', e);
            }
        };

        const handleUpload = async () => {
            if (!selectedFile || !version) {
                setError('Please select a file and enter version');
                return;
            }

            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('version', version);

                await axios.post('/api/admin/loader', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                setSelectedFile(null);
                setVersion('');
                fetchLoaders();
            } catch (e) {
                console.error('Failed to upload loader', e);
                setError('Failed to upload loader');
            }
            setUploading(false);
        };

        const handleDelete = async (id) => {
            if (!window.confirm('Delete this loader version?')) return;
            try {
                await axios.delete(`/api/admin/loader/${id}`);
                fetchLoaders();
            } catch (e) {
                console.error('Failed to delete loader', e);
            }
        };

        const handleActivate = async (id) => {
            try {
                await axios.post(`/api/admin/loader/${id}/activate`);
                fetchLoaders();
            } catch (e) {
                console.error('Failed to activate loader', e);
            }
        };

        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        return (
            <div className="space-y-8">
                {/* Upload Section */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-purple-400" />
                        Upload New Loader
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Loader File</label>
                            <input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer hover:file:bg-purple-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Version</label>
                            <input
                                type="text"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                placeholder="v1.0.0"
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !selectedFile || !version}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>Uploading...</>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload Loader
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {selectedFile && (
                        <p className="text-sm text-gray-400 mt-3">
                            Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                        </p>
                    )}
                </div>

                {/* Loaders List */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-cyan-400" />
                            Uploaded Loaders
                        </h2>
                    </div>

                    {loaders.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            No loaders uploaded yet. Upload your first loader above.
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-black/20">
                                <tr className="text-left text-sm text-gray-400">
                                    <th className="p-4">Filename</th>
                                    <th className="p-4">Version</th>
                                    <th className="p-4">Size</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Uploaded</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loaders.map(loader => (
                                    <tr key={loader.id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="p-4 text-white font-mono">{loader.filename}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                                                {loader.version}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400">{formatBytes(loader.size)}</td>
                                        <td className="p-4">
                                            {loader.is_active ? (
                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm flex items-center gap-1 w-fit">
                                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-sm">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            {new Date(loader.uploaded_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {!loader.is_active && (
                                                    <button
                                                        onClick={() => handleActivate(loader.id)}
                                                        className="p-2 hover:bg-green-500/20 rounded-lg text-green-400 transition-colors"
                                                        title="Set as Active"
                                                    >
                                                        <Activity className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <a
                                                    href="/api/loader/download"
                                                    className="p-2 hover:bg-cyan-500/20 rounded-lg text-cyan-400 transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(loader.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    };

    // Orders View
    const OrdersView = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Orders</h2>
                    <p className="text-gray-400 text-sm">{orders.length} total orders</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchOrders()} className="p-2 hover:bg-white/10 rounded-lg text-white">
                        <Activity className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black/20 text-gray-400 text-sm uppercase">
                        <tr>
                            <th className="p-4 font-medium">ID</th>
                            <th className="p-4 font-medium">User/Email</th>
                            <th className="p-4 font-medium">Amount</th>
                            <th className="p-4 font-medium">Method</th>
                            <th className="p-4 font-medium">Proof</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-white font-mono">#{order.id}</td>
                                <td className="p-4 text-gray-300">
                                    <div className="text-white">{order.email}</div>
                                    <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</div>
                                </td>
                                <td className="p-4 text-green-400 font-bold">${order.total}</td>
                                <td className="p-4 text-gray-400 capitalize">{order.payment_method?.replace('_', ' ')}</td>
                                <td className="p-4">
                                    {order.proof_data ? (
                                        <div className="max-w-[200px] break-all">
                                            <div className="text-xs text-cyan-400 font-mono mb-1 uppercase">{order.proof_type}</div>
                                            <div className="text-gray-300 text-xs font-mono bg-black/30 p-1.5 rounded select-all">
                                                {order.proof_data}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-600 italic">No proof</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                        order.status === 'verification_pending' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
                                            order.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {order.status === 'verification_pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApproveOrder(order.id)}
                                                    className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                                    title="Approve & Send Keys"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleRejectOrder(order.id)}
                                                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                    title="Reject"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-gray-500">No orders found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Products View
    const ProductsView = () => (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Product List */}
            <div className={`${isEditing ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-6`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Products</h2>
                        <p className="text-gray-400 text-sm">{products.length} total products</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditForm({
                                title: '', game: '', price: 0, category: 'FPS',
                                status: 'Undetected', features: '', highlights: '',
                                price_day: 0, price_week: 0, price_month: 0,
                                gallery_images: [], video_url: '',
                                color: '#a855f7', accent: 'from-purple-600 to-blue-600',
                                loader_product_id: 0
                            });
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 rounded-xl text-sm font-bold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25 transform hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Product
                    </button>
                </div>

                <div className="grid gap-4">
                    {products.map(p => (
                        <div
                            key={p.id}
                            className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-purple-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.accent || 'from-purple-600 to-blue-600'} shadow-lg`} />
                                <div>
                                    <div className="font-bold text-white text-lg">{p.title}</div>
                                    <div className="text-sm text-gray-400 flex items-center gap-3">
                                        <span>{p.game}</span>
                                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                        <span className="text-purple-400">${p.price}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${p.status === 'Undetected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    p.status === 'Updating' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                        'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}>
                                    {p.status}
                                </span>
                                <button
                                    onClick={() => {
                                        setEditForm({
                                            ...p,
                                            features: Array.isArray(p.features) ? p.features.join('\n') : p.features,
                                            highlights: Array.isArray(p.highlights) ? p.highlights.join('\n') : p.highlights
                                        });
                                        setIsEditing(true);
                                    }}
                                    className="p-2.5 hover:bg-blue-500/20 rounded-xl text-blue-400 border border-transparent hover:border-blue-500/30 transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    className="p-2.5 hover:bg-red-500/20 rounded-xl text-red-400 border border-transparent hover:border-red-500/30 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Form */}
            {isEditing && (
                <div className="xl:col-span-1">
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl sticky top-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editForm.id ? 'Edit Product' : 'New Product'}</h3>
                            <button
                                onClick={() => setIsEditing(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                            <FormField label="Title">
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Game">
                                    <input
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.game}
                                        onChange={e => setEditForm({ ...editForm, game: e.target.value })}
                                    />
                                </FormField>
                                <FormField label="Price">
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.price}
                                        onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Loader Product ID">
                                <input
                                    type="number"
                                    className="w-full bg-black/50 border border-purple-500/30 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                    value={editForm.loader_product_id}
                                    onChange={e => setEditForm({ ...editForm, loader_product_id: parseInt(e.target.value) })}
                                    placeholder="ID from Loader DB"
                                />
                            </FormField>

                            <FormField label="Features (one per line - legacy)">
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white h-16 font-mono text-sm focus:border-purple-500 outline-none transition-colors resize-none"
                                    value={editForm.features}
                                    onChange={e => setEditForm({ ...editForm, features: e.target.value })}
                                    placeholder="Legacy simple features list..."
                                />
                            </FormField>

                            <FormField label="Highlights (one per line)">
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white h-16 font-mono text-sm focus:border-purple-500 outline-none transition-colors resize-none"
                                    value={editForm.highlights}
                                    onChange={e => setEditForm({ ...editForm, highlights: e.target.value })}
                                    placeholder="Key highlights shown on product page..."
                                />
                            </FormField>

                            {/* Feature Categories Editor - Cheat Menu Style */}
                            <div className="border border-purple-500/30 rounded-xl p-4 bg-black/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">Feature Tabs (Cheat Menu Style)</h4>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsImportModalOpen(true)}
                                            className="text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-2 py-1.5 rounded-lg border border-cyan-500/30 transition-colors flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Smart Import
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const cats = editForm.feature_categories || [];
                                                setEditForm({ ...editForm, feature_categories: [...cats, { name: 'New Tab', icon: 'zap', features: [] }] });
                                            }}
                                            className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/30 transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Add Tab
                                        </button>
                                    </div>
                                </div>

                                {(editForm.feature_categories || []).length === 0 ? (
                                    <div className="text-gray-500 text-sm text-center py-4">No feature tabs yet. Click "Add Tab" to create categories like Player, Aimbot, Settings.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {(editForm.feature_categories || []).map((cat, catIdx) => (
                                            <div key={catIdx} className="border border-white/10 rounded-lg p-3 bg-black/40">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                                        value={cat.name}
                                                        onChange={e => {
                                                            const cats = [...(editForm.feature_categories || [])];
                                                            cats[catIdx].name = e.target.value;
                                                            setEditForm({ ...editForm, feature_categories: cats });
                                                        }}
                                                        placeholder="Tab Name (e.g. Player, Aimbot)"
                                                    />
                                                    <select
                                                        className="bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                                        value={cat.icon || 'zap'}
                                                        onChange={e => {
                                                            const cats = [...(editForm.feature_categories || [])];
                                                            cats[catIdx].icon = e.target.value;
                                                            setEditForm({ ...editForm, feature_categories: cats });
                                                        }}
                                                    >
                                                        <option value="crosshair">Crosshair</option>
                                                        <option value="user">Ghost</option>
                                                        <option value="settings">Settings</option>
                                                        <option value="zap">Zap</option>
                                                        <option value="eye">Eye</option>
                                                        <option value="shield">Shield</option>
                                                        <option value="target">Target</option>
                                                        <option value="globe">Globe</option>
                                                        <option value="activity">Activity</option>
                                                        <option value="layers">Layers</option>
                                                        <option value="mouse-pointer">Mouse</option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const cats = [...(editForm.feature_categories || [])];
                                                            cats.splice(catIdx, 1);
                                                            setEditForm({ ...editForm, feature_categories: cats });
                                                        }}
                                                        className="text-red-400 hover:text-red-300 p-2"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Features list under this tab */}
                                                <div className="space-y-2 pl-2">
                                                    {(cat.features || []).map((feat, featIdx) => (
                                                        <div key={featIdx} className="flex items-center gap-2">
                                                            <div className="w-4 h-4 border border-cyan-500 rounded bg-cyan-500/20 flex items-center justify-center">
                                                                <div className="w-2 h-2 bg-cyan-400 rounded-sm" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                className="flex-1 bg-black/30 border border-white/5 rounded px-2 py-1 text-white text-sm focus:border-purple-500 outline-none"
                                                                value={feat}
                                                                onChange={e => {
                                                                    const cats = [...(editForm.feature_categories || [])];
                                                                    cats[catIdx].features[featIdx] = e.target.value;
                                                                    setEditForm({ ...editForm, feature_categories: cats });
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const cats = [...(editForm.feature_categories || [])];
                                                                    cats[catIdx].features.splice(featIdx, 1);
                                                                    setEditForm({ ...editForm, feature_categories: cats });
                                                                }}
                                                                className="text-red-400/50 hover:text-red-400 p-1"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const cats = [...(editForm.feature_categories || [])];
                                                            cats[catIdx].features = [...(cats[catIdx].features || []), 'New Feature'];
                                                            setEditForm({ ...editForm, feature_categories: cats });
                                                        }}
                                                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mt-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Feature
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                <FormField label="Day">
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.price_day || ''}
                                        onChange={e => setEditForm({ ...editForm, price_day: e.target.value })}
                                    />
                                </FormField>
                                <FormField label="Week">
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.price_week || ''}
                                        onChange={e => setEditForm({ ...editForm, price_week: e.target.value })}
                                    />
                                </FormField>
                                <FormField label="15 Days">
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.price_15days || ''}
                                        onChange={e => setEditForm({ ...editForm, price_15days: e.target.value })}
                                    />
                                </FormField>
                                <FormField label="Month">
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.price_month || ''}
                                        onChange={e => setEditForm({ ...editForm, price_month: e.target.value })}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Version">
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                    value={editForm.version || ''}
                                    onChange={e => setEditForm({ ...editForm, version: e.target.value })}
                                    placeholder="V1.0.0 STABLE"
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Status">
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option>Undetected</option>
                                        <option>Updating</option>
                                        <option>Risk</option>
                                    </select>
                                </FormField>
                                <FormField label="Accent">
                                    <input
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors text-sm"
                                        value={editForm.accent}
                                        onChange={e => setEditForm({ ...editForm, accent: e.target.value })}
                                        placeholder="from-purple-600 to..."
                                    />
                                </FormField>
                            </div>

                            <FormField label="Image">
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors text-sm"
                                        value={editForm.image_url || ''}
                                        onChange={e => setEditForm({ ...editForm, image_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                    <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl border border-white/10 flex items-center justify-center transition-colors">
                                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                        <Upload className="w-4 h-4" />
                                    </label>
                                </div>
                                {editForm.image_url && (
                                    <div className="mt-2 w-full h-32 bg-black/50 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                                        <img src={editForm.image_url} alt="Preview" className="h-full object-contain" />
                                    </div>
                                )}
                            </FormField>

                            <FormField label="Gallery Images">
                                <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl border border-white/10 flex items-center justify-center w-full transition-colors">
                                    <input type="file" className="hidden" onChange={handleGalleryImageUpload} accept="image/*" multiple />
                                    <Upload className="w-4 h-4 mr-2" /> Upload Gallery
                                </label>
                                {editForm.gallery_images && editForm.gallery_images.length > 0 && (
                                    <div className="mt-2 grid grid-cols-4 gap-2">
                                        {editForm.gallery_images.map((url, idx) => (
                                            <div key={idx} className="relative w-full h-16 bg-black/50 rounded-lg border border-white/10 overflow-hidden">
                                                <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleRemoveGalleryImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full hover:bg-red-600 flex items-center justify-center"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </FormField>

                            <FormField label="Video">
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors text-sm"
                                        value={editForm.video_url || ''}
                                        onChange={e => setEditForm({ ...editForm, video_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                    <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl border border-white/10 flex items-center justify-center transition-colors">
                                        <input type="file" className="hidden" onChange={handleVideoUpload} accept="video/*" />
                                        <Upload className="w-4 h-4" />
                                    </label>
                                </div>
                            </FormField>

                            <FormField label="Subtitle">
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                    value={editForm.subtitle || ''}
                                    onChange={e => setEditForm({ ...editForm, subtitle: e.target.value })}
                                    placeholder="e.g. DayZ Edition"
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Ban Rate">
                                    <input
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.ban_rate || ''}
                                        onChange={e => setEditForm({ ...editForm, ban_rate: e.target.value })}
                                        placeholder="0%"
                                    />
                                </FormField>
                                <FormField label="Uptime">
                                    <input
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.uptime || ''}
                                        onChange={e => setEditForm({ ...editForm, uptime: e.target.value })}
                                        placeholder="99.9%"
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Server Status">
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        value={editForm.server_status || 'Online'}
                                        onChange={e => setEditForm({ ...editForm, server_status: e.target.value })}
                                    >
                                        <option>Online</option>
                                        <option>Offline</option>
                                        <option>Maintenance</option>
                                    </select>
                                </FormField>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-white/20 bg-black/50 text-purple-500 focus:ring-purple-500"
                                            checked={editForm.hwid_spoofer !== false}
                                            onChange={e => setEditForm({ ...editForm, hwid_spoofer: e.target.checked })}
                                        />
                                        <span className="text-sm text-gray-300">HWID Spoofer</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <Save className="w-4 h-4" /> Save Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-[#0d0d12] border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white">Smart Feature Import</h3>
                                <p className="text-gray-400 text-sm">Paste a list with UPPERCASE headers to auto-generate tabs.</p>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <textarea
                            className="w-full h-80 bg-black/50 border border-white/10 rounded-2xl p-4 text-white font-mono text-sm focus:border-cyan-500 outline-none transition-all mb-6"
                            placeholder={"ESP\nPlayer ESP\nSkeleton ESP\n\nAIMBOT\nSilent Aim\nFOV Circle"}
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="flex-1 py-4 border border-white/10 rounded-2xl text-gray-400 font-bold hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSmartImport}
                                className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Perform Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            {/* Sidebar */}
            <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-black/40 border-r border-white/10 flex flex-col transition-all duration-300 fixed h-full z-50`}>
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/25">
                            Z
                        </div>
                        {!sidebarCollapsed && (
                            <div>
                                <div className="font-bold text-white">Zzenith</div>
                                <div className="text-xs text-gray-400">Admin Panel</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                                ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {!sidebarCollapsed && (
                                <>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.badge > 0 && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Collapse Button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
                {/* Top Bar */}
                <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/10 px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white capitalize">{activeTab}</h1>
                            <p className="text-sm text-gray-400">Welcome back, Admin</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors relative">
                                <Bell className="w-5 h-5" />
                                {stats.pendingTickets > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                        {stats.pendingTickets}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8">
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'products' && <ProductsView />}
                    {activeTab === 'orders' && <OrdersView />}
                    {activeTab === 'loader' && <LoaderView />}
                    {activeTab === 'tickets' && <AdminTickets />}
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
