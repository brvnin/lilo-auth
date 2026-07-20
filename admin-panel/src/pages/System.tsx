import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemService } from '@/services/system';
import { productService } from '@/services/products';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import {
    Megaphone,
    UploadCloud,
    Cpu,
    Trash2,
    Plus,
    Link,
    Image as ImageIcon,
    Target,
    Calendar,
    ChevronRight,
    MousePointer2
} from 'lucide-react';
import type { Announcement, LoaderVersion, LoaderFeature } from '@/types';

export default function System() {
    const [activeTab, setActiveTab] = useState<'announcements' | 'versions' | 'features'>('announcements');
    const queryClient = useQueryClient();

    // Announcements Form State
    const [annTitle, setAnnTitle] = useState('');
    const [annMessage, setAnnMessage] = useState('');
    const [annType, setAnnType] = useState<Announcement['type']>('info');
    const [annPriority, setAnnPriority] = useState('0');
    const [annIcon, setAnnIcon] = useState('');
    const [annActionText, setAnnActionText] = useState('');
    const [annActionUrl, setAnnActionUrl] = useState('');
    const [annExpiresAt, setAnnExpiresAt] = useState('');
    const [annIsDismissible, setAnnIsDismissible] = useState(true);
    const [annTargetProducts, setAnnTargetProducts] = useState<number[]>([]);

    // Version Form State
    const [verNumber, setVerNumber] = useState('');
    const [verUrl, setVerUrl] = useState('');
    const [verChangelog, setVerChangelog] = useState('');
    const [verIsCurrent, setVerIsCurrent] = useState(false);
    const [verIsRequired, setVerIsRequired] = useState(false);

    // Queries
    const { data: announcements } = useQuery({ queryKey: ['announcements'], queryFn: systemService.getAnnouncements });
    const { data: versions } = useQuery({ queryKey: ['versions'], queryFn: systemService.getVersions });
    const { data: features } = useQuery({ queryKey: ['features'], queryFn: systemService.getFeatures });
    const { data: products } = useQuery({ queryKey: ['products'], queryFn: productService.getAll });

    // Mutations
    const createAnnouncement = useMutation({
        mutationFn: systemService.createAnnouncement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            resetAnnForm();
        }
    });

    const resetAnnForm = () => {
        setAnnTitle('');
        setAnnMessage('');
        setAnnType('info');
        setAnnPriority('0');
        setAnnIcon('');
        setAnnActionText('');
        setAnnActionUrl('');
        setAnnExpiresAt('');
        setAnnIsDismissible(true);
        setAnnTargetProducts([]);
    };

    const deleteAnnouncement = useMutation({
        mutationFn: systemService.deleteAnnouncement,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
    });

    const createVersion = useMutation({
        mutationFn: systemService.createVersion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['versions'] });
            setVerNumber('');
            setVerUrl('');
            setVerChangelog('');
            setVerIsCurrent(false);
            setVerIsRequired(false);
        }
    });

    const deleteVersion = useMutation({
        mutationFn: systemService.deleteVersion,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['versions'] })
    });

    const toggleProductTarget = (id: number) => {
        setAnnTargetProducts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };


    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                        System & Infrastructure
                    </h2>
                    <p className="text-sm text-muted-foreground">Manage global announcements, loader releases, and core features.</p>
                </div>
            </header>

            {/* Premium Tabs */}
            <div className="flex space-x-2 p-1 bg-background/50 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {[
                    { id: 'announcements', label: 'Announcements', icon: Megaphone },
                    { id: 'versions', label: 'Loader Versions', icon: UploadCloud },
                    { id: 'features', label: 'Feature Toggles', icon: Cpu },
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center space-x-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${isActive
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                        >
                            <Icon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            <div className="grid gap-6">
                {activeTab === 'announcements' && (
                    <div className="grid gap-6 lg:grid-cols-12">
                        {/* Creation Form */}
                        <Card className="lg:col-span-12 glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-indigo-400" />
                                    New Broadcast
                                </CardTitle>
                                <CardDescription>Send a message to all users or target specific products.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Broadcast Title</Label>
                                            <Input
                                                className="glass-input"
                                                value={annTitle}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnTitle(e.target.value)}
                                                placeholder="e.g., Major Security Update"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {['info', 'success', 'warning', 'error', 'maintenance'].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setAnnType(t as any)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all border ${annType === t
                                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                                            : 'bg-white/5 border-white/10 text-muted-foreground opacity-50'
                                                            }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4 text-indigo-400" />
                                                Icon URL / Lucide name
                                            </Label>
                                            <Input
                                                className="glass-input"
                                                value={annIcon}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnIcon(e.target.value)}
                                                placeholder="megaphone, alert-triangle, etc."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <MousePointer2 className="h-4 w-4 text-indigo-400" />
                                                    Action Text
                                                </Label>
                                                <Input
                                                    className="glass-input"
                                                    value={annActionText}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnActionText(e.target.value)}
                                                    placeholder="Download Now"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <Link className="h-4 w-4 text-indigo-400" />
                                                    Action URL
                                                </Label>
                                                <Input
                                                    className="glass-input"
                                                    value={annActionUrl}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnActionUrl(e.target.value)}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Announcement Content</Label>
                                            <Textarea
                                                className="glass-input min-h-[120px]"
                                                value={annMessage}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnnMessage(e.target.value)}
                                                placeholder="What would you like to say? Markdown is supported."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Priority</Label>
                                                <Input
                                                    type="number"
                                                    className="glass-input"
                                                    value={annPriority}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnPriority(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Expiry Date</Label>
                                                <Input
                                                    type="datetime-local"
                                                    className="glass-input"
                                                    value={annExpiresAt}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnExpiresAt(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-indigo-400" />
                                                Target Products
                                            </Label>
                                            <div className="p-3 bg-black/30 rounded-xl border border-white/5 max-h-[180px] overflow-y-auto space-y-1">
                                                {products?.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${annTargetProducts.includes(p.id) ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-white/5'
                                                            }`}
                                                        onClick={() => toggleProductTarget(p.id)}
                                                    >
                                                        <span className="text-xs font-semibold">{p.product_name}</span>
                                                        <Checkbox
                                                            checked={annTargetProducts.includes(p.id)}
                                                            className="border-indigo-500/30"
                                                        />
                                                    </div>
                                                ))}
                                                {(!products || products.length === 0) && <p className="text-xs text-muted-foreground italic p-2">No products found.</p>}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest pl-1">Leave empty for all products</p>
                                        </div>

                                        <div className="flex items-center space-x-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                                            <Checkbox
                                                id="isDismissible"
                                                checked={annIsDismissible}
                                                onCheckedChange={(checked: boolean) => setAnnIsDismissible(checked)}
                                                className="border-indigo-500/30"
                                            />
                                            <Label htmlFor="isDismissible" className="text-sm font-semibold cursor-pointer">Allow users to dismiss this notification</Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-3 p-4 border-t border-white/5 bg-indigo-500/5 rounded-b-xl -mx-6 -mb-6">
                                    <Button variant="ghost" onClick={resetAnnForm}>Clear Form</Button>
                                    <Button
                                        className="premium-button px-10"
                                        onClick={() => createAnnouncement.mutate({
                                            title: annTitle,
                                            message: annMessage,
                                            type: annType,
                                            icon: annIcon,
                                            action_text: annActionText,
                                            action_url: annActionUrl,
                                            priority: parseInt(annPriority),
                                            is_dismissible: annIsDismissible,
                                            target_products: annTargetProducts.length > 0 ? annTargetProducts : null,
                                            expires_at: annExpiresAt || null
                                        })}
                                        disabled={!annMessage || createAnnouncement.isPending}
                                    >
                                        {createAnnouncement.isPending ? 'Sending...' : 'Broadcast Announcement'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Announcements List */}
                        <div className="lg:col-span-12">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-indigo-400" />
                                Active Broadcasts
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {announcements?.map((ann: Announcement) => (
                                    <Card key={ann.id} className="glass-card relative border-l-4 overflow-hidden group" style={{ borderLeftColor: `var(--color-${ann.type === 'info' ? 'blue-500' : ann.type === 'error' ? 'red-500' : ann.type === 'warning' ? 'yellow-500' : ann.type === 'success' ? 'green-500' : 'purple-500'})` }}>
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className={`text-[10px] uppercase font-black ${ann.type === 'info' ? 'text-blue-400 border-blue-400/20 bg-blue-400/10' :
                                                            ann.type === 'warning' ? 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10' :
                                                                ann.type === 'error' ? 'text-red-400 border-red-400/20 bg-red-400/10' : 'text-green-400 border-green-400/20 bg-green-400/10'
                                                            }`}>
                                                            {ann.type}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(ann.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-lg text-indigo-100">{ann.title}</h4>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteAnnouncement.mutate(ann.id)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{ann.message}</p>

                                            <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                                                    <Target className="h-3 w-3" />
                                                    {ann.target_products ? `${ann.target_products.length} Products` : 'All Products'}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                                                    <ChevronRight className="h-3 w-3" />
                                                    Priority {ann.priority}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {(!announcements || announcements.length === 0) && (
                                    <div className="col-span-full py-12 text-center glass-card border-dashed">
                                        <Megaphone className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                        <p className="text-muted-foreground font-medium">No active broadcasts found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Rest of tabs (versions, features) would see similar upgrades */}
                {activeTab === 'versions' && (
                    <div className="grid gap-6 md:grid-cols-12">
                        <Card className="md:col-span-4 h-fit glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UploadCloud className="h-5 w-5 text-indigo-400" />
                                    Push New Release
                                </CardTitle>
                                <CardDescription>Deploy a new version of the loader.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Version String</Label>
                                    <Input
                                        className="glass-input"
                                        value={verNumber}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerNumber(e.target.value)}
                                        placeholder="e.g., 2.4.0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Download URL</Label>
                                    <Input
                                        className="glass-input"
                                        value={verUrl}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerUrl(e.target.value)}
                                        placeholder="Direct .exe link"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Release Notes</Label>
                                    <Textarea
                                        className="glass-input"
                                        value={verChangelog}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVerChangelog(e.target.value)}
                                        placeholder="Bug fixes, new features..."
                                    />
                                </div>
                                <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="isCurrent"
                                            checked={verIsCurrent}
                                            onCheckedChange={(c: boolean) => setVerIsCurrent(c)}
                                            className="border-indigo-500/30"
                                        />
                                        <Label htmlFor="isCurrent" className="text-sm cursor-pointer">Set as Current Version</Label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="isRequired"
                                            checked={verIsRequired}
                                            onCheckedChange={(c: boolean) => setVerIsRequired(c)}
                                            className="border-indigo-500/30"
                                        />
                                        <Label htmlFor="isRequired" className="text-sm cursor-pointer">Require Mandatory Update</Label>
                                    </div>
                                </div>
                                <Button
                                    className="premium-button w-full"
                                    onClick={() => createVersion.mutate({
                                        version: verNumber,
                                        download_url: verUrl,
                                        changelog: verChangelog,
                                        is_current: verIsCurrent,
                                        is_required: verIsRequired
                                    })}
                                    disabled={!verNumber || !verUrl || createVersion.isPending}
                                >
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    {createVersion.isPending ? 'Deploying...' : 'Deploy Release'}
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="md:col-span-8 space-y-4">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Cpu className="h-5 w-5 text-indigo-400" />
                                Release Pipeline
                            </h3>
                            <div className="space-y-3">
                                {versions?.map((ver: LoaderVersion) => (
                                    <Card key={ver.id} className="glass-card hover:bg-white/10 transition-colors">
                                        <CardContent className="p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400">
                                                    {ver.version.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-lg text-indigo-100">{ver.version}</span>
                                                        {ver.is_current && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 uppercase text-[10px]">Current</Badge>}
                                                        {ver.is_required && <Badge className="bg-red-500/20 text-red-400 border-red-400/30 uppercase text-[10px]">Mandatory</Badge>}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                                        <Link className="h-3 w-3" />
                                                        {ver.download_url}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden md:block">
                                                    <div className="text-xs font-bold text-muted-foreground uppercase">{new Date(ver.released_at).toLocaleDateString()}</div>
                                                    <div className="text-[10px] text-muted-foreground">{ver.file_size ? `${(ver.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteVersion.mutate(ver.id)}
                                                    className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {(!versions || versions.length === 0) && (
                                    <div className="py-12 text-center glass-card border-dashed">
                                        <p className="text-muted-foreground">No releases deployed yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'features' && (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {features?.map((feat: LoaderFeature) => (
                                <Card key={feat.feature_key} className="glass-card hover:border-indigo-500/30 transition-all group">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                                <Cpu className="h-6 w-6 text-indigo-400" />
                                            </div>
                                            <Badge className={`${feat.is_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} border-transparent uppercase text-[10px] font-black`}>
                                                {feat.is_enabled ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </div>
                                        <h4 className="font-bold text-lg mb-1">{feat.feature_name}</h4>
                                        <p className="text-xs text-muted-foreground mb-4 h-8 overflow-hidden line-clamp-2">{feat.description || 'Global system feature toggle.'}</p>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{feat.is_premium ? 'Premium Only' : 'Everyone'}</span>
                                            <Button variant="ghost" className="h-7 px-2 text-[10px] font-black uppercase text-indigo-400 hover:bg-indigo-400/10">
                                                Configure
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Card className="glass-card border-dashed bg-white/[0.02]">
                            <CardContent className="p-10 text-center flex flex-col items-center">
                                <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                                    <Plus className="h-8 w-8 text-indigo-400" />
                                </div>
                                <h4 className="font-bold text-xl mb-2">Define New Feature Hook</h4>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">Create a dynamic toggle that can be checked by the loader at runtime to enable/disable specific module features.</p>
                                <Button className="premium-button px-8">Initialize Feature Key</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
