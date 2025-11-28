import { UserProfile } from '../types';
import { exportDatabase, importDatabase } from '../utils/db';
import { supabase } from '../utils/supabaseClient';

const STORAGE_KEY_USER_CACHE = 'lunaris_auth_user_cache';

export const AuthService = {
    getCurrentUser: (): UserProfile | null => {
        const stored = localStorage.getItem(STORAGE_KEY_USER_CACHE);
        return stored ? JSON.parse(stored) : null;
    },

    login: async (email: string, password: string): Promise<UserProfile> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata.full_name || email.split('@')[0],
            isPro: true,
            avatarUrl: data.user.user_metadata.avatar_url
        };
        localStorage.setItem(STORAGE_KEY_USER_CACHE, JSON.stringify(profile));
        return profile;
    },

    signup: async (name: string, email: string, password: string): Promise<UserProfile> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });
        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email!,
            name: name,
            isPro: true
        };
        localStorage.setItem(STORAGE_KEY_USER_CACHE, JSON.stringify(profile));
        return profile;
    },

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEY_USER_CACHE);
    },

    updateProfile: async (updates: Partial<UserProfile>): Promise<UserProfile> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        const updateData: any = {};
        if (updates.name) updateData.full_name = updates.name;
        if (updates.avatarUrl) updateData.avatar_url = updates.avatarUrl;

        const { error } = await supabase.auth.updateUser({ data: updateData });
        if (error) throw error;

        const current = AuthService.getCurrentUser();
        const updated = { ...current, ...updates } as UserProfile;
        localStorage.setItem(STORAGE_KEY_USER_CACHE, JSON.stringify(updated));
        return updated;
    },

    changePassword: async (oldPass: string, newPass: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) throw error;
        return true;
    },

    deleteAccount: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('backups').delete().eq('user_id', user.id);
        }
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEY_USER_CACHE);
        return true;
    },

    syncData: async (): Promise<number> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        const exportString = await exportDatabase();
        const exportJson = JSON.parse(exportString);

        const { error } = await supabase.from('backups').upsert({ 
            user_id: user.id, 
            data: exportJson,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;

        const current = AuthService.getCurrentUser();
        const now = Date.now();
        if (current) {
            const updatedUser = { ...current, lastSync: now };
            localStorage.setItem(STORAGE_KEY_USER_CACHE, JSON.stringify(updatedUser));
        }
        return now;
    },

    restoreData: async (): Promise<boolean> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        const { data, error } = await supabase.from('backups').select('data').eq('user_id', user.id).single();
        if (error) throw error;
        if (!data || !data.data) throw new Error("No backup found.");

        return await importDatabase(JSON.stringify(data.data));
    },
    
    initializeListener: () => {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                localStorage.removeItem(STORAGE_KEY_USER_CACHE);
            } else if (event === 'SIGNED_IN' && session?.user) {
                 const profile: UserProfile = {
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata.full_name || session.user.email!.split('@')[0],
                    isPro: true,
                    avatarUrl: session.user.user_metadata.avatar_url
                };
                localStorage.setItem(STORAGE_KEY_USER_CACHE, JSON.stringify(profile));
            }
        });
    }
}
AuthService.initializeListener();
