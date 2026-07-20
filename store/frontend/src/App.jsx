import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion';
import {
    ShoppingCart, X, Shield, Zap, Crosshair, ChevronRight, ChevronLeft,
    Star, Cpu, Menu, CheckCircle, AlertTriangle, Search, Globe, Activity,
    Lock, Eye, Terminal, Ghost, Gamepad, Server, Code, User, MessageSquare, Download, Coins, CreditCard
} from 'lucide-react';
import AdminPanel from './AdminPanel';
import ManualCheckout from './ManualCheckout';
import ThreeBackground from './ThreeBackground';
import ProductPage from './ProductPage';
import Register from './Register';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Profile from './Profile';
import RefundPolicy from './RefundPolicy';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import Support from './Support';
import TicketDetail from './TicketDetail';
import SystemStatus from './SystemStatus';
import CheckoutSuccess from './CheckoutSuccess';
import CheckoutCancel from './CheckoutCancel';
import FAQ from './FAQ';

// --- RESTORED ORIGINAL DATA ---

const TESTIMONIALS = [
    { user: "ShadowReaper", text: "Undetected for 6 months straight. Best support.", game: "Apex" },
    { user: "KillaBee", text: "The recoil control is insanely human-like.", game: "Rust" },
    { user: "NoScopePro", text: "Setup took 2 minutes. Instant delivery.", game: "COD" },
    { user: "GlobalElite", text: "Ranked up to Global in 2 weeks. Safe.", game: "CS2" },
    { user: "TarkovRat", text: "Loot ESP is a game changer for profits.", game: "EFT" },
    { user: "VandalGod", text: "Triggerbot is faster than human reaction.", game: "Val" },
];

const LOGOS = [
    { name: "Apex Legends", icon: "https://media.contentapi.ea.com/content/dam/apex-legends/common/logos/apex-white-icon.svg" },
    { name: "Valorant", icon: "https://cdn.simpleicons.org/valorant/white" },
    { name: "Call of Duty", icon: "https://cdn.simpleicons.org/activision/white" },
    { name: "Rust", icon: "/logos/rust.png", className: "invert" },
    { name: "CS:GO 2", icon: "https://cdn.simpleicons.org/counterstrike/white" },
    { name: "Overwatch 2", icon: "/logos/overwatch2.png" },
    { name: "Fortnite", icon: "https://cdn.simpleicons.org/fortnite/white" },
    { name: "Rainbow Six", icon: "https://cdn.simpleicons.org/ubisoft/white" },
];

// --- UTILS ---
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

// --- VISUAL FX COMPONENTS ---

const NoiseOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <filter id="noiseFilter">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
    </div>
);

