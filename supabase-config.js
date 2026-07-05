const SUPABASE_URL = "https://toiclkosernimzqbbvrd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaWNsa29zZXJuaW16cWJidnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDE0NjQsImV4cCI6MjA5ODgxNzQ2NH0.ehvYQfHFNCmqHrVIKEEU0XU1Aq83Mp7-uK_Q1_os228";
// WARNING: Service role key has admin access. Do not expose this key in public web apps.
// We are storing it here since this is a local college project.
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaWNsa29zZXJuaW16cWJidnJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzI0MTQ2NCwiZXhwIjoyMDk4ODE3NDY0fQ.YB5lvk74RqIUEfarFMnBIsiHxpx0zE2uPUMI2LyM7Tc";

let supabaseClient = null;
let supabaseAdminClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseAdminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
} else {
    console.error("Supabase SDK is not loaded. Please make sure to include the Supabase CDN script tag.");
}

const supabaseHelper = {
    // 1. Log page view
    async logPageView(page) {
        if (!supabaseClient) return;
        const device = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
        try {
            await supabaseClient.from('page_views').insert([{ page, device }]);
        } catch (e) {
            console.error("Error logging page view to Supabase:", e);
        }
    },

    // 2. Realtime User Heartbeat
    async updateSession(pageName) {
        if (!supabaseClient) return;
        let sessionId = sessionStorage.getItem('user_session_id');
        if (!sessionId) {
            sessionId = 'SESS_' + Math.random().toString(36).substring(2, 9) + Date.now();
            sessionStorage.setItem('user_session_id', sessionId);
        }
        const geo = JSON.parse(localStorage.getItem('user_geo') || '{"city":"Unknown","region":"Unknown"}');
        const device = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
        
        try {
            await supabaseClient.from('active_sessions').upsert({
                id: sessionId,
                page: pageName,
                last_active: new Date().toISOString(),
                device: device,
                city: geo.city,
                region: geo.region
            });
        } catch (e) {
            console.error("Error updating active session in Supabase:", e);
        }
    },

    // 3. Log lead
    async logLead(leadData) {
        if (!supabaseClient) return;
        try {
            const { error } = await supabaseClient.from('leads').insert({
                name: leadData.name,
                phone: leadData.phone,
                pincode: leadData.pincode,
                city: leadData.city,
                state: leadData.state,
                house: leadData.house,
                road: leadData.road,
                productId: leadData.productId,
                color: leadData.color,
                geoCity: leadData.geoCity,
                geoRegion: leadData.geoRegion
            });
            if (error) throw error;
        } catch (e) {
            console.error("Error saving lead to Supabase:", e);
        }
    },

    // 4. Log order attempt
    async logOrder(orderData) {
        if (!supabaseClient) return;
        try {
            const { error } = await supabaseClient.from('orders').insert({
                productName: orderData.productName,
                color: orderData.color,
                amount: orderData.amount,
                donation: orderData.donation,
                method: orderData.method,
                status: orderData.status,
                city: orderData.city,
                region: orderData.region
            });
            if (error) throw error;
        } catch (e) {
            console.error("Error saving order attempt to Supabase:", e);
        }
    },

    // 5. Get settings
    async getSettings() {
        if (!supabaseClient) return {};
        try {
            const { data, error } = await supabaseClient.from('settings').select('*');
            if (error) throw error;
            const settings = {};
            data.forEach(item => {
                settings[item.key] = item.value;
            });
            return settings;
        } catch (e) {
            console.error("Error loading settings from Supabase:", e);
            return {};
        }
    },

    // 6. Save settings
    async saveSettings(key, value) {
        if (!supabaseClient) return;
        try {
            const { error } = await supabaseClient.from('settings').upsert({ key, value });
            if (error) throw error;
        } catch (e) {
            console.error("Error saving settings to Supabase:", e);
        }
    },

    // ADMIN PRIVILEGED METHODS (uses supabaseAdminClient)
    // 7. Get dashboard stats aggregated
    async getStats() {
        const client = supabaseAdminClient || supabaseClient;
        if (!client) return { home: 0, product: 0, address: 0, cart: 0, payment: 0, mobile: 0, desktop: 0 };
        try {
            const pages = ['home', 'product', 'address', 'cart', 'payment'];
            const devices = ['mobile', 'desktop'];
            const stats = {};
            
            for (const p of pages) {
                const { count, error } = await client
                    .from('page_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('page', p);
                stats[p] = count || 0;
            }
            for (const d of devices) {
                const { count, error } = await client
                    .from('page_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('device', d);
                stats[d] = count || 0;
            }
            return stats;
        } catch (e) {
            console.error("Error fetching stats from Supabase:", e);
            return { home: 0, product: 0, address: 0, cart: 0, payment: 0, mobile: 0, desktop: 0 };
        }
    },

    // 8. Fetch all leads
    async getLeads() {
        const client = supabaseAdminClient || supabaseClient;
        if (!client) return [];
        try {
            const { data, error } = await client
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(l => ({
                timestamp: l.created_at,
                name: l.name,
                phone: l.phone,
                pincode: l.pincode,
                geoCity: l.geoCity,
                geoRegion: l.geoRegion,
                house: l.house,
                road: l.road,
                city: l.city,
                state: l.state,
                productId: l.productId,
                color: l.color
            }));
        } catch (e) {
            console.error("Error fetching leads from Supabase:", e);
            return [];
        }
    },

    // 9. Fetch all orders
    async getOrders() {
        const client = supabaseAdminClient || supabaseClient;
        if (!client) return [];
        try {
            const { data, error } = await client
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(o => ({
                timestamp: o.created_at,
                productName: o.productName,
                color: o.color,
                amount: o.amount,
                donation: o.donation,
                method: o.method,
                city: o.city,
                region: o.region,
                status: o.status
            }));
        } catch (e) {
            console.error("Error fetching orders from Supabase:", e);
            return [];
        }
    },

    // 10. Fetch active sessions (active in the last 15s)
    async getActiveSessions() {
        const client = supabaseAdminClient || supabaseClient;
        if (!client) return [];
        try {
            const threshold = new Date(Date.now() - 15000).toISOString();
            const { data, error } = await client
                .from('active_sessions')
                .select('*')
                .gte('last_active', threshold);
            if (error) throw error;
            
            return data.map(s => ({
                id: s.id,
                page: s.page,
                last_active: new Date(s.last_active).getTime(),
                device: s.device,
                city: s.city,
                region: s.region
            }));
        } catch (e) {
            console.error("Error fetching active sessions from Supabase:", e);
            return [];
        }
    },

    // 11. Clear all tracking data (stats, leads, orders, sessions)
    async clearAllData() {
        const client = supabaseAdminClient || supabaseClient;
        if (!client) return;
        try {
            await client.from('page_views').delete().neq('id', -1);
            await client.from('leads').delete().neq('id', -1);
            await client.from('orders').delete().neq('id', -1);
            await client.from('active_sessions').delete().neq('id', 'dummy_value_that_does_not_exist');
        } catch (e) {
            console.error("Error clearing data in Supabase:", e);
        }
    }
};

window.supabaseHelper = supabaseHelper;
