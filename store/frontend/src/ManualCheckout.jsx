import React, { useState } from 'react';
import axios from 'axios';
import { Coins, CreditCard, Copy, CheckCircle, AlertCircle, ExternalLink, Loader } from 'lucide-react';

const ManualCheckout = ({ user, cart, onClose }) => {
    const [activeTab, setActiveTab] = useState('crypto'); // 'crypto' or 'giftcard'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [orderId, setOrderId] = useState(null);
    const [proofData, setProofData] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [copied, setCopied] = useState(false);

    // Crypto details
    const WALLET_ADDRESS = "0xf675134d079351e8eaf621386379e7ad5bb6fa82";
    const NETWORK = "USDT (TRC20)";

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + parseFloat(item.price), 0).toFixed(2);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(WALLET_ADDRESS);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async () => {
        if (!proofData.trim()) {
            setError('Please enter the proof (TXID or Code)');
            return;
        }

        // Validation logic
        if (activeTab === 'crypto') {
            // TXIDs are typically 64 chars, but we'll accept 32+ for safety
            if (proofData.trim().length < 32) {
                setError('Invalid TXID. Please enter the full transaction ID (usually 64 characters).');
                return;
            }
        } else {
            // Binance Gift Cards are typically 16 characters
            if (proofData.trim().length < 10) {
                setError('Invalid Gift Card Code. Please enter the full BGC code.');
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            // 1. Create Order (if not created yet)
            let currentOrderId = orderId;
            if (!currentOrderId) {
                const orderRes = await axios.post('/api/checkout/manual', {
                    items: cart,
                    email: user.email,
                    type: activeTab === 'crypto' ? 'manual_crypto' : 'manual_giftcard'
                });
                if (orderRes.data.success) {
                    currentOrderId = orderRes.data.order_id;
                    setOrderId(currentOrderId);
                } else {
                    throw new Error('Failed to create order');
                }
            }

            // 2. Submit Proof
            const proofRes = await axios.post('/api/checkout/manual/submit-proof', {
                order_id: currentOrderId,
                proof_data: proofData,
                proof_type: activeTab === 'crypto' ? 'txid' : 'giftcard'
            });

            if (proofRes.data.success) {
                setSubmitted(true);
            }

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to submit proof. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-gray-900 border border-green-500/50 rounded-xl p-8 max-w-md w-full text-center shadow-2xl shadow-green-900/20">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Payment Submitted!</h2>
                    <p className="text-gray-400 mb-6">
                        We have received your proof. An admin will verify it shortly.
                        Once approved, your license key will be sent to
                        <span className="text-cyan-400 font-mono mx-1">{user.email}</span>
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition-colors"
                    >
                        Close & Check Email
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-cyan-500/30 rounded-xl max-w-lg w-full shadow-2xl shadow-cyan-900/20 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Manual Payment
                            <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-0.5 rounded border border-yellow-500/30">
                                No Fees
                            </span>
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Total to pay: <span className="text-white font-bold">${calculateTotal()}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <AlertCircle className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => { setActiveTab('crypto'); setError(''); setProofData(''); }}
                        className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'crypto'
                            ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-500'
                            : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <Coins className="w-4 h-4" /> Direct Crypto
                    </button>
                    <button
                        onClick={() => { setActiveTab('giftcard'); setError(''); setProofData(''); }}
                        className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'giftcard'
                            ? 'bg-yellow-500/10 text-yellow-400 border-b-2 border-yellow-500'
                            : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <CreditCard className="w-4 h-4" /> Binance Gift Card
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {activeTab === 'crypto' ? (
                        <div className="space-y-6">
                            <div className="bg-black/40 rounded-lg p-4 border border-gray-800 text-center">
                                <p className="text-sm text-gray-400 mb-4">Send exactly <strong className="text-white">${calculateTotal()} USDT</strong> to:</p>

                                <div className="flex justify-center mb-4">
                                    <div className="bg-white p-2 rounded-lg">
                                        <img src="/usdt.png" alt="QR Code" className="w-40 h-40 object-contain" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Network: {NETWORK}</div>
                                    <div className="flex items-center gap-2 bg-gray-800 rounded p-3 border border-gray-700 group relative">
                                        <code className="text-xs sm:text-sm text-cyan-400 break-all font-mono">
                                            {WALLET_ADDRESS}
                                        </code>
                                        <button
                                            onClick={handleCopy}
                                            className="ml-auto p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                                            title="Copy Address"
                                        >
                                            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-400 font-bold mb-2">
                                    After sending, enter Transaction ID (TXID):
                                    <a href="https://www.binance.com/en/support/faq/how-to-find-my-transaction-id-txid-2c325e53daf04442adbaf8f6ba052f71" target="_blank" rel="noopener noreferrer" className="float-right text-[10px] text-cyan-400 hover:underline flex items-center gap-1">
                                        Where to find TXID? <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                </label>
                                <input
                                    type="text"
                                    value={proofData}
                                    onChange={(e) => setProofData(e.target.value)}
                                    placeholder="e.g. 7f83b2..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono text-sm"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                                <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Instructions
                                </h3>
                                <div className="text-sm text-gray-300 space-y-2">
                                    <p>1. Buy a <strong>Binance Gift Card</strong> for <strong>${calculateTotal()}</strong> (or more).</p>
                                    <p>2. You can buy from:</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <a href="https://www.g2a.com/search?query=binance+gift+card" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1">
                                            G2A <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <a href="https://www.kinguin.net/listing?active=1&hide_unavailable=0&phrase=binance%20gift%20card" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1">
                                            Kinguin <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <a href="https://www.binance.com/en/gift-card" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1">
                                            Binance <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">Ensure the card currency is USDT or USD.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-400 font-bold mb-2">
                                    Enter Gift Card Code:
                                </label>
                                <input
                                    type="text"
                                    value={proofData}
                                    onChange={(e) => setProofData(e.target.value)}
                                    placeholder="e.g. BGC-..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors font-mono text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !proofData}
                        className={`w-full py-4 font-bold uppercase tracking-widest rounded flex items-center justify-center gap-2 transition-all ${loading || !proofData
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20'
                            }`}
                    >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        {loading ? 'Verifying...' : 'Submit Payment Proof'}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-3">
                        Manual validation takes 1-12 hours depending on admin availability.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default ManualCheckout;