const SpotlightCard = ({ children, className = "", onClick, accentColor = "rgba(6,182,212,0.3)" }) => {
    const divRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = ({ currentTarget, clientX, clientY }) => {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onClick={onClick}
            className={cn(
                "relative group overflow-hidden rounded-xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm transition-colors duration-500 hover:border-white/20",
                className
            )}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                          650px circle at ${mouseX}px ${mouseY}px,
                          ${accentColor},
                          transparent 80%
                        )
                    `,
                }}
            />
            <div className="relative h-full">{children}</div>
        </div>
    );
};

const FadeInUp = ({ children, delay = 0, className = "" }) => (
    <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
);

const ScrollDissolveText = ({ text, className }) => {
    const { scrollY } = useScroll();
    const characters = text.split("");
    return (
        <div className={cn("flex flex-wrap justify-center", className)}>
            {characters.map((char, i) => {
                const step = 200 / characters.length;
                const start = i * step;
                const end = start + 100;
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const opacity = useTransform(scrollY, [start, end], [1, 0]);
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const y = useTransform(scrollY, [start, end], [0, -40]);
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const blur = useTransform(scrollY, [start, end], ["blur(0px)", "blur(12px)"]);
                return (
                    <motion.span key={i} style={{ opacity, y, filter: blur }} className="inline-block">
                        {char === " " ? "\u00A0" : char}
                    </motion.span>
                );
            })}
        </div>
    );
};

const InfiniteMarquee = ({ children, direction = 'left', speed = 30, className }) => (
    <div className={cn("flex overflow-hidden relative w-full select-none", className)}
        style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
        <div className="flex shrink-0 gap-16 items-center whitespace-nowrap animate-marquee">
            {children}
        </div>
        <div className="flex shrink-0 gap-16 items-center whitespace-nowrap animate-marquee" aria-hidden="true">
            {children}
        </div>
        <style jsx>{`
            .animate-marquee { animation: marquee-${direction} ${speed}s linear infinite; }
            @keyframes marquee-left { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        `}</style>
    </div>
);

// --- COMPLEX UI COMPONENTS ---

const FeaturedCarousel = ({ items, onSelect }) => {
    const [currIndex, setCurrIndex] = useState(0);

    const next = () => setCurrIndex((p) => (p + 1) % items.length);
    const prev = () => setCurrIndex((p) => (p - 1 + items.length) % items.length);

    useEffect(() => {
        if (items.length === 0) return;
        const timer = setInterval(next, 4000);
        return () => clearInterval(timer);
    }, [items.length]);

    if (items.length === 0) return <div className="text-white/50 animate-pulse font-mono p-10 border border-dashed border-white/20 rounded-lg">WAITING FOR SERVER RESPONSE...</div>;

    const getStyle = (index) => {
        let diff = (index - currIndex + items.length) % items.length;
        if (diff > items.length / 2) diff -= items.length;

        const isActive = diff === 0;
        const isLeft = diff === -1 || (currIndex === 0 && index === items.length - 1);
        const isRight = diff === 1 || (currIndex === items.length - 1 && index === 0);

        if (isActive) {
            return { zIndex: 20, opacity: 1, transform: 'translateX(0) scale(1) translateZ(0)', filter: 'blur(0px)' };
        } else if (isLeft) {
            return { zIndex: 10, opacity: 0.4, transform: 'translateX(-110%) scale(0.85) perspective(1000px) rotateY(30deg)', filter: 'blur(4px)' };
        } else if (isRight) {
            return { zIndex: 10, opacity: 0.4, transform: 'translateX(110%) scale(0.85) perspective(1000px) rotateY(-30deg)', filter: 'blur(4px)' };
        } else {
            return { zIndex: 0, opacity: 0, transform: 'translateX(0) scale(0)', display: 'none' };
        }
    };

    return (
        <div className="relative h-[450px] w-full max-w-5xl mx-auto flex items-center justify-center perspective-1000 mt-12">
            <button onClick={prev} className="absolute left-4 md:-left-12 z-30 p-3 bg-black/50 rounded-full hover:bg-cyan-500 hover:text-white text-gray-400 transition-all border border-white/10 backdrop-blur-md">
                <ChevronLeft />
            </button>

            <div className="relative w-full h-full flex items-center justify-center">
                {items.map((item, i) => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className="absolute w-[320px] sm:w-[380px] h-[480px] transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] cursor-pointer"
                        style={getStyle(i)}
                    >
                        <SpotlightCard className="h-full bg-zinc-950 border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                            <div className={`h-[55%] bg-gradient-to-br ${item.accent} p-6 relative overflow-hidden flex flex-col justify-end`}>

                                {item.image_url && (
                                    <img src={item.image_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                <h3 className="relative z-10 text-4xl font-black text-white italic tracking-tighter drop-shadow-lg font-rajdhani uppercase transform translate-y-2">{item.game}</h3>
                                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded border border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-mono text-green-400 uppercase tracking-widest">{item.status}</span>
                                </div>
                            </div>
                            <div className="p-6 flex flex-col justify-between h-[45%] bg-zinc-900/90 backdrop-blur-md relative">
                                <div className="absolute -top-8 right-6 w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                                    <Crosshair className="text-white w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold text-white mb-1 font-rajdhani uppercase tracking-wide">{item.title}</h4>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">{item.category} / Private Build</p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.features.slice(0, 3).map((f, idx) => (
                                            <span key={idx} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded text-gray-400">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center border-t border-white/5 pt-4">
                                    <span className="text-3xl font-bold text-white font-rajdhani">${item.price_day || item.price_week || item.price_15days || item.price_month || item.price}</span>
                                    <span className="text-xs text-cyan-400 font-mono flex items-center gap-1 group-hover:gap-2 transition-all">
                                        INITIALIZE <ChevronRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>
                ))}
            </div>

            <button onClick={next} className="absolute right-4 md:-right-12 z-30 p-3 bg-black/50 rounded-full hover:bg-cyan-500 hover:text-white text-gray-400 transition-all border border-white/10 backdrop-blur-md">
                <ChevronRight />
            </button>
        </div>
    );
};

const Navbar = ({ cartCount, setIsCartOpen }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
                "fixed top-0 w-full z-50 transition-all duration-300 border-b",
                scrolled ? "bg-black/80 backdrop-blur-xl border-white/10 py-2" : "bg-transparent border-transparent py-6"
            )}
        >
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer group">
                        {/* RESTORED LOGO PATH */}
                        <img src="/logo.png" alt="Zzenith Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                        <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-tighter text-white font-rajdhani leading-none">ZZENITH</span>
                            <span className="text-[9px] tracking-[0.4em] text-cyan-400 uppercase font-mono group-hover:text-white transition-colors">Systems</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-12">
                        <a href="#shop" onClick={(e) => { e.preventDefault(); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }} className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors group uppercase tracking-widest font-rajdhani cursor-pointer">
                            Products
                            <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-cyan-500 transition-all duration-300 group-hover:w-full box-shadow-[0_0_10px_cyan]" />
                        </a>
                        <Link to="/status" className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors group uppercase tracking-widest font-rajdhani">
                            Status
                            <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-cyan-500 transition-all duration-300 group-hover:w-full box-shadow-[0_0_10px_cyan]" />
                        </Link>
                        <a href="https://discord.gg/pwQRVv25qX" target="_blank" rel="noopener noreferrer" className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors group uppercase tracking-widest font-rajdhani">
                            Discord
                            <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-cyan-500 transition-all duration-300 group-hover:w-full box-shadow-[0_0_10px_cyan]" />
                        </a>
                        <Link to="/faq" className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors group uppercase tracking-widest font-rajdhani">
                            FAQ
                            <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-cyan-500 transition-all duration-300 group-hover:w-full box-shadow-[0_0_10px_cyan]" />
                        </Link>
                        <Link to="/support" className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors group uppercase tracking-widest font-rajdhani">
                            Support
                            <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-cyan-500 transition-all duration-300 group-hover:w-full box-shadow-[0_0_10px_cyan]" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-mono text-gray-400 hover:text-white transition-colors border-r border-white/10 pr-6">
                            <Globe className="w-3 h-3" /> EN / USD
                        </button>

                        <a
                            href="/api/loader/download"
                            className="group relative p-3 border border-white/10 rounded-lg hover:bg-white/5 transition-all hover:border-cyan-500/50"
                            title="Download Loader"
                        >
                            <Download className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" />
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Download Loader
                            </span>
                        </a>

                        <Link
                            to="/profile"
                            className="group relative p-3 border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                        >
                            <User className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" />
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Account
                            </span>
                        </Link>

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative group p-3 border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                        >
                            <ShoppingCart className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-black text-[10px] font-bold flex items-center justify-center rounded shadow-lg shadow-cyan-500/50">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </motion.nav>
    );
};

const Hero = ({ onProductSelect, products }) => {
    const { scrollY } = useScroll();
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);
    const scale = useTransform(scrollY, [0, 300], [1, 0.95]);

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-20 overflow-hidden">
            <motion.div style={{ opacity, scale }} className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
                <FadeInUp delay={0.1} className="flex justify-center">
                    <div className="mb-8 inline-flex items-center gap-3 px-4 py-1.5 bg-green-950/30 backdrop-blur-md rounded border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-green-400 uppercase font-mono">Status: Undetected (V3.1.0)</span>
                    </div>
                </FadeInUp>

                <div className="min-h-[120px] sm:h-40 md:h-52 flex items-center justify-center mb-2 relative">
                    <ScrollDissolveText
                        text="UNFAIR ADVANTAGE"
                        className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mix-blend-overlay font-rajdhani"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent blur-3xl -z-10" />
                </div>

                <FadeInUp delay={0.2}>
                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                        Precision engineering for the modern competitive gamer.
                        <br className="hidden md:block" />
                        <span className="text-gray-200">Kernel-level security</span> meets <span className="text-cyan-400">cloud-based configuration</span>.
                    </p>
                </FadeInUp>

                <FadeInUp delay={0.4} className="flex flex-col sm:flex-row justify-center gap-6 mb-20">
                    <button
                        onClick={() => document.getElementById('shop').scrollIntoView({ behavior: 'smooth' })}
                        className="group relative px-8 py-4 bg-white text-black font-bold font-rajdhani text-lg uppercase tracking-wider overflow-hidden rounded-sm hover:scale-105 transition-transform"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        Access Catalog
                    </button>
                    <Link to="/status" className="px-8 py-4 rounded-sm border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-3 text-gray-300 font-mono text-sm uppercase tracking-widest group">
                        <Terminal className="w-4 h-4 text-cyan-500 group-hover:text-white transition-colors" />
                        System Diagnostics
                    </Link>
                </FadeInUp>

                <FadeInUp delay={0.6}>
                    <FeaturedCarousel items={products.slice(0, 5)} onSelect={onProductSelect} />
                </FadeInUp>
            </motion.div>

            {/* Tech Marquee */}
            <div className="absolute bottom-0 w-full border-t border-white/5 bg-black/40 backdrop-blur-sm py-6 overflow-hidden">
                <InfiniteMarquee speed={40}>
                    {LOGOS.map((logo, i) => (
                        <div key={i} className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0 px-4">
                            <img src={logo.icon} alt={logo.name} className={cn("h-6 w-auto object-contain", logo.className)} />
                            <span className="text-sm font-medium text-white/80 uppercase tracking-wider font-rajdhani">{logo.name}</span>
                        </div>
                    ))}
                </InfiniteMarquee>
            </div>
        </div>
    );
};

const ShopGrid = ({ onProductClick, products }) => {
    return (
        <section id="shop" className="py-32 relative z-10 bg-zinc-950">
            <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent" />

            <div className="max-w-7xl mx-auto px-6">
                <FadeInUp className="flex items-end justify-between mb-16 pb-6 border-b border-white/5">
                    <div>
                        <h2 className="text-5xl font-black text-white mb-2 font-rajdhani uppercase">Arsenal</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                            <p className="text-cyan-400 font-mono text-xs tracking-widest">SELECT_MODULE // VERIFIED_HITS</p>
                        </div>
                    </div>
                    <div className="hidden md:flex gap-4">
                        {['FPS', 'MMO', 'Survival'].map(cat => (
                            <button key={cat} className="px-4 py-1 border border-white/10 rounded text-xs text-gray-500 hover:text-white hover:border-white/30 uppercase tracking-widest transition-all">
                                {cat}
                            </button>
                        ))}
                    </div>
                </FadeInUp>

                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-lg">
                        <Activity className="w-10 h-10 text-cyan-500 mb-4 animate-spin-slow" />
                        <h3 className="text-xl font-bold text-white font-rajdhani uppercase">Connecting to Secure Database...</h3>
                        <p className="text-gray-500 text-sm mt-2">Fetching product keys via encrypted tunnel.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {products.map((product, index) => (
                            <FadeInUp key={product.id} delay={index * 0.1}>
                                <SpotlightCard
                                    onClick={() => onProductClick(product)}
                                    className="cursor-pointer h-full bg-zinc-900/50 border-white/5 hover:border-cyan-500/30"
                                    accentColor={product.status === 'Undetected' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'}
                                >
                                    <div className="h-full flex flex-col">
                                        <div className={`h-40 bg-gradient-to-br ${product.accent} relative overflow-hidden p-6 group-hover:h-44 transition-all duration-300`}>
                                            {product.image_url ? (
                                                <div className="absolute inset-0">
                                                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover opacity-90" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
                                            )}

                                            <div className="relative z-10 flex justify-between items-start">
                                                <div className="bg-black/20 backdrop-blur-md p-2 rounded border border-white/10">
                                                    <Cpu className="w-5 h-5 text-white" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md",
                                                    product.status === 'Undetected' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                )}>
                                                    {product.status === 'Undetected' ? <CheckCircle className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                                    {product.status}
                                                </div>
                                            </div>
                                            <h3 className="absolute bottom-4 left-6 text-3xl font-black text-white tracking-tighter italic uppercase drop-shadow-xl font-rajdhani">
                                                {product.game}
                                            </h3>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col bg-zinc-900">
                                            <div className="flex justify-between items-end mb-4">
                                                <div>
                                                    <h4 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors font-rajdhani tracking-wide">{product.title}</h4>
                                                    {product.subtitle && <p className="text-xs text-gray-500 uppercase tracking-wider">{product.subtitle}</p>}
                                                </div>
                                                <span className="text-lg font-mono text-cyan-400">${product.price_day || product.price_week || product.price_15days || product.price_month || product.price}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-8 flex-1">
                                                {product.features.slice(0, 6).map((feat, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                                                        <div className="w-1 h-1 bg-cyan-500 rounded-full shadow-[0_0_5px_cyan] flex-shrink-0" />
                                                        <span className="truncate">{feat}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button className="w-full py-3 bg-white/5 border border-white/10 rounded text-gray-300 text-sm font-bold uppercase tracking-widest hover:bg-cyan-600 hover:text-white hover:border-cyan-500 transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                                Configure <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </SpotlightCard>
                            </FadeInUp>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

const Footer = () => {
    const [status, setStatus] = useState('checking');
    const [ping, setPing] = useState(null);

    useEffect(() => {
        const checkStatus = async () => {
            const startTime = Date.now();
            try {
                const res = await axios.get('/api/health');
                const endTime = Date.now();
                setPing(endTime - startTime);
                if (res.data && (res.data.status === 'operational' || res.data.status === 'healthy')) {
                    setStatus('operational');
                } else {
                    setStatus('degraded');
                }
            } catch (e) {
                setStatus('down');
                setPing(null);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    const statusColor = status === 'operational' ? 'text-green-500' : status === 'degraded' ? 'text-yellow-500' : status === 'down' ? 'text-red-500' : 'text-gray-500';
    const statusText = status === 'operational' ? 'OPERATIONAL' : status === 'degraded' ? 'DEGRADED' : status === 'down' ? 'DOWN' : 'CHECKING...';

    return (
        <footer className="bg-black border-t border-white/10 pt-20 pb-10 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-900 to-transparent" />
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <img src="/logo.png" alt="Zzenith Logo" className="w-8 h-8 object-contain" />
                        <span className="text-2xl font-black text-white font-rajdhani">ZZENITH</span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                        The premier destination for external game enhancements.
                        We operate in the shadows so you can shine in the arena.
                        Always updated, always undetected.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Legal</h4>
                    <ul className="space-y-4 text-sm text-gray-500">
                        <li className="hover:text-cyan-400 cursor-pointer transition-colors">
                            <Link to="/terms-of-service">Terms of Service</Link>
                        </li>
                        <li className="hover:text-cyan-400 cursor-pointer transition-colors">
                            <Link to="/privacy-policy">Privacy Policy</Link>
                        </li>
                        <li className="hover:text-cyan-400 cursor-pointer transition-colors">
                            <Link to="/refund-policy">Refund Policy</Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Community</h4>
                    <ul className="space-y-4 text-sm text-gray-500">
                        <li className="hover:text-cyan-400 cursor-pointer transition-colors">
                            <a href="https://discord.gg/pwQRVv25qX" target="_blank" rel="noopener noreferrer">Discord Server</a>
                        </li>
                        <li className="hover:text-cyan-400 cursor-pointer transition-colors">
                            <Link to="/support">Support Ticket</Link>
                        </li>
                        <li className="hover:text-cyan-400 cursor-pointer transition-colors">
                            <Link to="/faq">FAQ</Link>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
                <p>&copy; 2024 ZZENITH SYSTEMS LLC. ALL RIGHTS RESERVED.</p>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <Link to="/status" className="hover:text-cyan-400 transition-colors">
                        STATUS: <span className={statusColor}>{statusText}</span>
                    </Link>
                    <span>PING: <span className="text-white">{ping !== null ? `${ping}ms` : '--'}</span></span>
                </div>
            </div>
        </footer>
    );
};

// --- MAIN LAYOUT LOGIC ---

const Home = () => {
    const { products } = useOutletContext();
    const navigate = useNavigate();

    return (
        <main className="relative z-10">
            <Hero onProductSelect={(p) => navigate(`/product/${p.id}`)} products={products} />
            <ShopGrid onProductClick={(p) => navigate(`/product/${p.id}`)} products={products} />
        </main>
    );
};

function StoreLayout() {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [user, setUser] = useState(null);
    const [showManualCheckout, setShowManualCheckout] = useState(false);
    const navigate = useNavigate();

    // Check if user is logged in
    useEffect(() => {
        const checkUser = async () => {
            try {
                const res = await axios.get('/api/auth/status');
                if (res.data && res.data.authenticated) {
                    setUser(res.data);
                }
            } catch (e) {
                setUser(null);
            }
        };
        checkUser();
    }, []);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axios.get('/api/products');
                if (res.data) setProducts(res.data);
            } catch (e) {
                console.error("Failed to fetch products", e);
            }
        };
        fetchProducts();
    }, []);

    const addToCart = (product) => {
        setCart([...cart, product]);
        setIsCartOpen(true);
    };

    return (
        <div className="bg-zinc-950 min-h-screen text-white font-sans selection:bg-cyan-500 selection:text-black">
            {/* Global Fonts Import via Style */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Rajdhani:wght@500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                .font-rajdhani { font-family: 'Rajdhani', sans-serif; }
                .font-mono { font-family: 'JetBrains Mono', monospace; }
                
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #000; }
                ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
                
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                 @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>

            <NoiseOverlay />

            {/* 3D Background */}
            <ThreeBackground />

            <Navbar cartCount={cart.length} setIsCartOpen={setIsCartOpen} />

            <Outlet context={{ addToCart, products }} />

            <Footer />

            {/* Cart Sidebar (Simplified) */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                            onClick={() => setIsCartOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-zinc-900 border-l border-white/10 z-[70] p-6 shadow-2xl flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                                <h2 className="text-2xl font-black font-rajdhani uppercase">Cart ({cart.length})</h2>
                                <button onClick={() => setIsCartOpen(false)}><X /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4">
                                {cart.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10">System Empty. Select Modules.</div>
                                ) : (
                                    cart.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded border border-white/5">
                                            <div className="flex-1">
                                                <div className="font-bold text-white">{item.title}</div>
                                                <div className="text-xs text-cyan-500">{item.category}</div>
                                            </div>
                                            <div className="font-mono text-white mr-3">${item.price}</div>
                                            <button
                                                onClick={() => setCart(cart.filter((_, idx) => idx !== i))}
                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <div className="flex justify-between text-lg font-bold mb-4">
                                    <span>Total</span>
                                    <span>${cart.reduce((acc, curr) => acc + parseFloat(curr.price), 0).toFixed(2)}</span>
                                </div>

                                {/* Check if user is logged in */}
                                {!user ? (
                                    <div className="space-y-3">
                                        <p className="text-gray-400 text-sm text-center mb-4">
                                            Please login or create an account to checkout
                                        </p>
                                        <button
                                            onClick={() => { setIsCartOpen(false); navigate('/login'); }}
                                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest transition-colors rounded flex items-center justify-center gap-2"
                                        >
                                            <Lock className="w-4 h-4" /> Login to Checkout
                                        </button>
                                        <button
                                            onClick={() => { setIsCartOpen(false); navigate('/register'); }}
                                            className="w-full py-3 bg-transparent border border-cyan-500 hover:bg-cyan-500/10 text-cyan-400 font-bold uppercase tracking-widest transition-colors rounded flex items-center justify-center gap-2"
                                        >
                                            Create Account
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-400 text-sm mb-3">
                                            License key will be sent to: <span className="text-cyan-400">{user.email}</span>
                                        </p>

                                        <button
                                            onClick={() => {
                                                setShowManualCheckout(true);
                                                setIsCartOpen(false);
                                            }}
                                            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold uppercase tracking-widest transition-all rounded flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 group"
                                        >
                                            <Lock className="w-5 h-5 group-hover:text-cyan-200 transition-colors" />
                                            Secure Checkout
                                        </button>
                                        <div className="flex justify-center gap-3 mt-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Crypto</span>
                                            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Cards</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Manual Checkout Modal */}
            {showManualCheckout && user && (
                <ManualCheckout
                    user={user}
                    cart={cart}
                    onClose={() => setShowManualCheckout(false)}
                />
            )}
        </div>
    );
}

// --- APP ROUTER WRAPPER ---
export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<StoreLayout />}>
                    <Route index element={<Home />} />
                    <Route path="product/:id" element={<ProductPage />} />
                </Route>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/support" element={<Support />} />
                <Route path="/support/ticket/:id" element={<TicketDetail />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/status" element={<SystemStatus />} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
                <Route path="/checkout/cancel" element={<CheckoutCancel />} />
                <Route path="/faq" element={<FAQ />} />
            </Routes>
        </Router>
    );
}