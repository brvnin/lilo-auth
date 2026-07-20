import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/products';
import { licenseService } from '@/services/licenses';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    Plus,
    Trash2,
    Copy,
    Check,
    History as HistoryIcon,
    Key,
    ShieldCheck,
    Search,
    Clock,
    User,
    ArrowUpRight
} from 'lucide-react';


type TabType = 'active' | 'renewals';

export default function Licenses() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [subType, setSubType] = useState('monthly');
    const [quantity, setQuantity] = useState(1);
    const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
    const [showUsed, setShowUsed] = useState(true);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: productService.getAll
    });

    const { data: licenses, isLoading: licensesLoading } = useQuery({
        queryKey: ['licenses'],
        queryFn: licenseService.getAll
    });

    const { data: renewals, isLoading: renewalsLoading } = useQuery({
        queryKey: ['renewals'],
        queryFn: () => licenseService.getRenewals(),
        enabled: activeTab === 'renewals'
    });

    const generateMutation = useMutation({
        mutationFn: licenseService.generate,
        onSuccess: (keys) => {
            queryClient.invalidateQueries({ queryKey: ['licenses'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            setGeneratedKeys(keys);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({ key, force }: { key: string, force: boolean }) =>
            licenseService.delete(key, force),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['licenses'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        }
    });

    const handleGenerate = () => {
        if (!selectedProduct) return;
        generateMutation.mutate({
            product_id: parseInt(selectedProduct),
            subscription_type: subType,
            quantity
        });
    };

    const handleDelete = (key: string, isUsed: boolean) => {
        if (!confirm(isUsed ? 'License is already redeemed. Force purge?' : 'Are you sure you want to delete this key?')) return;
        deleteMutation.mutate({ key, force: isUsed });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(text);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const filteredLicenses = licenses?.filter(l => {
        const matchesSearch = l.license_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.used_by?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUsed = showUsed || !l.used;
        return matchesSearch && matchesUsed;
    });

    const filteredRenewals = renewals?.filter(r =>
        r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.license_key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent uppercase">
                        License Logistics
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">Generate distribution keys and track subscription renewals.</p>
                </div>
                <div className="flex bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-2xl">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'active' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Key className="h-4 w-4" />
                        Active Keys
                    </button>
                    <button
                        onClick={() => setActiveTab('renewals')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'renewals' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <HistoryIcon className="h-4 w-4" />
                        Renewal History
                    </button>
                </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Generation Control Panel */}
                <aside className="lg:col-span-4 space-y-6">
                    <Card className="glass-card border-indigo-500/20 overflow-hidden sticky top-24">
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Plus className="h-5 w-5 text-indigo-400" />
                                Key Generation
                            </CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Initialization Parameters</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-muted-foreground">Target Deployment</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                                    value={selectedProduct}
                                    onChange={e => setSelectedProduct(e.target.value)}
                                >
                                    <option value="">Select a product...</option>
                                    {products?.map(p => (
                                        <option key={p.id} value={p.id}>{p.product_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-muted-foreground">Temporal Class</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                                    value={subType}
                                    onChange={e => setSubType(e.target.value)}
                                >
                                    <option value="trial">Trial (1 Day)</option>
                                    <option value="weekly">Weekly (7 Days)</option>
                                    <option value="monthly">Monthly (30 Days)</option>
                                    <option value="quarterly">Quarterly (90 Days)</option>
                                    <option value="yearly">Yearly (365 Days)</option>
                                    <option value="lifetime">Lifetime Access</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-muted-foreground">Batch Quantity</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    className="glass-input font-bold"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                                />
                            </div>

                            <Button
                                className="w-full premium-button py-6 shadow-indigo-500/20 shadow-lg"
                                onClick={handleGenerate}
                                disabled={!selectedProduct || generateMutation.isPending}
                            >
                                {generateMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                                Initialize Secure Keys
                            </Button>

                            {generatedKeys.length > 0 && (
                                <div className="mt-6 animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Generation Success</p>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold py-0" onClick={() => setGeneratedKeys([])}>Clear</Button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {generatedKeys.map(key => (
                                            <div
                                                key={key}
                                                onClick={() => copyToClipboard(key)}
                                                className="text-[10px] font-mono p-2 bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg cursor-pointer flex justify-between items-center group transition-all"
                                            >
                                                <span className="text-emerald-100">{key}</span>
                                                {copiedKey === key ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 text-emerald-400/50" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </aside>

                {/* Data Feed Section */}
                <main className="lg:col-span-8 flex flex-col space-y-6">
                    <Card className="glass-card border-white/5 overflow-hidden flex-1">
                        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tight">
                                    {activeTab === 'active' ? 'Active Matrix' : 'Renewal Chronicles'}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase">Real-time Data Stream</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-white transition-colors" />
                                    <Input
                                        placeholder="Search feed..."
                                        className="h-9 w-48 pl-9 py-0 text-xs glass-input"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {activeTab === 'active' && (
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                                        <Label htmlFor="used-filter" className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer">Show Redeemed</Label>
                                        <input
                                            type="checkbox"
                                            id="used-filter"
                                            checked={showUsed}
                                            onChange={(e) => setShowUsed(e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-white/10 bg-black/40 text-indigo-500 focus:ring-transparent"
                                        />
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {activeTab === 'active' ? (
                                licensesLoading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-500" /></div> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pulse Identity</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Allocation</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Temporal Class</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status Matrix</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Overrides</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredLicenses?.map((license) => (
                                                    <tr key={license.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="font-mono text-[11px] text-indigo-100 flex items-center gap-2">
                                                                    <Key className="h-3 w-3 text-indigo-400/50" />
                                                                    {license.license_key}
                                                                    <button onClick={() => copyToClipboard(license.license_key)} className="text-muted-foreground hover:text-white transition-colors">
                                                                        {copiedKey === license.license_key ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px] font-black bg-indigo-500/5 border-indigo-500/30 text-indigo-300">
                                                                    {license.product?.product_name}
                                                                </Badge>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                                                            {license.subscription_type}
                                                        </td>
                                                        <td className="p-4">
                                                            {license.used ? (
                                                                <div className="space-y-1">
                                                                    <Badge className="bg-white/10 text-muted-foreground text-[9px] font-black uppercase">Redeemed</Badge>
                                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-400">
                                                                        <User className="h-3 w-3" />
                                                                        {license.used_by}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-black uppercase shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                                    Available
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                                onClick={() => handleDelete(license.license_key, license.used)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                renewalsLoading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-purple-500" /></div> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operative</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Temporal Leap</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Security Proof (Key)</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trace (IP)</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredRenewals?.map((renewal) => (
                                                    <tr key={renewal.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                                                    <User className="h-4 w-4 text-purple-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-purple-100">{renewal.username}</p>
                                                                    <p className="text-[9px] font-black text-muted-foreground uppercase">{renewal.product?.product_name || 'Legacy System'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px] font-black bg-white/5 border-white/10 text-muted-foreground">
                                                                    {renewal.old_subscription_type || 'NONE'}
                                                                </Badge>
                                                                <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                                                                <Badge variant="outline" className="text-[9px] font-black bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                                                    {renewal.new_subscription_type}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-muted-foreground mt-1">+{renewal.days_added} Days Access</p>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="font-mono text-[10px] text-muted-foreground bg-black/20 p-1.5 rounded border border-white/5 group-hover:border-white/20 transition-colors">
                                                                {renewal.license_key}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" title="Network Origin Found" />
                                                                {renewal.ip_address}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="text-[10px] font-bold text-muted-foreground flex flex-col items-end">
                                                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {new Date(renewal.renewed_at).toLocaleDateString()}</span>
                                                                <span className="text-[9px] opacity-50 uppercase">{new Date(renewal.renewed_at).toLocaleTimeString()}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {((activeTab === 'active' && (!filteredLicenses || filteredLicenses.length === 0)) ||
                                (activeTab === 'renewals' && (!filteredRenewals || filteredRenewals.length === 0))) && (
                                    <div className="text-center py-20">
                                        <HistoryIcon className="h-16 w-16 text-muted-foreground/10 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-muted-foreground uppercase tracking-widest">Feed Empty</h3>
                                        <p className="text-sm text-muted-foreground mt-2">No relevant entries discovered in the current data stream.</p>
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
