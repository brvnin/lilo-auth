import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Search, Filter, CheckCircle, Clock, AlertCircle, X, Send, Trash2, Inbox } from 'lucide-react';

export default function AdminTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadTickets();
        const interval = setInterval(() => {
            loadTickets();
            if (selectedTicket) {
                axios.get(`/api/tickets/${selectedTicket.id}`).then(res => {
                    setMessages(res.data.messages);
                }).catch(e => console.error("Polling details failed", e));
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [filterStatus, selectedTicket?.id]);

    const loadTickets = async () => {
        try {
            const params = {};
            if (filterStatus !== 'All') params.status = filterStatus;

            const res = await axios.get('/api/admin/tickets', { params });
            setTickets(res.data.tickets);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load tickets', err);
            setLoading(false);
        }
    };

    const loadTicketDetails = async (ticketId) => {
        try {
            const res = await axios.get(`/api/tickets/${ticketId}`);
            setMessages(res.data.messages);
            const ticketRes = await axios.get('/api/admin/tickets');
            const ticket = ticketRes.data.tickets.find(t => t.id === ticketId);
            if (ticket) setSelectedTicket(ticket);
        } catch (err) {
            console.error('Failed to load details', err);
        }
    };

    const handleDelete = async (e, ticketId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this ticket? This cannot be undone.')) return;

        try {
            await axios.delete(`/api/admin/tickets/${ticketId}`);
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(null);
                setMessages([]);
            }
            loadTickets();
        } catch (err) {
            alert('Failed to delete ticket');
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setSending(true);
        try {
            await axios.post(`/api/admin/tickets/${selectedTicket.id}/reply`, {
                message: replyText
            });
            setReplyText('');
            loadTicketDetails(selectedTicket.id);
        } catch (err) {
            alert('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const updateStatus = async (newStatus) => {
        try {
            await axios.patch(`/api/admin/tickets/${selectedTicket.id}/status`, {
                status: newStatus
            });
            setSelectedTicket(prev => ({ ...prev, status: newStatus }));
            loadTickets();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const updatePriority = async (newPriority) => {
        try {
            await axios.patch(`/api/admin/tickets/${selectedTicket.id}/status`, {
                priority: newPriority
            });
            setSelectedTicket(prev => ({ ...prev, priority: newPriority }));
            loadTickets();
        } catch (err) {
            alert('Failed to update priority');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return 'text-green-400 bg-green-400/10 border-green-500/30';
            case 'Pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30';
            case 'Closed': return 'text-gray-400 bg-gray-400/10 border-gray-500/30';
            default: return 'text-white';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Urgent': return 'text-red-500';
            case 'High': return 'text-orange-400';
            case 'Medium': return 'text-yellow-400';
            case 'Low': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    const statusFilters = ['All', 'Open', 'Pending', 'Closed'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Ticket List */}
            <div className="lg:col-span-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                {/* Filter Tabs */}
                <div className="p-4 border-b border-white/10 bg-black/20">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {statusFilters.map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filterStatus === status
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ticket List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p>Loading tickets...</p>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Inbox className="w-12 h-12 mb-4 opacity-30" />
                            <p>No tickets found</p>
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => {
                                    setSelectedTicket(ticket);
                                    loadTicketDetails(ticket.id);
                                }}
                                className={`p-4 rounded-xl border cursor-pointer transition-all group relative ${selectedTicket?.id === ticket.id
                                        ? 'bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-purple-500/50'
                                        : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                                    }`}
                            >
                                {/* Delete Button */}
                                <button
                                    onClick={(e) => handleDelete(e, ticket.id)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                    title="Delete Ticket"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>

                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(ticket.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="font-bold text-white mb-2 line-clamp-1 pr-6">{ticket.subject}</h4>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">{ticket.user_name}</span>
                                    <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Ticket Detail */}
            <div className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                {selectedTicket ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 bg-black/20">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                                        <span className="text-sm text-gray-500 bg-white/5 px-2 py-0.5 rounded">#{selectedTicket.id}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        <span className="text-gray-400">
                                            User: <span className="text-white font-medium">{selectedTicket.user_name}</span>
                                        </span>
                                        <span className="text-gray-400">
                                            Category: <span className="text-purple-400">{selectedTicket.category}</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-end gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1.5">Priority</label>
                                        <select
                                            value={selectedTicket.priority}
                                            onChange={(e) => updatePriority(e.target.value)}
                                            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                                        >
                                            <option>Low</option>
                                            <option>Medium</option>
                                            <option>High</option>
                                            <option>Urgent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1.5">Status</label>
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => updateStatus(e.target.value)}
                                            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                                        >
                                            <option>Open</option>
                                            <option>Pending</option>
                                            <option>Closed</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, selectedTicket.id)}
                                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all"
                                        title="Delete Ticket"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/10">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.is_admin_reply
                                            ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20'
                                            : 'bg-white/5 text-gray-200 border border-white/10'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-2 text-xs opacity-70">
                                            <span className="font-bold">
                                                {msg.is_admin_reply ? 'Support Team' : selectedTicket.user_name}
                                            </span>
                                            <span>•</span>
                                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <form onSubmit={handleReply} className="flex gap-3">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !replyText.trim()}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
                                >
                                    <Send className="w-4 h-4" />
                                    <span className="hidden sm:inline">Reply</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="p-6 rounded-full bg-white/5 mb-6">
                            <MessageSquare className="w-12 h-12 opacity-30" />
                        </div>
                        <p className="text-lg font-medium mb-2">No Ticket Selected</p>
                        <p className="text-sm text-gray-600">Select a ticket from the list to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}
