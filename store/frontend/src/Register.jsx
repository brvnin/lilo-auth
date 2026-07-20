import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Lock, AlertCircle, CheckCircle, ArrowLeft, RefreshCw, Clock } from 'lucide-react';

export default function Register() {
    const [step, setStep] = useState(1); // 1: Register, 2: Verify Email
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [code, setCode] = useState('');
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendCount, setResendCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    // Initialize from location state (for unverified users coming from Login)
    useEffect(() => {
        if (location.state?.step === 2 && location.state?.userId) {
            setUserId(location.state.userId);
            setStep(2);
            if (location.state.email) {
                setFormData(prev => ({ ...prev, email: location.state.email }));
            }
        }
    }, [location]);

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const getNextCooldown = () => {
        // 15s → 30s → 60s → 120s → 180s (max)
        const cooldowns = [15, 30, 60, 120, 180];
        return cooldowns[Math.min(resendCount, cooldowns.length - 1)];
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('/api/auth/register', formData);
            setUserId(res.data.user_id);
            setSuccess(res.data.message);
            setStep(2);
            // Set initial cooldown after registration
            setResendCooldown(getNextCooldown());
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('/api/auth/verify', { user_id: userId, code });
            setSuccess('Email verified! Redirecting...');
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed. Please try again.');
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        setError('');
        setLoading(true);

        try {
            await axios.post('/api/auth/resend-code', { user_id: userId });
            setSuccess('New verification code sent! Check your inbox and spam folder.');
            setResendCount(prev => prev + 1);
            setResendCooldown(getNextCooldown());
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                                <Mail className="w-8 h-8 text-cyan-500" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2 font-rajdhani uppercase tracking-wider">Verify Email</h2>
                            <p className="text-gray-400 text-sm">Enter the 6-digit code sent to <span className="text-cyan-400">{formData.email}</span></p>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-6">
                            <div>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full bg-black/40 border border-white/10 rounded px-4 py-4 text-white text-center text-3xl font-mono tracking-[0.5em] focus:border-cyan-500 focus:outline-none transition-colors"
                                    maxLength="6"
                                    required
                                />
                            </div>

                            {/* Spam folder notice */}
                            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-yellow-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>Can't find the email? Check your <strong>spam/junk folder</strong>.</span>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-sm"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {success && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded p-3 text-green-400 text-sm"
                                >
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{success}</span>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition-all uppercase tracking-widest text-sm shadow-lg shadow-cyan-500/20 disabled:shadow-none"
                            >
                                {loading ? 'Verifying...' : 'Verify Email'}
                            </button>

                            <div className="flex items-center justify-center gap-4 text-sm">
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={loading || resendCooldown > 0}
                                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resendCooldown > 0 ? (
                                        <>
                                            <Clock className="w-4 h-4" />
                                            Resend in {resendCooldown}s
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Resend Code
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 pt-6 border-t border-white/10 text-center">
                            <p className="text-gray-500 text-xs">Code expires in 15 minutes</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }


    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-8 shadow-2xl">
                    <div className="mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-6">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-2 font-rajdhani uppercase tracking-wider">Create Account</h2>
                                <p className="text-gray-400 text-sm">Join Zzenith and get access to premium tools</p>
                            </div>
                            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-semibold">
                                Log In →
                            </Link>
                        </div>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-xs font-mono uppercase tracking-wider mb-2">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded pl-11 pr-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">3-20 characters, letters, numbers, and underscores only</p>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs font-mono uppercase tracking-wider mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded pl-11 pr-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs font-mono uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded pl-11 pr-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-sm"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition-all uppercase tracking-widest text-sm shadow-lg shadow-cyan-500/20"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <p className="text-gray-400 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
