import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { botService } from '@/services/bot';
import type { GuildBotSettings, BotAutomation, BotLogsConfig, RealLog } from '@/services/bot';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/select';
import {
    Bot,
    Shield,
    Layout,
    Ticket,
    Users,
    Zap,
    Save,
    Loader2,
    MessageSquare,
    Eye,
    Plus,
    Trash2,
    Settings,
    FileText,
    Bell,
    Mic,
    ShieldAlert,
    Clock,
    UserPlus,
    UserMinus,
    Mail,
} from 'lucide-react';

type TabType = 'overview' | 'protection' | 'moderation' | 'automation' | 'logging' | 'embeds';

export default function BotManager() {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [guildId, setGuildId] = useState('');
    const [newBlacklistWord, setNewBlacklistWord] = useState('');

    // Local State for Forms (Unbound from Query to fix typing)
    const [localSettings, setLocalSettings] = useState<Partial<GuildBotSettings>>({});
    const [localAutomation, setLocalAutomation] = useState<Partial<BotAutomation>>({});
    const [localLogsConfig, setLocalLogsConfig] = useState<Partial<BotLogsConfig>>({});

    // Embed Builder State
    const [newEmbed, setNewEmbed] = useState({
        name: '',
        title: '',
        description: '',
        image_url: '',
        color: '#6366f1'
    });
    const [sendTargetChannel, setSendTargetChannel] = useState('');

    const queryClient = useQueryClient();

    // Queries
    const { data: guilds } = useQuery({
        queryKey: ['bot-guilds'],
        queryFn: botService.getGuilds
    });

    const { data: channels } = useQuery({
        queryKey: ['bot-channels', guildId],
        queryFn: () => botService.getChannels(guildId),
        enabled: !!guildId
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['bot-stats'],
        queryFn: botService.getStats
    });

    const { data: settings } = useQuery({
        queryKey: ['bot-settings', guildId],
        queryFn: () => botService.getGuildSettings(guildId),
        enabled: !!guildId
    });

    const { data: blacklist } = useQuery({
        queryKey: ['bot-blacklist', guildId],
        queryFn: () => botService.getBlacklist(guildId),
        enabled: !!guildId && activeTab === 'protection'
    });

    const { data: automation } = useQuery({
        queryKey: ['bot-automation', guildId],
        queryFn: () => botService.getAutomation(guildId),
        enabled: !!guildId && activeTab === 'automation'
    });

    const { data: logsConfig } = useQuery({
        queryKey: ['bot-logs', guildId],
        queryFn: () => botService.getLogsConfig(guildId),
        enabled: !!guildId && activeTab === 'logging'
    });

    const { data: realLogs } = useQuery<RealLog[]>({
        queryKey: ['bot-logs-real', guildId],
        queryFn: () => botService.getRealLogs(guildId),
        enabled: !!guildId && activeTab === 'overview',
        refetchInterval: 5000
    });

    const { data: embeds } = useQuery({
        queryKey: ['bot-embeds', guildId],
        queryFn: () => botService.getGuildEmbeds(guildId),
        enabled: !!guildId && activeTab === 'embeds'
    });

    // Sync Local State when Data Loads
    useEffect(() => { if (settings) setLocalSettings(settings); }, [settings]);
    useEffect(() => { if (automation) setLocalAutomation(automation); }, [automation]);
    useEffect(() => { if (logsConfig) setLocalLogsConfig(logsConfig); }, [logsConfig]);

    // Auto-select first guild when guilds load
    useEffect(() => {
        if (guilds && guilds.length > 0 && !guildId) {
            setGuildId(guilds[0].id);
        }
    }, [guilds, guildId]);

    const handleGuildChange = (val: string) => {
        setGuildId(val);
        // Clear dependent data if needed
    };

    // Mutations
    const updateSettings = useMutation({
        mutationFn: (data: Partial<GuildBotSettings>) => botService.updateGuildSettings(guildId, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-settings', guildId] })
    });

    const addWord = useMutation({
        mutationFn: (word: string) => botService.addBlacklistWord(guildId, word),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bot-blacklist', guildId] });
            setNewBlacklistWord('');
        }
    });

    const removeWord = useMutation({
        mutationFn: (word: string) => botService.removeBlacklistWord(guildId, word),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-blacklist', guildId] })
    });

    const updateAutomation = useMutation({
        mutationFn: (data: Partial<BotAutomation>) => botService.updateAutomation(guildId, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-automation', guildId] })
    });

    const updateLogs = useMutation({
        mutationFn: (data: Partial<BotLogsConfig>) => botService.updateLogsConfig(guildId, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-logs', guildId] })
    });

    const saveEmbed = useMutation({
        mutationFn: (data: any) => botService.saveEmbed(guildId, data.name, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bot-embeds', guildId] });
            alert('Embed saved successfully!');
        }
    });

    const sendEmbed = useMutation({
        mutationFn: (embedName: string) => botService.sendEmbed(guildId, sendTargetChannel, embedName),
        onSuccess: () => alert('Embed queued for sending!'),
        onError: (err: any) => alert('Failed to send: ' + (err.response?.data?.error || err.message))
    });

    const resyncCache = useMutation({
        mutationFn: () => botService.resyncCache(guildId),
        onSuccess: () => alert('Cache resync queued! Wait a few seconds then refresh.'),
    });

    if (statsLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-50" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase italic">
                        Bot Control Center v2.0
                    </h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Settings className="h-3 w-3" /> Unified Manager for Zzenith Discord Service
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] uppercase font-black text-emerald-400 tracking-tighter">System Nominal</span>
                    </div>
                </div>
            </header>

            {/* Navigation & Guild Picker */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-white/[0.03] backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1">
                    {[
                        { id: 'overview', label: 'Home', icon: Bot },
                        { id: 'protection', label: 'Security', icon: Shield },
                        { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
                        { id: 'automation', label: 'Automation', icon: Zap },
                        { id: 'logging', label: 'Logs', icon: FileText },
                        { id: 'embeds', label: 'Embeds', icon: Layout },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center space-x-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-3xl transition-all duration-500 ${isActive
                                    ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                                    : 'text-muted-foreground hover:text-indigo-200 hover:bg-white/5'
                                    }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                                <span className="hidden md:block">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center gap-3 px-4 py-1.5 border-l border-white/5">
                    <Badge variant="outline" className="text-[10px] uppercase font-black border-white/10 opacity-50">Active Guild</Badge>
                    <Select
                        className="glass-input h-10 w-64 text-[10px] font-bold tracking-tighter bg-black/40 border-none focus-visible:ring-indigo-500/50 rounded-2xl"
                        value={guildId}
                        onChange={(e) => handleGuildChange(e.target.value)}
                    >
                        {guilds?.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </Select>
                </div>
            </div>

            <main className="grid gap-6">
                {activeTab === 'overview' && (
                    <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Highlights Grid */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'Active Tickets', val: stats?.tickets.open, total: stats?.tickets.total, icon: Ticket, color: 'blue' },
                                { label: 'Tracked Invites', val: stats?.invites_tracked, icon: Users, color: 'purple' },
                                { label: 'Embed Library', val: stats?.saved_embeds, icon: Layout, color: 'indigo' },
                                { label: 'Security Status', val: 'PROTECTED', icon: Shield, color: 'emerald' },
                            ].map((s, idx) => (
                                <Card key={idx} className="glass-card group overflow-hidden border-none relative">
                                    <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 bg-gradient-to-br from-white to-transparent rounded-full -mr-10 -mt-10`} />
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-4 bg-${s.color}-500/10 rounded-3xl border border-${s.color}-500/20`}>
                                                <s.icon className={`h-6 w-6 text-${s.color}-400`} />
                                            </div>
                                            {s.total !== undefined && <span className="text-[10px] font-black opacity-30 italic">Total: {s.total}</span>}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-4xl font-black text-white tracking-tighter drop-shadow-2xl">{s.val || 0}</h3>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">{s.label}</p>
                                        </div>
                                    </CardContent>
                                    <div className={`h-1 w-full bg-gradient-to-r from-transparent via-${s.color}-500/50 to-transparent bottom-0 absolute`} />
                                </Card>
                            ))}
                        </div>

                        <div className="grid gap-6 md:grid-cols-12">
                            <Card className="md:col-span-8 glass-card border-none">
                                <CardHeader>
                                    <CardTitle className="text-lg font-black uppercase italic tracking-widest text-indigo-100">System Logs Preview</CardTitle>
                                    <CardDescription className="text-xs uppercase font-bold opacity-50">Latest events from the Discord infrastructure</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 font-mono text-[10px] leading-relaxed">
                                        {realLogs?.map((log) => (
                                            <div key={log.id} className="flex gap-4 p-3 bg-black/40 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
                                                <span className="opacity-30">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                                                <span className={`font-black uppercase ${log.type === 'mod' ? 'text-red-400' :
                                                    log.type === 'msg' ? 'text-blue-400' :
                                                        log.type === 'server' ? 'text-purple-400' :
                                                            'text-emerald-400'
                                                    }`}>[{log.type}]</span>
                                                <span className="text-muted-foreground">{log.content}</span>
                                            </div>
                                        ))}
                                        {(!realLogs || realLogs.length === 0) && (
                                            <div className="p-8 text-center opacity-30 italic uppercase tracking-widest">No recent events logged</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-4 glass-card border-none flex flex-col justify-between">
                                <CardHeader>
                                    <CardTitle className="text-lg font-black uppercase italic tracking-widest text-indigo-100">Maintenance</CardTitle>
                                    <CardDescription className="text-xs uppercase font-bold opacity-50">Global control overrides</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button className="w-full h-16 rounded-[2rem] bg-indigo-500 text-white font-black uppercase tracking-widest hover:bg-indigo-600 shadow-[0_10px_40px_rgba(99,102,241,0.3)] border-t border-white/20">
                                        <Zap className="h-5 w-5 mr-3 animate-pulse" /> Force Restart
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full h-14 rounded-[2rem] border-white/10 bg-white/5 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10"
                                        onClick={() => resyncCache.mutate()}
                                        disabled={resyncCache.isPending}
                                    >
                                        {resyncCache.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                        Re-Sync Bot Cache
                                    </Button>
                                    <Button variant="destructive" className="w-full h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase">
                                        Emergency Lockdown
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'protection' && (
                    <div className="grid gap-6 animate-in slide-in-from-right-4 duration-500">
                        <Card className="glass-card border-none">
                            <CardHeader className="flex flex-row items-center justify-between bg-white/[0.02] p-8">
                                <div>
                                    <CardTitle className="text-2xl font-black italic uppercase tracking-[0.2em]">Security Suite</CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-bold opacity-50">Automated moderation & raid protection</CardDescription>
                                </div>
                                <Button
                                    className="premium-button px-10 rounded-full h-12"
                                    onClick={() => updateSettings.mutate(localSettings)}
                                    disabled={updateSettings.isPending}
                                >
                                    {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Commit Policies
                                </Button>
                            </CardHeader>
                            <CardContent className="p-8 grid gap-8 lg:grid-cols-2">
                                {/* Toggles */}
                                <div className="space-y-6">
                                    <div className="p-6 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
                                            <Settings className="h-3 w-3" /> Core Filters
                                        </h4>
                                        {[
                                            { id: 'anti_spam_enabled', label: 'Flood-Gate (Anti-Spam)', desc: 'Blocks fast repetitive messages' },
                                            { id: 'anti_links_enabled', label: 'Link Suppression', desc: 'Blocks all URLs from non-staff' },
                                            { id: 'anti_raid_enabled', label: 'Raid Shield', desc: 'Activates verification gate' },
                                        ].map(f => (
                                            <div key={f.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-3xl border border-white/5">
                                                <div className="space-y-1">
                                                    <span className="font-black text-xs uppercase tracking-tight text-white">{f.label}</span>
                                                    <p className="text-[10px] text-muted-foreground font-bold">{f.desc}</p>
                                                </div>
                                                <Checkbox
                                                    checked={localSettings[f.id as keyof GuildBotSettings] as boolean}
                                                    onCheckedChange={(c: boolean) => setLocalSettings(prev => ({ ...prev, [f.id]: c }))}
                                                    className="h-6 w-6 border-indigo-500/30"
                                                />
                                            </div>
                                        ))}

                                        <div className="space-y-3 pt-4">
                                            <Label className="text-[10px] font-black uppercase opacity-50 tracking-widest">Raid Gate Config: Min. Account Age (Days)</Label>
                                            <div className="flex gap-4">
                                                <Input
                                                    type="number"
                                                    className="glass-input flex-1 h-12 bg-black/40 rounded-2xl text-white"
                                                    value={localSettings.min_account_age_days || 0}
                                                    onChange={(e) => setLocalSettings(prev => ({ ...prev, min_account_age_days: parseInt(e.target.value) }))}
                                                />
                                                <Button variant="outline" className="h-12 border-white/5 px-6 rounded-2xl" onClick={() => setLocalSettings(prev => ({ ...prev, min_account_age_days: 0 }))}>Bypass</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Blacklist */}
                                <div className="p-6 bg-black/40 rounded-[2.5rem] border border-white/5 flex flex-col h-full">
                                    <h4 className="text-xs font-black uppercase tracking-widest opacity-50 flex items-center gap-2 mb-6">
                                        <ShieldAlert className="h-3 w-3" /> Keyword Blacklist
                                    </h4>
                                    <div className="flex gap-2 mb-6">
                                        <Input
                                            placeholder="Enter dynamic trigger word..."
                                            className="glass-input flex-1 rounded-3xl"
                                            value={newBlacklistWord}
                                            onChange={(e) => setNewBlacklistWord(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addWord.mutate(newBlacklistWord)}
                                        />
                                        <Button className="h-12 w-12 rounded-full p-0 bg-indigo-500 hover:bg-indigo-600" onClick={() => addWord.mutate(newBlacklistWord)}>
                                            <Plus className="h-6 w-6" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[400px]">
                                        {blacklist?.map(word => (
                                            <div key={word} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-red-500/30 transition-all duration-500">
                                                <span className="text-xs font-bold font-mono tracking-tighter">{word}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeWord.mutate(word)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {(!blacklist || blacklist.length === 0) && (
                                            <div className="h-40 flex flex-col items-center justify-center opacity-30 text-center">
                                                <Bell className="h-8 w-8 mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Repository Empty</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'moderation' && (
                    <div className="grid gap-6 animate-in slide-in-from-left-4 duration-500">
                        <div className="grid gap-6 lg:grid-cols-12">
                            <div className="lg:col-span-4">
                                <Card className="glass-card border-none h-full">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-black uppercase italic tracking-widest">Active Punishments</CardTitle>
                                        <CardDescription className="text-xs font-bold opacity-50">Manage timed mutes and bans</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-10 border border-dashed border-white/10 rounded-[2.5rem] text-center opacity-30">
                                            <Clock className="h-12 w-12 mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase">No active timeouts</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-8">
                                <Card className="glass-card border-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-black uppercase italic tracking-widest text-red-100">Warn Repository</CardTitle>
                                        <CardDescription className="text-xs font-bold opacity-50">Filter by User ID to view violation history</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-4 mb-8">
                                            <Input placeholder="Enter Discord ID..." className="glass-input flex-1 rounded-[2rem] h-14 pl-8" />
                                            <Button className="h-14 px-10 rounded-[2rem] bg-indigo-500 font-black uppercase tracking-widest">Fetch History</Button>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="p-20 text-center opacity-10">
                                                <FileText className="h-20 w-20 mx-auto opacity-20" />
                                                <p className="font-bold uppercase tracking-[0.5em] text-sm">Select user to view history</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'automation' && (
                    <div className="grid gap-6 animate-in zoom-in-95 duration-500">
                        <Card className="glass-card border-none overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent p-10 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-black italic uppercase tracking-[0.2em] flex items-center gap-4">
                                        <Zap className="h-8 w-8 text-amber-400" />
                                        Automation Hub
                                    </CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-black opacity-50 tracking-[0.3em]">Join / Leave / Auto-Reponse Management</CardDescription>
                                </div>
                                <Button className="premium-button px-10 rounded-full h-12" onClick={() => updateAutomation.mutate(localAutomation)}>
                                    <Save className="h-4 w-4 mr-2" /> Sync Automation
                                </Button>
                            </CardHeader>
                            <CardContent className="p-10">
                                <div className="grid gap-10 md:grid-cols-2">
                                    {/* Welcome Messages */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                                <UserPlus className="h-6 w-6 text-emerald-400" />
                                            </div>
                                            <h4 className="font-black uppercase tracking-widest text-indigo-50">Welcome Sequence</h4>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase opacity-50">Broadcast Channel</Label>
                                                <Select
                                                    className="glass-input rounded-2xl bg-black/40 h-12"
                                                    value={localAutomation?.welcome_channel_id || ''}
                                                    onChange={(e) => setLocalAutomation(prev => ({ ...prev, welcome_channel_id: e.target.value }))}
                                                >
                                                    <option value="">None / Disabled</option>
                                                    {channels?.filter(c => c.type === 'text' || c.type === 'guild_text').map(c => (
                                                        <option key={c.id} value={c.id}>#{c.name}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase opacity-50">Message Body</Label>
                                                <Textarea
                                                    className="glass-input rounded-3xl bg-black/40 min-h-[150px] pt-4 text-white"
                                                    placeholder="Welcome {user} to {server}!"
                                                    value={localAutomation?.welcome_message || ''}
                                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalAutomation(prev => ({ ...prev, welcome_message: e.target.value }))}
                                                />
                                                <p className="text-[9px] font-mono text-muted-foreground flex justify-between uppercase font-bold px-2">
                                                    <span>Variables: {"{user}"}, {"{server}"}</span>
                                                    <span>Optional Embed ID support</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Goodbye Messages */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-3 bg-red-500/10 rounded-2xl">
                                                <UserMinus className="h-6 w-6 text-red-400" />
                                            </div>
                                            <h4 className="font-black uppercase tracking-widest text-indigo-50">Goodbye Handshake</h4>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase opacity-50">Broadcast Channel</Label>
                                                <Select
                                                    className="glass-input rounded-2xl bg-black/40 h-12"
                                                    value={localAutomation?.goodbye_channel_id || ''}
                                                    onChange={(e) => setLocalAutomation(prev => ({ ...prev, goodbye_channel_id: e.target.value }))}
                                                >
                                                    <option value="">None / Disabled</option>
                                                    {channels?.filter(c => c.type === 'text' || c.type === 'guild_text').map(c => (
                                                        <option key={c.id} value={c.id}>#{c.name}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase opacity-50">Message Body</Label>
                                                <Textarea
                                                    className="glass-input rounded-3xl bg-black/40 min-h-[150px] pt-4 text-white"
                                                    placeholder="{user} has left our dimension."
                                                    value={localAutomation?.goodbye_message || ''}
                                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalAutomation(prev => ({ ...prev, goodbye_message: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'logging' && (
                    <div className="animate-in slide-in-from-top-4 duration-500">
                        <Card className="glass-card border-none">
                            <CardHeader className="p-10 bg-white/[0.01] flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-black italic uppercase tracking-[0.2em] flex items-center gap-4">
                                        <FileText className="h-8 w-8 text-blue-400" />
                                        Environmental Logging
                                    </CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-black opacity-50 tracking-[0.3em]">Configure destination channels for all system events</CardDescription>
                                </div>
                                <Button className="premium-button px-10 rounded-full h-12" onClick={() => updateLogs.mutate(localLogsConfig)}>
                                    <Save className="h-4 w-4 mr-2" /> Commit Channels
                                </Button>
                            </CardHeader>
                            <CardContent className="p-10">
                                <div className="grid gap-8 md:grid-cols-2">
                                    {[
                                        { id: 'msg_log_channel', label: 'Message Tracking', desc: 'Edits & Deletions', icon: MessageSquare },
                                        { id: 'member_log_channel', label: 'Member Tracking', desc: 'Join / Leave / Nicknames', icon: Users },
                                        { id: 'voice_log_channel', label: 'Voice Tracking', desc: 'Connection updates', icon: Mic },
                                        { id: 'mod_log_channel', label: 'Moderation Logs', desc: 'Ban / Kick / Mutes', icon: ShieldAlert },
                                        { id: 'server_log_channel', label: 'Server Updates', desc: 'Channel & Role changes', icon: Bot },
                                    ].map(log => (
                                        <div key={log.id} className="p-6 bg-black/40 rounded-[2rem] border border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                                    <log.icon className="h-6 w-6 text-indigo-400 opacity-60" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-white">{log.label}</h4>
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{log.desc}</p>
                                                </div>
                                            </div>
                                            <Select
                                                className="glass-input w-56 h-12 text-xs font-bold tracking-tighter bg-black/20 text-center rounded-2xl"
                                                value={localLogsConfig?.[log.id as keyof BotLogsConfig] || ''}
                                                onChange={(e) => setLocalLogsConfig(prev => ({ ...prev, [log.id]: e.target.value }))}
                                            >
                                                <option value="">None / Off</option>
                                                {channels?.filter(c => c.type === 'text' || c.type === 'guild_text').map(c => (
                                                    <option key={c.id} value={c.id}>#{c.name}</option>
                                                ))}
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'embeds' && (
                    <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-500">
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <Card className="glass-card border-none flex-1">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase italic tracking-widest">Saved Repository</CardTitle>
                                        <CardDescription className="text-xs font-bold opacity-50">Stored templates for quick deployment</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-[10px] uppercase font-black opacity-40">Target Channel:</Label>
                                            <Select
                                                className="glass-input h-9 w-48 text-[10px] bg-black/40 border-white/10"
                                                value={sendTargetChannel}
                                                onChange={(e) => setSendTargetChannel(e.target.value)}
                                            >
                                                <option value="">Choose Channel...</option>
                                                {channels?.filter(c => c.type === 'text' || c.type === 'guild_text').map(c => (
                                                    <option key={c.id} value={c.id}>#{c.name}</option>
                                                ))}
                                            </Select>
                                        </div>
                                        <Button className="premium-button px-6 rounded-full blur-none scale-90">
                                            <Plus className="h-4 w-4 mr-2" /> Initialize New Template
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {embeds?.map(embed => (
                                            <Card key={embed.id} className="glass-card bg-white/[0.01] hover:bg-white/[0.04] transition-all duration-300 border-l-4" style={{ borderLeftColor: embed.color }}>
                                                <CardContent className="p-5 flex flex-col justify-between h-40">
                                                    <div>
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-black text-white italic tracking-widest uppercase">{embed.name}</h4>
                                                            <Badge className="bg-white/10 text-[8px] uppercase font-black text-indigo-300 border-none">
                                                                {embed.fields?.length || 0} Fields
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-muted-foreground mt-2 line-clamp-2 uppercase leading-relaxed">
                                                            {embed.title || 'Untitled Container'} – {embed.description || 'No description provided.'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-auto">
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-emerald-400 hover:bg-emerald-400/10 rounded-full">
                                                            <Eye className="h-5 w-5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-10 w-10 text-indigo-400 hover:bg-indigo-400/10 rounded-full"
                                                            disabled={!sendTargetChannel || sendEmbed.isPending}
                                                            onClick={() => sendEmbed.mutate(embed.name)}
                                                        >
                                                            {sendEmbed.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-5 w-5" />}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-red-400 rounded-full ml-auto">
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-4">
                            <Card className="glass-card border-none sticky top-6 bg-gradient-to-b from-white/[0.03] to-indigo-500/5">
                                <CardHeader>
                                    <CardTitle className="text-lg font-black uppercase italic tracking-widest text-white">Visual Builder</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase opacity-50">WYSIWYG Construction</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-8 border border-dashed border-white/10 rounded-[3rem] text-center opacity-20 hover:opacity-100 transition-opacity duration-700 group">
                                        <Plus className="h-20 w-20 mx-auto mb-4 text-white group-hover:scale-110 transition-transform duration-500" />
                                        <p className="text-xs font-black uppercase tracking-[0.3em]">Construct New Embed</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black opacity-40 ml-4">Template Name</Label>
                                            <Input
                                                className="glass-input h-12 w-full bg-white/5 rounded-3xl border border-white/5 px-6 text-xs font-bold text-white"
                                                placeholder="e.g. welcome_embed"
                                                value={newEmbed.name}
                                                onChange={(e) => setNewEmbed(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black opacity-40 ml-4">Embed Title</Label>
                                            <Input
                                                className="glass-input h-12 w-full bg-white/5 rounded-3xl border border-white/5 px-6 text-xs font-bold text-white"
                                                placeholder="Container Title..."
                                                value={newEmbed.title}
                                                onChange={(e) => setNewEmbed(prev => ({ ...prev, title: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black opacity-40 ml-4">Description</Label>
                                            <Textarea
                                                className="glass-input min-h-[100px] w-full bg-white/5 rounded-3xl border border-white/5 p-6 text-xs font-bold text-white pt-4"
                                                placeholder="Body Content..."
                                                value={newEmbed.description}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewEmbed(prev => ({ ...prev, description: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black opacity-40 ml-4">Accent Color (HEX)</Label>
                                            <Input
                                                className="glass-input h-12 w-full bg-white/5 rounded-3xl border border-white/5 px-6 text-xs font-bold text-white"
                                                placeholder="#6366f1"
                                                value={newEmbed.color}
                                                onChange={(e) => setNewEmbed(prev => ({ ...prev, color: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full h-14 rounded-full bg-indigo-500 font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-transform"
                                        onClick={() => saveEmbed.mutate(newEmbed)}
                                        disabled={saveEmbed.isPending || !newEmbed.name}
                                    >
                                        {saveEmbed.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Template
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
