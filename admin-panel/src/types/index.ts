export interface Stats {
    users: {
        total: number;
        active: number;
        banned: number;
        online_24h: number;
    };
    licenses: {
        total: number;
        used: number;
        available: number;
    };
    products: {
        total: number;
        active: number;
        subscriptions: number;
    };
    activity: {
        total_renewals: number;
    };
}

export interface Product {
    id: number;
    product_code: string;
    product_name: string;
    description?: string;
    is_active: boolean;
    icon_url?: string;
}

export interface License {
    id: number;
    license_key: string;
    product_id: number;
    product?: Product;
    subscription_type: string;
    duration_days: number;
    used: boolean;
    used_by?: string;
    is_renewal?: boolean;
    created_at: string;
}

export interface User {
    id: number;
    username: string;
    email?: string;
    subscription_type: string;
    expiry_date?: string;
    is_active: boolean;
    is_banned: boolean;
    ban_reason?: string;
    hwid?: string;
    hwid_banned: boolean;
    hwid_resets: number;
    last_login?: string;
    last_ip?: string;
    validation_count: number;
    created_at: string;
    products?: UserProduct[];
}

export interface UserProduct {
    product_id: number;
    product?: Product;
    subscription_type: string;
    expiry_date?: string;
    is_active: boolean;
    is_new_subscription?: boolean;
}

export interface Announcement {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'maintenance';
    icon?: string;
    action_text?: string;
    action_url?: string;
    is_active: boolean;
    is_dismissible: boolean;
    priority: number;
    target_products?: number[];
    created_at: string;
    expires_at?: string;
}

export interface LoaderVersion {
    id: number;
    version: string;
    is_current: boolean;
    is_required: boolean;
    download_url: string;
    changelog?: string;
    file_size?: number;
    file_hash?: string;
    released_at: string;
}

export interface LoaderFeature {
    feature_key: string;
    feature_name: string;
    description?: string;
    is_enabled: boolean;
    is_premium: boolean;
    icon?: string;
    display_order: number;
    config?: Record<string, any>;
    updated_at: string;
}

export interface ProductImage {
    id: number;
    product_id: number;
    image_url: string;
    image_type: 'icon' | 'banner' | 'screenshot' | 'preview';
    display_order: number;
    created_at: string;
}

export interface ProductDetails extends Product {
    status: 'active' | 'maintenance' | 'disabled' | 'unsafe';
    status_message?: string;
    current_version?: string;
    is_safe: boolean;
    detection_status?: string;
    features_json?: string;
    features?: string | string[];
    video_url?: string;
    badge_text?: string;
    badge_color?: string;
    display_order: number;
    is_featured: boolean;
}

export interface SubscriptionRenewal {
    id: number;
    username: string;
    license_key: string;
    product?: Product;
    product_id: number;
    old_subscription_type?: string;
    new_subscription_type: string;
    old_expiry_date?: string;
    new_expiry_date: string;
    days_added?: number;
    ip_address: string;
    user_agent?: string;
    renewed_at: string;
    renewal_method: string;
    is_new_subscription: boolean;
}
