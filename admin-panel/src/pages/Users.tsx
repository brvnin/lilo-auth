import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/users';
import { productService } from '@/services/products';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    Ban,
    MonitorX,
    Trash2,
    Pencil,
    Search,
    RotateCcw,
    Key,
    ShieldAlert,
    User as UserIcon,
    X,
    CalendarPlus
} from 'lucide-react';
import type { User } from '@/types';

export default function Users() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('');
    const [editingSub, setEditingSub] = useState<User | null>(null);
    const [extendingSub, setExtendingSub] = useState<User | null>(null);
    const [resettingPass, setResettingPass] = useState<User | null>(null);

    // Form states
    const [selectedProduct, setSelectedProduct] = useState('');
    const [subType, setSubType] = useState('monthly');
    const [extendDays, setExtendDays] = useState(30);
    const [newPass, setNewPass] = useState('');

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: userService.getAll
    });

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: productService.getAll,
        enabled: !!editingSub || !!extendingSub
    });

    const banMutation = useMutation({
        mutationFn: userService.ban,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    });

    const hwidBanMutation = useMutation({
        mutationFn: userService.banHwid,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    });

    const resetHwidMutation = useMutation({
        mutationFn: userService.resetHwid,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            alert('HWID Reset Successful');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: userService.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    });

    const updateSubMutation = useMutation({
        mutationFn: ({ username, data }: { username: string, data: any }) =>
            userService.updateSubscription(username, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditingSub(null);
        }
    });

    const extendSubMutation = useMutation({
        mutationFn: ({ username, days, productId }: { username: string, days: number, productId?: number }) =>
            userService.extendSubscription(username, days, productId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setExtendingSub(null);
            alert('Subscription Extended Successfully');
        }
    });

    const resetPassMutation = useMutation({
        mutationFn: ({ username, pass }: { username: string, pass: string }) =>
            userService.resetPassword(username, pass),
        onSuccess: () => {
            setResettingPass(null);
            setNewPass('');
            alert('Password Reset Successful');
        }
    });

    const handleBan = (username: string) => {
        if (confirm(`Toggle ban for ${username}?`)) banMutation.mutate(username);
    };

    const handleHwidBan = (username: string) => {
        if (confirm(`Toggle HWID ban for ${username}?`)) hwidBanMutation.mutate(username);
    };

    const handleResetHwid = (username: string) => {
        if (confirm(`Reset HWID for ${username}?`)) resetHwidMutation.mutate(username);
    };

    const handleDelete = (username: string) => {
        if (confirm(`PERMANENTLY DELETE user ${username}? This action is irreversible.`)) deleteMutation.mutate(username);
    };

    const handleSaveSub = () => {
        if (!editingSub) return;
        updateSubMutation.mutate({
            username: editingSub.username,
            data: {
                subscription_type: subType,
                product_id: selectedProduct ? parseInt(selectedProduct) : undefined
            }
        });
    };

    const handleExtendSub = () => {
        if (!extendingSub) return;
        extendSubMutation.mutate({
            username: extendingSub.username,
            days: extendDays,
            productId: selectedProduct ? parseInt(selectedProduct) : undefined
        });
    };

    const handleResetPass = () => {
        if (!resettingPass || !newPass) return;
        resetPassMutation.mutate({ username: resettingPass.username, pass: newPass });
    };

    const filteredUsers = users?.filter(u =>
        u.username.toLowerCase().includes(filter.toLowerCase()) ||
        (u.hwid && u.hwid.toLowerCase().includes(filter.toLowerCase()))
    );

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-500" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent uppercase">
                        User Operatives
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">Manage permissions, subscriptions, and security overrides.</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <div className="absolute inset-0 bg-indigo-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
                    <Input
                        placeholder="Scan operatives by username or hardware ID..."
                        className="pl-10 glass-input"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
            </header>

            {(editingSub || extendingSub || resettingPass) && (
                <div className="grid gap-6 animate-in slide-in-from-top-4 duration-300">
                    <Card className="glass-card overflow-hidden border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    {editingSub && <Pencil className="h-5 w-5 text-indigo-400" />}
                                    {extendingSub && <CalendarPlus className="h-5 w-5 text-green-400" />}
                                    {resettingPass && <Key className="h-5 w-5 text-orange-400" />}
                                    {editingSub?.username || extendingSub?.username || resettingPass?.username}
                                </CardTitle>
                                <CardDescription className="font-mono text-[10px] uppercase tracking-widest">
                                    {editingSub ? 'Subscription Parameter Modification' : resettingPass ? 'Security Credential Override' : 'Subscription Temporal Extension'}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingSub(null); setExtendingSub(null); setResettingPass(null); }} className="h-8 w-8 hover:bg-white/10">
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {editingSub && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Target Product</Label>
                                            <select
                                                className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={selectedProduct}
                                                onChange={e => setSelectedProduct(e.target.value)}
                                            >
                                                <option value="">Global / Legacy Layer</option>
                                                {products?.map(p => (
                                                    <option key={p.id} value={p.id}>{p.product_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Tier Specification</Label>
                                            <select
                                                className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={subType}
                                                onChange={e => setSubType(e.target.value)}
                                            >
                                                {['trial', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime'].map(t => (
                                                    <option key={t} value={t}>{t.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button variant="ghost" onClick={() => setEditingSub(null)}>Discard</Button>
                                        <Button className="premium-button px-6" onClick={handleSaveSub} disabled={updateSubMutation.isPending}>
                                            {updateSubMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Update Parameters
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {extendingSub && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Target Deployment</Label>
                                            <select
                                                className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={selectedProduct}
                                                onChange={e => setSelectedProduct(e.target.value)}
                                            >
                                                <option value="">All Active Products</option>
                                                {products?.map(p => (
                                                    <option key={p.id} value={p.id}>{p.product_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Temporal Increment (Days)</Label>
                                            <Input
                                                type="number"
                                                className="glass-input"
                                                value={extendDays}
                                                onChange={e => setExtendDays(parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button variant="ghost" onClick={() => setExtendingSub(null)}>Abort</Button>
                                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all" onClick={handleExtendSub} disabled={extendSubMutation.isPending}>
                                            {extendSubMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Extend Access
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {resettingPass && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">New Security Protocol (Password)</Label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                className="glass-input pl-10 font-mono"
                                                placeholder="Enter secure password (min 8 chars)..."
                                                value={newPass}
                                                onChange={e => setNewPass(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button variant="ghost" onClick={() => setResettingPass(null)}>Cancel</Button>
                                        <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 transition-all" onClick={handleResetPass} disabled={resetPassMutation.isPending || newPass.length < 8}>
                                            {resetPassMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Override Credentials
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="glass-card border-white/5 overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Operative</th>
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Status Matrix</th>
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Hardware Identification</th>
                                    <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Overrides</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers?.map((user) => (
                                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                    <UserIcon className="h-5 w-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-indigo-100">{user.username}</p>
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {user.products && user.products.length > 0 ? user.products.map((up, i) => (
                                                            <Badge key={i} variant="outline" className="text-[9px] h-4 py-0 border-indigo-500/30 text-indigo-300 bg-indigo-500/5">
                                                                {up.product?.product_name || 'Legacy'} • {up.subscription_type.toUpperCase()}
                                                            </Badge>
                                                        )) : (
                                                            <span className="text-[10px] text-muted-foreground italic">No Active Deployments</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex gap-2">
                                                    {(user.is_banned || user.hwid_banned) ? (
                                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 uppercase text-[9px] font-black">
                                                            Neutralized
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase text-[9px] font-black shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                            Active
                                                        </Badge>
                                                    )}
                                                </div>
                                                {user.is_banned && <p className="text-[9px] text-red-400/70 font-mono uppercase tracking-tighter flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> System Ban Active</p>}
                                                {user.hwid_banned && <p className="text-[9px] text-red-400/70 font-mono uppercase tracking-tighter flex items-center gap-1"><MonitorX className="h-3 w-3" /> Hardware Blacklisted</p>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-mono text-muted-foreground break-all max-w-[200px]">
                                                    {user.hwid || <span className="italic opacity-50">No Pulse Detected</span>}
                                                </p>
                                                {user.hwid && (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-white/5 border-white/10">{user.hwid_resets} RESETS</Badge>
                                                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Last seen: {new Date(user.last_login || Date.now()).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-500/20 hover:text-indigo-400" title="Modify Subscription" onClick={() => setEditingSub(user)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400" title="Extend Temporal Access" onClick={() => setExtendingSub(user)}>
                                                    <CalendarPlus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-orange-500/20 hover:text-orange-400" title="Override Credentials" onClick={() => setResettingPass(user)}>
                                                    <Key className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-orange-400" title="Reset Hardware Identity" onClick={() => handleResetHwid(user.username)}>
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400" title="Neutralize Operative (System Ban)" onClick={() => handleBan(user.username)}>
                                                    <Ban className={`h-3.5 w-3.5 ${user.is_banned ? 'text-red-500' : ''}`} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-700/20 hover:text-red-600" title="Blacklist Hardware (HWID Ban)" onClick={() => handleHwidBan(user.username)}>
                                                    <MonitorX className={`h-3.5 w-3.5 ${user.hwid_banned ? 'text-red-500' : ''}`} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-600/20 hover:text-red-500" title="Purge Record" onClick={() => handleDelete(user.username)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {(!filteredUsers || filteredUsers.length === 0) && (
                <div className="text-center py-20 glass-card">
                    <UserIcon className="h-16 w-16 text-muted-foreground/10 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-muted-foreground uppercase tracking-widest">No Operatives Found</h3>
                    <p className="text-sm text-muted-foreground mt-2">The search query returned no matching pulse signatures.</p>
                </div>
            )}
        </div>
    );
}
