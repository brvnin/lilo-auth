import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader, User, Shield } from 'lucide-react';

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadTicket();
        const interval = setInterval(loadTicket, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [id]);

    const loadTicket = async () => {
        try {
            const res = await axios.get(`/api/tickets/${id}`);
            // Only update if data changed to prevent unnecessary re-renders/flickers
            // (Simple implementation: just update)
            setTicket(res.data.ticket);
            setMessages(res.data.messages);
        } catch (err) {
            console.error('Failed to load ticket:', err);
            if (err.response?.status === 401) {
                navigate('/login');
            } else if (err.response?.status === 403 || err.response?.status === 404) {
                navigate('/support');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setSending(true);
        try {
            await axios.post(`/api/tickets/${id}/reply`, { message: replyText });
            setReplyText('');
            loadTicket(); // Reload to show new message
        } catch (err) {
            console.error('Failed to send reply:', err);
            alert(err.response?.data?.error || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
            case 'Pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            case 'Closed': return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <p className="text-gray-400">Ticket not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/support" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Support
                    </Link>

                    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    Ticket #{ticket.id}: {ticket.subject}
                                </h1>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <span>{ticket.category}</span>
                                    <span className="text-gray-600">•</span>
                                    <span>{new Date(ticket.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-semibold uppercase border ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 mb-6">
                    {messages.map((msg, index) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-zinc-900/50 backdrop-blur-md border rounded-lg p-6 ${msg.is_admin_reply
                                ? 'border-purple-500/30 bg-purple-500/5'
                                : 'border-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.is_admin_reply
                                    ? 'bg-gradient-to-br from-purple-500 to-pink-600'
                                    : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                                    }`}>
                                    {msg.is_admin_reply ? (
                                        <Shield className="w-5 h-5 text-white" />
                                    ) : (
                                        <User className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-semibold">
                                        {msg.sender_name}
                                        {msg.is_admin_reply && (
                                            <span className="ml-2 text-purple-400 text-xs uppercase font-bold">Admin</span>
                                        )}
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        {new Date(msg.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <p className="text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Reply Form */}
                {ticket.status !== 'Closed' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-6"
                    >
                        <h3 className="text-white font-semibold mb-4">Reply to Ticket</h3>
                        <form onSubmit={handleReply}>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows="4"
                                className="w-full bg-black/30 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none mb-4"
                                placeholder="Type your message..."
                                disabled={sending}
                            />
                            <button
                                type="submit"
                                disabled={sending || !replyText.trim()}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded transition-all uppercase tracking-wider text-sm"
                            >
                                {sending ? (
                                    <>
                                        <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 inline mr-2" />
                                        Send Reply
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                ) : (
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-6 text-center">
                        <p className="text-gray-400">This ticket is closed and cannot receive new replies.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
