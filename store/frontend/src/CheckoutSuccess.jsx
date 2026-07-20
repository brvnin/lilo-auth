import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, Home, Loader2 } from 'lucide-react';
import axios from 'axios';

const CheckoutSuccess = () => {
    const [searchParams] = useSearchParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        const verifyPayment = async () => {
            if (sessionId) {
                try {
                    const res = await axios.post('/api/checkout/verify', { session_id: sessionId });
                    if (res.data.order) {
                        setOrder(res.data.order);
                    }
                } catch (err) {
                    console.error('Verify error:', err);
                }
            }
            setLoading(false);
        };
        verifyPayment();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center"
            >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>

                <h1 className="text-3xl font-black text-white mb-2 font-rajdhani uppercase">
                    Payment Successful!
                </h1>

                <p className="text-gray-400 mb-6">
                    Thank you for your purchase. Your license key has been sent to your email.
                </p>

                {order && (
                    <div className="bg-black/40 rounded-xl p-4 mb-6 text-left">
                        <div className="flex items-center gap-2 text-cyan-400 mb-3">
                            <Mail className="w-4 h-4" />
                            <span className="text-sm font-mono">{order.email}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                            Order #{order.id} • ${order.total?.toFixed(2)}
                        </div>
                    </div>
                )}

                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6">
                    <p className="text-sm text-cyan-300">
                        📧 Check your email inbox (and spam folder) for your license key.
                        It may take a few minutes to arrive.
                    </p>
                </div>

                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider rounded transition-colors"
                >
                    <Home className="w-4 h-4" /> Back to Home
                </Link>
            </motion.div>
        </div>
    );
};

export default CheckoutSuccess;
