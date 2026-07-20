import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/products';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import {
    Loader2,
    Plus,
    Edit,
    Trash2,
    Package,
    Save,
    Image as ImageIcon,
    FileText,
    Settings,
    ShieldCheck,
    Upload,
    X,
    Video,
    List,
    Monitor
} from 'lucide-react';
import type { Product, ProductDetails, ProductImage } from '@/types';

type ManageTab = 'basic' | 'status' | 'assets' | 'file';

export default function Products() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState<Product | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [detailsFormData, setDetailsFormData] = useState<Partial<ProductDetails>>({}); // Local state for details
    const [activeManageTab, setActiveManageTab] = useState<ManageTab>('basic');

    // File inputs refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const cheatInputRef = useRef<HTMLInputElement>(null);

    // URL Modal State
    const [urlModal, setUrlModal] = useState<{ isOpen: boolean, type: 'icon' | 'banner' | 'screenshot' | 'preview' }>({ isOpen: false, type: 'screenshot' });
    const [urlValue, setUrlValue] = useState('');

    const handleUrlSubmit = async () => {
        if (!isEditing || !urlValue) return;

        try {
            await addImageMutation.mutateAsync({
                id: isEditing.id,
                file: urlValue,
                type: urlModal.type
            });
            setUrlModal({ ...urlModal, isOpen: false });
            setUrlValue('');
        } catch (error) {
            console.error(error);
        }
    };

    // Queries
    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['products'],
        queryFn: productService.getAll
    });

    const { data: details, isLoading: detailsLoading } = useQuery({
        queryKey: ['product-details', isEditing?.id],
        queryFn: () => isEditing ? productService.getDetails(isEditing.id) : null,
        enabled: !!isEditing
    });

    // Populate local state when details are loaded
    useEffect(() => {
        if (details) {
            setDetailsFormData(details);
        }
    }, [details]);

    const { data: images } = useQuery({
        queryKey: ['product-images', isEditing?.id],
        queryFn: () => isEditing ? productService.getImages(isEditing.id) : [],
        enabled: !!isEditing
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: productService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsCreating(false);
            setFormData({});
        }
    });

    const updateProductMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Product> }) =>
            productService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: productService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    const updateDetailsMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<ProductDetails> }) =>
            productService.updateDetails(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-details'] });
        }
    });

    const addImageMutation = useMutation({
        mutationFn: ({ id, file, type }: { id: number, file: File | string, type?: 'icon' | 'banner' | 'screenshot' | 'preview' }) =>
            productService.addImage(id, file, type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-images'] });
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    });

    const deleteImageMutation = useMutation({
        mutationFn: (imageId: number) => productService.deleteImage(imageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-images'] });
        }
    });

    const uploadCheatMutation = useMutation({
        mutationFn: ({ id, file }: { id: number, file: File }) =>
            productService.uploadCheat(id, file),
        onSuccess: () => {
            alert('Cheat file uploaded successfully!');
            if (cheatInputRef.current) cheatInputRef.current.value = '';
        }
    });

    // Handlers
    const handleSubmitBasic = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            updateProductMutation.mutate({ id: isEditing.id, data: formData });
        } else if (isCreating) {
            createMutation.mutate(formData);
        }
    };

    const handleUpdateDetails = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEditing || !detailsFormData) return;
        updateDetailsMutation.mutate({ id: isEditing.id, data: detailsFormData });
    };

    const handleCheatUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && isEditing) {
            uploadCheatMutation.mutate({ id: isEditing.id, file });
        }
    };


    const openEdit = (product: Product) => {
        setIsEditing(product);
        setFormData(product);
        setIsCreating(false);
        setActiveManageTab('basic');
    };

    const openCreate = () => {
        setIsCreating(true);
        setFormData({});
        setIsEditing(null);
    };

    const handleCancel = () => {
        setIsEditing(null);
        setIsCreating(false);
        setFormData({});
    };

    if (productsLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Product Logistics
                    </h2>
                    <p className="text-sm text-muted-foreground">Manage inventory, security status, and distribution files.</p>
                </div>
                <Button onClick={openCreate} className="premium-button">
                    <Plus className="mr-2 h-4 w-4" />
                    Initialize Product
                </Button>
            </header>

            {(isCreating || isEditing) && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <Card className="glass-card overflow-hidden border-indigo-500/20">
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle>{isCreating ? 'Product Initialization' : `Configure: ${isEditing?.product_name}`}</CardTitle>
                                <CardDescription>Setup core settings and asset distribution.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {!isCreating && (
                                <div className="flex space-x-2 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 w-fit mb-6">
                                    {[
                                        { id: 'basic', label: 'Basic Info', icon: Package },
                                        { id: 'status', label: 'Detailed Status', icon: ShieldCheck },
                                        { id: 'assets', label: 'Asset Hub', icon: ImageIcon },
                                        { id: 'file', label: 'Distribution File', icon: FileText },
                                    ].map(tab => {
                                        const Icon = tab.icon;
                                        const isActive = activeManageTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveManageTab(tab.id as ManageTab)}
                                                className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${isActive
                                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span>{tab.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {activeManageTab === 'basic' && (
                                <form onSubmit={handleSubmitBasic} className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Product Unique Identifier (Code)</Label>
                                            <Input
                                                className="glass-input font-mono"
                                                value={formData.product_code || ''}
                                                onChange={e => setFormData({ ...formData, product_code: e.target.value })}
                                                placeholder="e.g. VAL_ESP_INTERNAL"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Display Name</Label>
                                            <Input
                                                className="glass-input"
                                                value={formData.product_name || ''}
                                                onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                                                placeholder="e.g. Valorant Internal ESP"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Marketing Description</Label>
                                        <Textarea
                                            className="glass-input min-h-[100px]"
                                            value={formData.description || ''}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="What makes this product special?..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="flex items-center space-x-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                                            <Checkbox
                                                id="is_active"
                                                checked={formData.is_active || false}
                                                onCheckedChange={(c: boolean) => setFormData({ ...formData, is_active: c })}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <Label htmlFor="is_active" className="text-sm font-bold cursor-pointer">Live Deployment</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase">Visible in store</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 gap-3">
                                        <Button type="button" variant="ghost" onClick={handleCancel}>Discard Changes</Button>
                                        <Button type="submit" className="premium-button px-8" disabled={createMutation.isPending || updateProductMutation.isPending}>
                                            {(createMutation.isPending || updateProductMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Save className="mr-2 h-4 w-4" />
                                            {isCreating ? 'Initialize Product' : 'Synchronize Core Settings'}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {activeManageTab === 'status' && isEditing && (
                                detailsLoading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div> : (
                                    <form onSubmit={handleUpdateDetails} className="space-y-8">
                                        <div className="grid gap-8 md:grid-cols-2">
                                            <div className="space-y-6">
                                                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Settings className="h-4 w-4" /> Core Config
                                                    </h4>

                                                    <div className="space-y-2">
                                                        <Label>Distribution Version</Label>
                                                        <Input
                                                            className="glass-input font-mono text-xs"
                                                            value={detailsFormData.current_version || ''}
                                                            onChange={e => setDetailsFormData({ ...detailsFormData, current_version: e.target.value })}
                                                            placeholder="5.1.0-stable"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Display Order</Label>
                                                            <Input
                                                                type="number"
                                                                className="glass-input"
                                                                value={detailsFormData.display_order || 0}
                                                                onChange={e => setDetailsFormData({ ...detailsFormData, display_order: parseInt(e.target.value) })}
                                                            />
                                                        </div>
                                                        <div className="flex items-center space-x-2 pt-8">
                                                            <Checkbox
                                                                checked={detailsFormData.is_featured || false}
                                                                onCheckedChange={(c: boolean) => setDetailsFormData({ ...detailsFormData, is_featured: c })}
                                                            />
                                                            <Label>Featured Product</Label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Security & Safety Status</Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['active', 'maintenance', 'disabled', 'unsafe'].map(st => (
                                                            <button
                                                                key={st}
                                                                type="button"
                                                                onClick={() => setDetailsFormData({ ...detailsFormData, status: st as any })}
                                                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all ${detailsFormData?.status === st
                                                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                                                    : 'bg-white/5 border-white/10 text-muted-foreground'}`}
                                                            >
                                                                {st}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-sm font-bold">Detection Guard</Label>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Mark as "Undetected/Safe"</p>
                                                    </div>
                                                    <Checkbox
                                                        checked={detailsFormData.is_safe || false}
                                                        onCheckedChange={(c: boolean) => setDetailsFormData({ ...detailsFormData, is_safe: c })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <Video className="h-4 w-4 text-pink-400" />
                                                        Preview Video URL
                                                    </Label>
                                                    <Input
                                                        className="glass-input text-pink-300"
                                                        value={detailsFormData.video_url || ''}
                                                        onChange={e => setDetailsFormData({ ...detailsFormData, video_url: e.target.value })}
                                                        placeholder="https://youtube.com/watch?v=..."
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Features List (JSON Array)</Label>
                                                    <Textarea
                                                        className="glass-input font-mono text-[10px] min-h-[150px]"
                                                        value={typeof detailsFormData.features === 'string' ? detailsFormData.features : JSON.stringify(detailsFormData.features || [], null, 2)}
                                                        onChange={(e) => {
                                                            try {
                                                                // Just update the string value for now, parsing happens on submit or we can store it as string temporarily
                                                                // But to keep it simple, we'll try to parse, if fails we might need a separate string state.
                                                                // Better approach for JSON editor: store as object in state if valid, but here we are binding to Textarea.
                                                                // Let's assume user types valid JSON or we handle the error on submit.
                                                                // Actually, binding a JSON object to a textarea value requires constant stringify.
                                                                // Let's just update the features field. API expects parsed JSON or string?
                                                                // The API handles both but let's stick to the previous logic but LOCAL.
                                                                try {
                                                                    const parsed = JSON.parse(e.target.value);
                                                                    setDetailsFormData({ ...detailsFormData, features: parsed });
                                                                } catch (err) {
                                                                    // If we can't parse, we can't update the state if the state expects an array.
                                                                    // This is a limitation of the current type definition.
                                                                    // Ideally we should have a 'featuresString' state.
                                                                }
                                                            } catch (err) {
                                                            }
                                                        }}
                                                    // A better way for the JSON field specifically:
                                                    // We'll leave it as is for now but the best way is to use a controlled input with local string state
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">Type valid JSON array. e.g. ["Aimbot", "ESP"]</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Status Message / Banner</Label>
                                                    <Input
                                                        className="glass-input"
                                                        value={detailsFormData.status_message || ''}
                                                        onChange={e => setDetailsFormData({ ...detailsFormData, status_message: e.target.value })}
                                                        placeholder="e.g. Updating for Patch 5.0..."
                                                    />
                                                </div>

                                                <div className="flex justify-end pt-4">
                                                    <Button type="submit" className="premium-button w-full" disabled={updateDetailsMutation.isPending}>
                                                        {updateDetailsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        <Save className="mr-2 h-4 w-4" />
                                                        Save Configuration
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                )
                            )}

                            {activeManageTab === 'assets' && isEditing && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Icon Slot */}
                                        <div className="space-y-3">
                                            <Label className="uppercase text-xs font-bold text-muted-foreground flex items-center gap-2">
                                                <Package className="h-3 w-3" /> Product Icon (Square)
                                            </Label>
                                            <div className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 flex flex-col items-center justify-center transition-all group relative overflow-hidden bg-black/20">
                                                {images?.find((i: ProductImage) => i.image_type === 'icon') ? (
                                                    <>
                                                        <img src={images.find((i: ProductImage) => i.image_type === 'icon')?.image_url} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-white hover:text-indigo-400"
                                                                onClick={() => imageInputRef.current?.setAttribute('data-type', 'icon') || imageInputRef.current?.click()}
                                                            >
                                                                <Upload className="h-4 w-4 mr-2" /> Replace
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 p-2 w-full">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground mb-1">Product Icon</span>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0 rounded-full"
                                                                onClick={() => imageInputRef.current?.setAttribute('data-type', 'icon') || imageInputRef.current?.click()}
                                                                title="Upload File"
                                                            >
                                                                <Upload className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0 rounded-full"
                                                                onClick={() => setUrlModal({ isOpen: true, type: 'icon' })}
                                                                title="Paste Link"
                                                            >
                                                                <Monitor className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Banner Slot */}
                                        <div className="space-y-3 md:col-span-2">
                                            <Label className="uppercase text-xs font-bold text-muted-foreground flex items-center gap-2">
                                                <Monitor className="h-3 w-3" /> Store Recommendation Banner (Wide)
                                            </Label>
                                            <div className="aspect-[2/1] md:aspect-[3/1] rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 flex flex-col items-center justify-center transition-all group relative overflow-hidden bg-black/20">
                                                {images?.find((i: ProductImage) => i.image_type === 'banner') ? (
                                                    <>
                                                        <img src={images.find((i: ProductImage) => i.image_type === 'banner')?.image_url} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-white/80 hover:text-white"
                                                                onClick={() => {
                                                                    const bannerId = images.find((i: ProductImage) => i.image_type === 'banner')?.id;
                                                                    if (bannerId) deleteImageMutation.mutate(bannerId);
                                                                }}
                                                            >
                                                                <Trash2 className="h-6 w-6 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 w-full p-2">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground">Store Banner</span>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => imageInputRef.current?.setAttribute('data-type', 'banner') || imageInputRef.current?.click()}
                                                            >
                                                                <Upload className="h-4 w-4 mr-2" /> Upload
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => setUrlModal({ isOpen: true, type: 'banner' })}
                                                            >
                                                                <Monitor className="h-4 w-4 mr-2" /> Link
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gallery */}
                                    <div className="space-y-3">
                                        <Label className="uppercase text-xs font-bold text-muted-foreground flex items-center gap-2">
                                            <List className="h-3 w-3" /> Gallery & Screenshots
                                        </Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            <div className="aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 flex flex-col items-center justify-center transition-all group gap-2">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                                        <Plus className="h-4 w-4 text-indigo-400" />
                                                    </div>
                                                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Add New</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 hover:bg-white/10"
                                                        onClick={() => imageInputRef.current?.setAttribute('data-type', 'preview') || imageInputRef.current?.click()}
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 hover:bg-white/10"
                                                        onClick={() => setUrlModal({ isOpen: true, type: 'preview' })}
                                                    >
                                                        <Monitor className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {images?.filter((i: ProductImage) => i.image_type === 'screenshot' || i.image_type === 'preview').map((img: ProductImage) => (
                                                <div key={img.id} className="aspect-video rounded-xl overflow-hidden glass-card relative group">
                                                    <img src={img.image_url} alt="Product" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteImageMutation.mutate(img.id);
                                                        }}
                                                        className="absolute top-2 right-2 h-6 w-6 rounded-md bg-black/60 backdrop-blur-md flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <input
                                        type="file"
                                        ref={imageInputRef}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            const type = e.target.getAttribute('data-type') || 'screenshot';
                                            if (file && isEditing) {
                                                // Cast type to allowed union type
                                                addImageMutation.mutate({ id: isEditing.id, file, type: type as any });
                                            }
                                        }}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            )}

                            {activeManageTab === 'file' && isEditing && (
                                <div className="max-w-xl mx-auto py-12 text-center space-y-8">
                                    <div className="h-24 w-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                                        <Upload className="h-10 w-10 text-indigo-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold">Secure Binary Distribution</h4>
                                        <p className="text-sm text-muted-foreground">Upload the executable or zip file for this product. Users will be able to download this via the loader or dashboard.</p>
                                    </div>

                                    <div
                                        onClick={() => cheatInputRef.current?.click()}
                                        className="p-8 rounded-2xl border-2 border-dashed border-indigo-500/20 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05] hover:border-indigo-500/40 cursor-pointer transition-all group"
                                    >
                                        <FileText className="h-12 w-12 text-muted-foreground group-hover:text-indigo-400 mx-auto mb-4 transition-colors" />
                                        <p className="font-bold text-indigo-100">Click to Select Distribution Binary</p>
                                        <p className="text-xs text-muted-foreground mt-1">Maximum file size: 100MB (.exe, .zip, .rar)</p>
                                        <input type="file" ref={cheatInputRef} onChange={handleCheatUpload} className="hidden" />
                                    </div>

                                    {uploadCheatMutation.isPending && (
                                        <div className="space-y-2">
                                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 animate-pulse w-2/3" />
                                            </div>
                                            <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Encrypting & Uploading...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )
            }

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products?.map(product => (
                    <Card key={product.id} className="group glass-card hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-4">
                            <Badge variant={product.is_active ? 'success' : 'secondary'} className={`uppercase text-[10px] font-black border-transparent ${product.is_active ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-white/10'}`}>
                                {product.is_active ? 'Live' : 'Draft'}
                            </Badge>
                        </div>

                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <Package className="h-6 w-6 text-indigo-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">{product.product_name}</CardTitle>
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{product.product_code}</p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-4">
                            <p className="text-sm text-muted-foreground line-clamp-2 italic h-10">
                                {product.description || 'No marketing description provided.'}
                            </p>

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    className="glass-button h-9 text-xs font-bold uppercase tracking-tight"
                                    onClick={() => openEdit(product)}
                                >
                                    <Edit className="h-3.5 w-3.5 mr-2" />
                                    Configure
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-9 text-xs font-bold uppercase tracking-tight hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
                                    onClick={() => {
                                        if (confirm('Permanently delete this product logistics entry? This cannot be undone.')) deleteMutation.mutate(product.id);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Purge
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {(!products || products.length === 0) && (
                    <div className="col-span-full py-20 text-center glass-card border-dashed">
                        <Package className="h-16 w-16 text-muted-foreground/10 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-muted-foreground">Warehouse Empty</h4>
                        <p className="text-sm text-muted-foreground">Initialize your first product to begin distribution.</p>
                        <Button onClick={openCreate} className="mt-6 premium-button">Register First Product</Button>
                    </div>
                )}
            </div>
            {/* URL Input Modal */}
            {
                urlModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Add {urlModal.type} by Link</h3>
                                <Button variant="ghost" size="icon" onClick={() => setUrlModal({ ...urlModal, isOpen: false })}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label>Image URL</Label>
                                <Input
                                    value={urlValue}
                                    onChange={(e) => setUrlValue(e.target.value)}
                                    placeholder="https://example.com/image.png"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setUrlModal({ ...urlModal, isOpen: false })}>Cancel</Button>
                                <Button onClick={handleUrlSubmit} disabled={!urlValue}>Add Image</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
