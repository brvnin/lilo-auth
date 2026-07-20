import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function RefundPolicy() {
    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-8">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-8"
                >
                    <h1 className="text-4xl font-black text-white mb-2 font-rajdhani uppercase tracking-wider">Refund Policy</h1>
                    <p className="text-gray-400 text-sm mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-yellow-400 font-semibold mb-1">Important Notice</p>
                            <p className="text-gray-300 text-sm">Due to the digital nature of our products, refunds are strictly limited. Please read carefully before purchasing.</p>
                        </div>
                    </div>

                    <div className="space-y-6 text-gray-300">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">Refund Eligibility</h2>
                            <p className="mb-4">Refunds are <span className="text-cyan-400 font-semibold">ONLY</span> available under the following condition:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Your license key <strong className="text-white">fails to activate</strong> in the loader application</li>
                                <li>The activation issue is <strong className="text-white">not caused</strong> by user error (e.g., incorrect credentials, banned account)</li>
                                <li>The refund request is submitted within <strong className="text-white">24 hours</strong> of purchase</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">Non-Refundable Situations</h2>
                            <p className="mb-4">Refunds will <span className="text-red-400 font-semibold">NOT</span> be issued for:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong className="text-white">Detection/Bans:</strong> Our products come with detection risk. No refunds for game bans.</li>
                                <li><strong className="text-white">Performance Issues:</strong> Lag, FPS drops, or feature bugs do not qualify for refunds.</li>
                                <li><strong className="text-white">Buyer's Remorse:</strong> Changed your mind? Sorry, no refunds.</li>
                                <li><strong className="text-white">Hardware Incompatibility:</strong> Ensure your system meets requirements before purchasing.</li>
                                <li><strong className="text-white">User Error:</strong> Incorrect installation, wrong game version, or misuse.</li>
                                <li><strong className="text-white">Subscription Renewals:</strong> Auto-renewals are non-refundable. Cancel before renewal date.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">Refund Process</h2>
                            <ol className="list-decimal list-inside space-y-3 ml-4">
                                <li>
                                    <strong className="text-white">Contact Support:</strong> Open a ticket with your order ID and license key
                                </li>
                                <li>
                                    <strong className="text-white">Provide Evidence:</strong> Send screenshots of the activation error from the loader
                                </li>
                                <li>
                                    <strong className="text-white">Verification:</strong> Our team will verify the issue (1-3 business days)
                                </li>
                                <li>
                                    <strong className="text-white">Approval:</strong> If approved, refund processed within 5-7 business days
                                </li>
                            </ol>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">Important Notes</h2>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Once a license key is activated successfully, it becomes <strong className="text-white">non-refundable</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Refunds are processed to the original payment method only</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Abuse of the refund system will result in permanent account suspension</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Zzenith reserves the right to refuse refunds on a case-by-case basis</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">Contact Support</h2>
                            <p className="mb-2">For refund requests or questions:</p>
                            <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                                <Link to="/support" className="text-cyan-400 font-semibold hover:underline">Submit a Support Ticket</Link>
                                <p className="text-gray-500 text-sm mt-2">Response time: 1-3 business days</p>
                            </div>
                        </section>

                        <section className="border-t border-white/10 pt-6">
                            <p className="text-sm text-gray-500">
                                By purchasing from Zzenith, you acknowledge that you have read and agreed to this refund policy.
                                This policy is subject to change without notice.
                            </p>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
