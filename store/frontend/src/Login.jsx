import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, AlertCircle, ArrowLeft, Mail } from 'lucide-react';

export default function Login() {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [userId, setUserId] = useState(null);
    const [email, setEmail] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setNeedsVerification(false);

        try {
            await axios.post('/api/auth/login', formData);
            // Successful login
            window.location.href = '/'; // Force full page reload to update auth state
        } catch (err) {
            if (err.response?.data?.needs_verification) {
                setNeedsVerification(true);
                setUserId(err.response.data.user_id);
                setEmail(err.response.data.email);
                setError(err.response.data.error);
            } else {
                setError(err.response?.data?.error || 'Login failed. Please try again.');
            }
            setLoading(false);
        }
    };

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
                                <h2 className="text-3xl font-black text-white mb-2 font-rajdhani uppercase tracking-wider">Access System</h2>
                                <p className="text-gray-400 text-sm">Enter your credentials to continue</p>
                            </div>
                            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-semibold">
                                Sign Up →
                            </Link>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-xs font-mono uppercase tracking-wider mb-2">Username or Email</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Enter username or email"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                                    placeholder="Enter password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded pl-11 pr-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
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

                        {needsVerification && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-yellow-500/10 border border-yellow-500/20 rounded p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-yellow-400 text-sm font-semibold mb-2">Email Verification Required</p>
                                        <p className="text-gray-400 text-xs mb-3">Please verify your email before logging in.</p>
                                        <Link
                                            to="/register"
                                            state={{ userId, email, step: 2 }}
                                            className="inline-block text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded transition-colors"
                                        >
                                            Go to Verification
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition-all uppercase tracking-widest text-sm shadow-lg shadow-cyan-500/20"
                        >
                            {loading ? 'Authenticating...' : 'Login'}
                        </button>

                        <div className="text-center">
                            <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                Forgot your password?
                            </Link>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <p className="text-gray-400 text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
