import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
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
                        <Lock className="w-8 h-8 text-cyan-400" />
                        <div>
                            <h1 className="text-4xl font-black text-white font-rajdhani uppercase tracking-wider">Privacy Policy</h1>
                            <p className="text-gray-400 text-sm">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="space-y-6 text-gray-300">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">1. Information We Collect</h2>
                            <p className="mb-3">When you use Zzenith, we collect the following information:</p>

                            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Account Information</h3>
                            <ul className="space-y-1 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Username</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Email address</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Encrypted password</span>
                                </li>
                            </ul>

                            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Purchase Information</h3>
                            <ul className="space-y-1 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Order history and license keys</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Payment information (processed by secure payment providers)</span>
                                </li>
                            </ul>

                            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Technical Information</h3>
                            <ul className="space-y-1 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>IP address</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Browser type and version</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>HWID (Hardware ID) for license activation</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">2. How We Use Your Information</h2>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Account Management:</strong> Create and manage your account</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">License Delivery:</strong> Provide and activate your purchased products</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Security:</strong> Prevent fraud and unauthorized access</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Communications:</strong> Send updates, announcements, and support responses</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Analytics:</strong> Improve our services and user experience</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">3. Data Security</h2>
                            <p className="mb-3">We take data security seriously:</p>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Passwords are hashed using <strong className="text-white">PBKDF2 SHA256</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>All connections use <strong className="text-white">HTTPS encryption</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Database access is restricted and monitored</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span>Payment processing handled by <strong className="text-white">PCI-compliant</strong> third parties</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">4. Data Sharing</h2>
                            <p className="mb-3">We <strong className="text-white">DO NOT</strong> sell your personal information. We may share data with:</p>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Payment Processors:</strong> To complete transactions (Stripe, PayPal, etc.)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Email Service:</strong> To send verification and notification emails (Resend)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Legal Authorities:</strong> When required by law or to protect our rights</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">5. Cookies</h2>
                            <p className="mb-3">We use cookies to:</p>
                            <ul className="space-y-1 ml-4">
                                <li>• Keep you logged in (session cookies)</li>
                                <li>• Remember your preferences</li>
                                <li>• Analyze site traffic</li>
                            </ul>
                            <p className="mt-3 text-sm">You can disable cookies in your browser, but some features may not work properly.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">6. Your Rights</h2>
                            <p className="mb-3">You have the right to:</p>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Access:</strong> Request a copy of your personal data</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Correction:</strong> Update inaccurate information</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Deletion:</strong> Request account deletion (subject to legal obligations)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-1">•</span>
                                    <span><strong className="text-white">Opt-Out:</strong> Unsubscribe from marketing emails</span>
                                </li>
                            </ul>
                            <p className="mt-3 text-sm">Contact support via our <Link to="/support" className="text-cyan-400 hover:underline">ticket system</Link> to exercise these rights.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">7. Data Retention</h2>
                            <p>We retain your data:</p>
                            <ul className="space-y-1 ml-4 mt-2">
                                <li>• Account data: Until account deletion</li>
                                <li>• Purchase records: 7 years (tax compliance)</li>
                                <li>• Log files: 90 days</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">8. Children's Privacy</h2>
                            <p>Zzenith is <strong className="text-white">not intended for users under 18</strong>. We do not knowingly collect data from minors. If you believe a minor has created an account, contact us immediately.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">9. International Users</h2>
                            <p>Your data may be transferred to and processed in countries outside your residence. By using Zzenith, you consent to this transfer.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">10. Changes to Privacy Policy</h2>
                            <p>We may update this policy periodically. Continued use after changes constitutes acceptance of the updated policy.</p>
                        </section>

                        <section className="border-t border-white/10 pt-6">
                            <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani uppercase">Contact Us</h2>
                            <p className="mb-2">Privacy-related questions or requests:</p>
                            <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                                <Link to="/support" className="text-cyan-400 font-semibold hover:underline">Submit a Support Ticket</Link>
                                <p className="text-gray-500 text-sm mt-2">We respond to all requests within 30 days</p>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
