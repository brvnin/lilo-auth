import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';

export default function TermsOfService() {
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
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-8 h-8 text-cyan-400" />
                        <div>
                            <h1 className="text-4xl font-black text-white font-rajdhani uppercase tracking-wider">Terms of Service</h1>
                            <p className="text-gray-400 text-sm">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="space-y-6 text-gray-300">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">1. Acceptance of Terms</h2>
                            <p>By accessing and using Zzenith services, you agree to be bound by these Terms of Service. If you do not agree, do not use our products.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">2. Product Usage</h2>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Our products are for <strong className="text-white">personal use only</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Sharing, reselling, or distributing license keys is <strong className="text-white">strictly prohibited</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>One license = One user. Multi-user access requires multiple licenses</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>You are responsible for keeping your license key secure</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">3. Detection & Bans</h2>
                            <p className="mb-3">You acknowledge and accept that:</p>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Using our products carries <strong className="text-white">detection risk</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Zzenith is <strong className="text-white">not responsible</strong> for game bans or account suspensions</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>No status (Undetected/Updating/Risk) guarantees immunity from detection</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Use at your own risk. We provide tools, not guarantees</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">4. Account Responsibilities</h2>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>You must be <strong className="text-white">18 years or older</strong> to use Zzenith</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Provide accurate information during registration</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Account sharing is prohibited</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>You are responsible for all activity under your account</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">5. Prohibited Activities</h2>
                            <p className="mb-3">The following are strictly forbidden:</p>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 mt-1">✗</span>
                                    <span>Reverse engineering, decompiling, or modifying our software</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 mt-1">✗</span>
                                    <span>Automated scraping or data mining of our services</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 mt-1">✗</span>
                                    <span>Attempting to bypass security measures or HWID locks</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 mt-1">✗</span>
                                    <span>Harassing staff or other users</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 mt-1">✗</span>
                                    <span>Fraudulent purchases or chargeback abuse</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">6. Service Availability</h2>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Zzenith operates <strong className="text-white">24/7</strong> but does not guarantee 100% uptime</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Maintenance windows may occur without notice</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Features may be added, modified, or removed at our discretion</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">7. Termination</h2>
                            <p className="mb-3">Zzenith reserves the right to terminate your account immediately if you:</p>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Violate these Terms of Service</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Engage in fraudulent activity</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Abuse our refund policy</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Harm our reputation or operations</span>
                                </li>
                            </ul>
                            <p className="mt-3 text-sm">No refunds will be issued for terminated accounts.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">8. Disclaimer of Warranties</h2>
                            <p>Our products are provided <strong className="text-white">"AS IS"</strong> without any warranties. We do not guarantee:</p>
                            <ul className="space-y-1 ml-4 mt-2">
                                <li>• Undetected status</li>
                                <li>• Compatibility with all systems</li>
                                <li>• Error-free operation</li>
                                <li>• Specific results or performance</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">9. Limitation of Liability</h2>
                            <p>Zzenith shall not be liable for:</p>
                            <ul className="space-y-1 ml-4 mt-2">
                                <li>• Game bans or account suspensions</li>
                                <li>• Loss of data or progress</li>
                                <li>• Hardware damage (highly unlikely)</li>
                                <li>• Indirect, incidental, or consequential damages</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">10. Changes to Terms</h2>
                            <p>We may update these Terms at any time. Continued use of our services after changes constitutes acceptance of the new Terms.</p>
                        </section>

                        <section className="border-t border-white/10 pt-6">
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">Contact</h2>
                            <p className="mb-2">Questions about these Terms?</p>
                            <Link to="/support" className="text-cyan-400 font-semibold hover:underline">Submit a Support Ticket</Link>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
