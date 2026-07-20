import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Send, MessageSquare, Clock, AlertCircle,
    CheckCircle, Loader, Search, Filter
} from 'lucide-react';

export default function Support() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        category: 'General',
        priority: 'Medium',
        message: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            const res = await axios.get('/api/tickets/my-tickets');
            setTickets(res.data.tickets || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await axios.post('/api/tickets/create', formData);
            if (res.data.success) {
                setShowCreateForm(false);
                setFormData({ subject: '', category: 'General', priority: 'Medium', message: '' });
                loadTickets();
                // Navigate to the new ticket
                navigate(`/support/ticket/${res.data.ticket_id}`);
            }
        } catch (err) {
            console.error('Failed to create ticket:', err);
            if (err.response?.data?.error) {
                alert(err.response.data.error);
                // If they have an existing ticket, navigate to it
                if (err.response.data.existing_ticket_id) {
                    setShowCreateForm(false);
                    navigate(`/support/ticket/${err.response.data.existing_ticket_id}`);
                }
            } else {
                alert('Failed to submit ticket. Please try again.');
            }
        } finally {
            setSubmitting(false);
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

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Urgent': return 'text-red-400';
            case 'High': return 'text-orange-400';
            case 'Medium': return 'text-blue-400';
            case 'Low': return 'text-gray-400';
            default: return 'text-gray-400';
        }
    };

    const filteredTickets = filter === 'all'
        ? tickets
        : tickets.filter(t => t.status.toLowerCase() === filter);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-white mb-2 font-rajdhani uppercase tracking-wider">Support Center</h1>
                            <p className="text-gray-400">Submit tickets and track your support requests</p>
                        </div>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-6 py-3 rounded transition-all uppercase tracking-wider text-sm shadow-lg shadow-cyan-500/30"
                        >
                            <MessageSquare className="w-4 h-4 inline mr-2" />
                            New Ticket
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-6">
                    {['all', 'open', 'pending', 'closed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider transition-all ${filter === f
                                ? 'bg-cyan-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {f === 'all' ? 'All Tickets' : f}
                        </button>
                    ))}
                </div>

                {/* Tickets List */}
                {filteredTickets.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center"
                    >
                        <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">No {filter !== 'all' && filter} tickets yet</p>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="text-cyan-400 hover:underline"
                        >
                            Create your first ticket
                        </button>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {filteredTickets.map((ticket, index) => (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Link
                                    to={`/support/ticket/${ticket.id}`}
                                    className="block bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg p-6 hover:border-cyan-500/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                                    #{ticket.id} - {ticket.subject}
                                                </h3>
                                                <span className={`px-3 py-1 rounded text-xs font-semibold uppercase border ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(ticket.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span>{ticket.category}</span>
                                                <span className="text-gray-600">•</span>
                                                <span className={getPriorityColor(ticket.priority)}>
                                                    {ticket.priority} Priority
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span>{ticket.message_count} messages</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Create Ticket Modal */}
                <AnimatePresence>
                    {showCreateForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                            onClick={() => !submitting && setShowCreateForm(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="bg-zinc-900 border border-white/10 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 className="text-2xl font-bold text-white mb-6 font-rajdhani uppercase">Create New Ticket</h2>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">Subject *</label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            required
                                            className="w-full bg-black/30 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                            placeholder="Brief description of your issue"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-400 mb-2">Category *</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                            >
                                                <option value="General">General</option>
                                                <option value="Technical">Technical Issue</option>
                                                <option value="Account">Account</option>
                                                <option value="Refund">Refund Request</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-400 mb-2">Priority</label>
                                            <select
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">Message *</label>
                                        <textarea
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            required
                                            rows="6"
                                            className="w-full bg-black/30 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                                            placeholder="Describe your issue in detail..."
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded transition-all uppercase tracking-wider text-sm"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 inline mr-2" />
                                                    Submit Ticket
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateForm(false)}
                                            disabled={submitting}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white font-semibold rounded transition-all uppercase tracking-wider text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
