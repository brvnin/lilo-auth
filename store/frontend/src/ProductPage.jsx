import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, X, Shield, Zap, Crosshair, ChevronRight, ChevronLeft,
    Star, Cpu, Menu, CheckCircle, AlertTriangle, Search, Globe, Activity,
    Lock, Eye, Terminal, Ghost, Gamepad, Server, Code, Box, Layers, Target,
    MousePointer, Settings, RefreshCw, Play
} from 'lucide-react';
import axios from 'axios';

const ProductPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useOutletContext();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeMedia, setActiveMedia] = useState(0);
    const [selectedPlan, setSelectedPlan] = useState(null); // Will be set based on available plans
    const [activeFeatureTab, setActiveFeatureTab] = useState(0); // For cheat menu style tabs

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await axios.get('/api/products');
                const found = res.data.find(p => p.id === parseInt(id));
                if (found) {
                    setProduct(found);
                    // Set default plan to first available
                    if (found.price_day) setSelectedPlan('day');
                    else if (found.price_week) setSelectedPlan('week');
                    else if (found.price_month) setSelectedPlan('month');
                    else if (found.price) setSelectedPlan('lifetime');
                } else {
                    navigate('/');
                }
            } catch (e) {
                console.error("Failed to fetch product", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Activity className="w-10 h-10 text-cyan-500 animate-spin" />
            </div>
        );
    }

    if (!product) return null;

    // Build media gallery (images first, then video)
    let galleryMedia = [];

    if (product.gallery_images && product.gallery_images.length > 0) {
        galleryMedia = product.gallery_images.map(url => ({ type: 'image', url }));
    } else if (product.image_url) {
        galleryMedia = [{ type: 'image', url: product.image_url }];
    } else {
        galleryMedia = [{ type: 'image', url: "https://via.placeholder.com/800x450?text=No+Image" }];
    }

    // Add video if available
    if (product.video_url) {
        galleryMedia.push({ type: 'video', url: product.video_url });
    }

    const currentMedia = galleryMedia[activeMedia];
    const firstImageUrl = galleryMedia.find(m => m.type === 'image')?.url;

    // Get available plans
    const availablePlans = [];
    if (product.price_day) availablePlans.push({ key: 'day', label: 'DAY', price: product.price_day });
    if (product.price_week) availablePlans.push({ key: 'week', label: 'WEEK', price: product.price_week });
    if (product.price_15days) availablePlans.push({ key: '15days', label: '15 DAYS', price: product.price_15days });
    if (product.price_month) availablePlans.push({ key: 'month', label: 'MONTH', price: product.price_month });
    if (product.price) availablePlans.push({ key: 'lifetime', label: 'LIFETIME', price: product.price });

    const getPrice = () => {
        const plan = availablePlans.find(p => p.key === selectedPlan);
        return plan ? plan.price : (availablePlans[0]?.price || 0);
    };

    const getPlanLabel = () => {
        const plan = availablePlans.find(p => p.key === selectedPlan);
        return plan ? plan.label : (availablePlans[0]?.label || '');
    };

    const handleAddToCart = () => {
        addToCart({
            ...product,
            price: getPrice(),
            selectedPlan,
            title: `${product.title} (${getPlanLabel()})`
        });
    };

    const highlights = product.highlights && product.highlights.length > 0 ? product.highlights : product.features.slice(0, 4);

    // Split features into 3 columns
    const features = product.features || [];
    const columnCount = 3;
    const itemsPerColumn = Math.ceil(features.length / columnCount);
    const featureColumns = [];
    for (let i = 0; i < columnCount; i++) {
        featureColumns.push(features.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
    }

    return (
        <div className="min-h-screen bg-zinc-950 pt-24 pb-20 relative z-10">
            {/* Background Effects - Cyan theme */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Arsenal
                </button>

                {/* Main Product Section - Full Width */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">

                    {/* Left: Media Gallery */}
                    <div className="space-y-4">
                        {/* Main Display */}
                        <div className="aspect-video w-full bg-black/50 rounded-2xl overflow-hidden border border-white/10 relative group">
                            {currentMedia.type === 'video' ? (
                                <video
                                    src={currentMedia.url}
                                    controls
                                    className="w-full h-full object-contain"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div
                                    className="w-full h-full cursor-zoom-in overflow-hidden"
                                    onClick={() => window.open(currentMedia.url, '_blank')}
                                    onMouseMove={(e) => {
                                        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                                        const x = ((e.clientX - left) / width) * 100;
                                        const y = ((e.clientY - top) / height) * 100;
                                        e.currentTarget.style.setProperty('--x', `${x}%`);
                                        e.currentTarget.style.setProperty('--y', `${y}%`);
                                    }}
                                >
                                    <img
                                        src={currentMedia.url}
                                        alt={product.title}
                                        className="w-full h-full object-contain transition-transform duration-200 hover:scale-[1.8]"
                                        style={{
                                            transformOrigin: 'var(--x, 50%) var(--y, 50%)'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {galleryMedia.map((media, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveMedia(idx)}
                                    className={`relative flex-shrink-0 w-24 h-16 rounded-lg border overflow-hidden transition-all ${activeMedia === idx
                                        ? 'border-cyan-500 ring-2 ring-cyan-500/50'
                                        : 'border-white/10 hover:border-white/30 opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    {media.type === 'video' ? (
                                        <div className="w-full h-full bg-black flex items-center justify-center relative">
                                            <video
                                                src={media.url}
                                                className="absolute inset-0 w-full h-full object-cover opacity-70"
                                                muted
                                                preload="metadata"
                                            />
                                            <Play className="w-6 h-6 text-cyan-400 relative z-10" />
                                        </div>
                                    ) : (
                                        <img src={media.url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="flex flex-col">
                        {/* Title & Status */}
                        <div className="mb-6">
                            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tight mb-3">
                                {product.title}
                            </h1>
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`px-3 py-1 rounded text-xs font-bold uppercase border ${product.status === 'Undetected'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                    : product.status === 'Updating'
                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                    }`}>
                                    {product.status}
                                </span>
                                {product.version && (
                                    <span className="text-gray-500 text-xs font-mono">{product.version}</span>
                                )}
                                {product.hwid_spoofer && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                        HWID Spoofer
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-400 leading-relaxed">
                                {product.subtitle || "Experience the ultimate advantage with our premium external enhancement suite. Engineered for performance and security."}
                            </p>
                        </div>

                        {/* Highlights */}
                        <div className="mb-8 bg-white/5 rounded-xl p-6 border border-white/5 backdrop-blur-sm">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-cyan-400" /> Software Highlights
                            </h3>
                            <ul className="space-y-3">
                                {highlights.map((feat, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                        <div className="mt-1.5 w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                                        {feat}
                                    </li>
                                ))}
                                <li className="flex items-start gap-3 text-sm text-gray-300">
                                    <div className="mt-1.5 w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                                    24/7 Priority Support
                                </li>
                            </ul>
                        </div>

                        {/* Pricing & Purchase */}
                        <div className="mt-auto">
                            <div className="flex items-end justify-between mb-4">
                                <div>
                                    <span className="text-4xl font-bold text-white">${getPrice()}</span>
                                    <span className="text-gray-500 text-sm ml-2">/ {getPlanLabel()}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Instant Delivery</div>
                                </div>
                            </div>

                            {/* Purchase Button - Cyan theme */}
                            <button
                                onClick={handleAddToCart}
                                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                Purchase Now <ShoppingCart className="w-5 h-5" />
                            </button>

                            {/* Plan Selection - Only show available plans */}
                            {availablePlans.length > 0 && (
                                <div className={`mt-4 grid gap-2`} style={{ gridTemplateColumns: `repeat(${availablePlans.length}, 1fr)` }}>
                                    {availablePlans.map(plan => (
                                        <button
                                            key={plan.key}
                                            onClick={() => setSelectedPlan(plan.key)}
                                            className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${selectedPlan === plan.key
                                                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-cyan-500'
                                                : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
                                                }`}
                                        >
                                            {plan.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Features Section - Cheat Menu Style with Tabs */}
                {(product.feature_categories && product.feature_categories.length > 0) ? (
                    <div className="border-t border-white/10 pt-16">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Features</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        </div>

                        {/* Cheat Menu Container */}
                        <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden max-w-4xl mx-auto">
                            {/* Tab Bar */}
                            <div className="flex border-b border-white/10 bg-black/40">
                                {product.feature_categories.map((cat, idx) => {
                                    const IconComponent = cat.icon === 'crosshair' ? Crosshair :
                                        cat.icon === 'user' ? Ghost :
                                            cat.icon === 'settings' ? Settings :
                                                cat.icon === 'eye' ? Eye :
                                                    cat.icon === 'shield' ? Shield :
                                                        cat.icon === 'target' ? Target : Zap;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveFeatureTab(idx)}
                                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${activeFeatureTab === idx
                                                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <IconComponent className="w-4 h-4" />
                                            {cat.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Features Content */}
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                                    {(product.feature_categories[activeFeatureTab]?.features || []).map((feat, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded border-2 border-cyan-500 bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                                <div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
                                            </div>
                                            <span className="text-cyan-300 font-medium">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : features.length > 0 && (
                    <div className="border-t border-white/10 pt-16">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Key Features</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        </div>

                        {/* Legacy 3 Column Vertical List */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-4">
                            {featureColumns.map((column, colIdx) => (
                                <div key={colIdx} className="space-y-4">
                                    {column.map((feat, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all"
                                        >
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                                            <span className="text-white">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Extra Info Row - Only show if data exists */}
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                        <Shield className={`w-6 h-6 mx-auto mb-2 ${product.hwid_spoofer ? 'text-green-400' : 'text-gray-500'}`} />
                        <div className="text-sm text-white font-medium">HWID Spoofer</div>
                        <div className={`text-xs ${product.hwid_spoofer ? 'text-green-400' : 'text-gray-500'}`}>
                            {product.hwid_spoofer ? 'Included' : 'Not Included'}
                        </div>
                    </div>
                    {product.uptime && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                            <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                            <div className="text-sm text-white font-medium">Uptime</div>
                            <div className="text-xs text-gray-500">{product.uptime}</div>
                        </div>
                    )}
                    {product.ban_rate && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                            <Lock className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                            <div className="text-sm text-white font-medium">Ban Rate</div>
                            <div className="text-xs text-gray-500">{product.ban_rate}</div>
                        </div>
                    )}
                    {product.server_status && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                            <Server className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                            <div className="text-sm text-white font-medium">Server</div>
                            <div className="text-xs text-gray-500">{product.server_status}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductPage;
