import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, CreditCard, Wrench, User, ShieldCheck } from 'lucide-react';

const FAQItem = ({ question, answer, isOpen, onClick }) => (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20 hover:border-cyan-500/30 transition-colors">
        <button
            onClick={onClick}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
            <span className="font-semibold text-white">{question}</span>
            {isOpen ? (
                <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    <div className="px-6 pb-4 text-gray-300 border-t border-white/5 pt-4">
                        {answer}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const FAQCategory = ({ title, icon: Icon, faqs, openItem, setOpenItem, categoryKey }) => (
    <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
                <Icon className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white font-rajdhani uppercase">{title}</h2>
        </div>
        <div className="space-y-3">
            {faqs.map((faq, index) => (
                <FAQItem
                    key={index}
                    question={faq.q}
                    answer={faq.a}
                    isOpen={openItem === `${categoryKey}-${index}`}
                    onClick={() => setOpenItem(openItem === `${categoryKey}-${index}` ? null : `${categoryKey}-${index}`)}
                />
            ))}
        </div>
    </div>
);

export default function FAQ() {
    const [openItem, setOpenItem] = useState(null);

    const purchasingFAQs = [
        {
            q: "How do I purchase a product?",
            a: "Visit our store, select your desired product, choose a subscription plan (Day, Week, 15 Days, Month, or Lifetime), add to cart, and checkout with Stripe. Your license key will be sent to your email immediately after payment."
        },
        {
            q: "What payment methods do you accept?",
            a: "We accept all major credit and debit cards through Stripe (Visa, Mastercard, American Express, etc.). For cryptocurrency or alternative payment methods, please open a support ticket to discuss options."
        },
        {
            q: "Where is my license key?",
            a: "Your license key is sent to the email address you provided during checkout immediately after payment. Please check your spam/junk folder if you don't see it in your inbox. If you still haven't received it after 10 minutes, open a support ticket with your payment proof."
        },
        {
            q: "Can I get a refund?",
            a: "Refunds are handled on a case-by-case basis. We only issue refunds if your license key fails to activate due to issues on our end. No refunds are given after successful activation, for game bans, or buyer's remorse. Please read our Refund Policy for full details."
        },
        {
            q: "Do you offer lifetime subscriptions?",
            a: "Some of our products offer lifetime license options. Check the product page for available subscription plans. Lifetime licenses never expire but may become obsolete if the game updates significantly."
        },
        {
            q: "Can I upgrade my subscription?",
            a: "Currently, we don't offer direct upgrades. You would need to purchase a new subscription. Contact support if you have a special case."
        }
    ];

    const technicalFAQs = [
        {
            q: "How do I activate my license?",
            a: "1. Download the loader from the Downloads section after purchasing\n2. Run the loader as Administrator\n3. Enter your license key exactly as it appears in your email\n4. Select your product and click Inject\n5. Enjoy!"
        },
        {
            q: "Can I use my license on multiple computers?",
            a: "No, each license is locked to a single PC (Hardware ID / HWID). If you need to use it on a different computer, you'll need to request an HWID reset via support ticket. You're allowed 1 reset every 3 days."
        },
        {
            q: "How do I reset my HWID?",
            a: "Open a support ticket with your license key and request an HWID reset. Resets are limited to once every 3 days to prevent abuse. Your reset will be processed within 24 hours (usually much faster)."
        },
        {
            q: "The loader won't open or crashes!",
            a: "Try these solutions:\n• Run as Administrator (right-click → Run as administrator)\n• Temporarily disable Windows Defender real-time protection\n• Add the loader folder to your antivirus exclusions\n• Download a fresh copy from the Downloads section"
        },
        {
            q: "I'm getting 'VCRUNTIME140.dll missing' error",
            a: "You need to install the Visual C++ Redistributable. Download it from Microsoft's official website and install it, then restart your PC."
        },
        {
            q: "The loader says 'Connection failed' or 'Server offline'",
            a: "Check your internet connection first. Then check our Status page for any server issues. If the server is online and you still can't connect, try disabling your VPN or firewall temporarily."
        },
        {
            q: "What if a product gets detected?",
            a: "STOP USING IT IMMEDIATELY. Check our Status page for updates. We will extend your subscription or provide compensation while we work on an update. Never use a detected product as it significantly increases ban risk."
        }
    ];

    const accountFAQs = [
        {
            q: "How do I verify my purchase on Discord?",
            a: "Join our Discord server and use the /verify command in the #verify channel with the email you used during checkout. This will give you the Customer role and access to exclusive channels."
        },
        {
            q: "My Discord verification isn't working!",
            a: "Make sure you're using the exact same email you used during checkout. Wait a few minutes after purchase before verifying. If it still doesn't work, open a support ticket with your order details."
        },
        {
            q: "Can I transfer my license to someone else?",
            a: "License transfers are considered on a case-by-case basis. Open a support ticket with your request. Note that selling or sharing licenses is against our Terms of Service."
        },
        {
            q: "How long does support take to respond?",
            a: "We typically respond to support tickets within 24 hours, often much faster during active hours. For urgent issues, mention it in your ticket for prioritized assistance."
        },
        {
            q: "I forgot my account password",
            a: "Use the 'Forgot Password' link on the login page. You'll receive a password reset email. If you don't receive it, check your spam folder or contact support."
        }
    ];

    const safetyFAQs = [
        {
            q: "Are your products safe to use?",
            a: "We employ advanced security measures including kernel-level protection, memory encryption, and frequent updates. However, no cheat is 100% undetectable. Always use responsibly and check our Status page for current detection status."
        },
        {
            q: "Will I get banned using your products?",
            a: "While we strive to maintain undetected status, there's always a risk when using third-party software in games. We recommend using on alt accounts when possible and following our safety guidelines."
        },
        {
            q: "What happens if I get banned?",
            a: "Game bans are your responsibility and are non-refundable. We do not provide refunds or compensation for bans unless the product was detected at the time of use (confirmed on our Status page)."
        },
        {
            q: "Do you store my payment information?",
            a: "No, we never store your payment details. All payments are processed securely through Stripe, a PCI-compliant payment processor. We only receive notification of successful payments."
        }
    ];

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
                >
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                            <HelpCircle className="w-10 h-10 text-cyan-400" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 font-rajdhani uppercase tracking-wider">
                            Frequently Asked Questions
                        </h1>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Find answers to common questions below. Can't find what you're looking for?
                            <Link to="/support" className="text-cyan-400 hover:underline ml-1">Open a support ticket</Link>
                        </p>
                    </div>

                    {/* FAQ Categories */}
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-6 md:p-8">
                        <FAQCategory
                            title="Purchasing"
                            icon={CreditCard}
                            faqs={purchasingFAQs}
                            openItem={openItem}
                            setOpenItem={setOpenItem}
                            categoryKey="purchasing"
                        />

                        <FAQCategory
                            title="Technical"
                            icon={Wrench}
                            faqs={technicalFAQs}
                            openItem={openItem}
                            setOpenItem={setOpenItem}
                            categoryKey="technical"
                        />

                        <FAQCategory
                            title="Account & Discord"
                            icon={User}
                            faqs={accountFAQs}
                            openItem={openItem}
                            setOpenItem={setOpenItem}
                            categoryKey="account"
                        />

                        <FAQCategory
                            title="Safety & Privacy"
                            icon={ShieldCheck}
                            faqs={safetyFAQs}
                            openItem={openItem}
                            setOpenItem={setOpenItem}
                            categoryKey="safety"
                        />
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-8 text-center">
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
                            <p className="text-gray-400 mb-4">Our support team is here to help you 24/7</p>
                            <Link
                                to="/support"
                                className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded transition-colors"
                            >
                                Open Support Ticket
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
