import { api } from './api';

export interface BotStats {
    tickets: {
        total: number;
        open: number;
    };
    invites_tracked: number;
    saved_embeds: number;
}

export interface GuildBotSettings {
    guild_id: string;
    anti_spam_enabled: boolean;
    anti_raid_enabled: boolean;
    anti_links_enabled: boolean;
    min_account_age_days: number;
    log_channel_id: string | null;
    mute_role_id: string | null;
}

export interface BotAutomation {
    welcome_channel_id: string | null;
    welcome_message: string | null;
    welcome_embed_id: number | null;
    goodbye_channel_id: string | null;
    goodbye_message: string | null;
    goodbye_embed_id: number | null;
}

export interface BotLogsConfig {
    msg_log_channel: string | null;
    member_log_channel: string | null;
    voice_log_channel: string | null;
    mod_log_channel: string | null;
    server_log_channel: string | null;
}

export interface BotGuild {
    id: string;
    name: string;
    icon: string | null;
}

export interface BotChannel {
    id: string;
    guild_id: string;
    name: string;
    type: string;
}

export interface RealLog {
    id: number;
    type: 'msg' | 'member' | 'voice' | 'mod' | 'server';
    content: string;
    created_at: string;
}


export interface SavedBotEmbed {
    id: number;
    guild_id: string;
    name: string;
    title: string | null;
    description: string | null;
    color: string;
    image_url: string | null;
    thumbnail_url: string | null;
    footer_text: string | null;
    fields: any[];
    created_at: string;
}

export const botService = {
    getStats: async (): Promise<BotStats> => {
        const response = await api.get('/admin/bot/stats');
        return response.data;
    },
    getGuildSettings: async (guildId: string): Promise<GuildBotSettings> => {
        const response = await api.get(`/admin/bot/settings/${guildId}`);
        return response.data;
    },
    updateGuildSettings: async (guildId: string, data: Partial<GuildBotSettings>): Promise<GuildBotSettings> => {
        const response = await api.put(`/admin/bot/settings/${guildId}`, data);
        return response.data;
    },
    getGuildEmbeds: async (guildId: string): Promise<SavedBotEmbed[]> => {
        const response = await api.get(`/admin/bot/embeds/${guildId}`);
        return response.data;
    },
    getBlacklist: async (guildId: string): Promise<string[]> => {
        const response = await api.get(`/admin/bot/blacklist/${guildId}`);
        return response.data;
    },
    saveEmbed: async (guildId: string, name: string, data: any): Promise<any> => {
        const response = await api.post(`/admin/bot/embeds/${guildId}/${name}`, data);
        return response.data;
    },
    addBlacklistWord: async (guildId: string, word: string): Promise<any> => {
        const response = await api.post(`/admin/bot/blacklist/${guildId}`, { word });
        return response.data;
    },
    removeBlacklistWord: async (guildId: string, word: string): Promise<any> => {
        const response = await api.post(`/admin/bot/blacklist/${guildId}/remove`, { word });
        return response.data;
    },
    getAutomation: async (guildId: string): Promise<BotAutomation> => {
        const response = await api.get(`/admin/bot/automation/${guildId}`);
        return response.data;
    },
    updateAutomation: async (guildId: string, data: Partial<BotAutomation>): Promise<any> => {
        const response = await api.put(`/admin/bot/automation/${guildId}`, data);
        return response.data;
    },
    getLogsConfig: async (guildId: string): Promise<BotLogsConfig> => {
        const response = await api.get(`/admin/bot/logs/${guildId}`);
        return response.data;
    },
    updateLogsConfig: async (guildId: string, data: Partial<BotLogsConfig>): Promise<any> => {
        const response = await api.put(`/admin/bot/logs/${guildId}`, data);
        return response.data;
    },
    getGuilds: async (): Promise<BotGuild[]> => {
        const response = await api.get('/admin/bot/guilds');
        return response.data;
    },
    getChannels: async (guildId: string): Promise<BotChannel[]> => {
        const response = await api.get(`/admin/bot/channels/${guildId}`);
        return response.data;
    },
    getRealLogs: async (guildId: string, limit: number = 50): Promise<RealLog[]> => {
        const response = await api.get(`/admin/bot/logs/${guildId}/real?limit=${limit}`);
        return response.data;
    },
    sendEmbed: async (guildId: string, channelId: string, embedName: string, message?: string): Promise<any> => {
        const response = await api.post('/admin/bot/embeds/send', {
            guild_id: guildId,
            channel_id: channelId,
            embed_name: embedName,
            message
        });
        return response.data;
    },
    resyncCache: async (guildId: string): Promise<any> => {
        const response = await api.post(`/admin/bot/resync/${guildId}`);
        return response.data;
    }
};
