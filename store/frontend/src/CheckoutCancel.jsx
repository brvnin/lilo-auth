import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, Home, RotateCcw } from 'lucide-react';

const CheckoutCancel = () => {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center"
            >
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-red-400" />
                </div>

                <h1 className="text-3xl font-black text-white mb-2 font-rajdhani uppercase">
                    Payment Cancelled
                </h1>

                <p className="text-gray-400 mb-6">
                    Your payment was cancelled. No charges have been made to your account.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold uppercase tracking-wider rounded transition-colors"
                    >
                        <Home className="w-4 h-4" /> Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider rounded transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> Try Again
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CheckoutCancel;
