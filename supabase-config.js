const SUPABASE_URL = "https://toiclkosernimzqbbvrd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaWNsa29zZXJuaW16cWJidnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNDE0NjQsImV4cCI6MjA5ODgxNzQ2NH0.ehvYQfHFNCmqHrVIKEEU0XU1Aq83Mp7-uK_Q1_os228";
// WARNING: Service role key has admin access. Do not expose this key in public web apps.
// We are storing it here since this is a local college project.
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaWNsa29zZXJuaW16cWJidnJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzI0MTQ2NCwiZXhwIjoyMDk4ODE3NDY0fQ.YB5lvk74RqIUEfarFMnBIsiHxpx0zE2uPUMI2LyM7Tc";

// BUG FIX: Expose clients globally so nandu.html inline code can access them
window.supabaseClient = null;
window.supabaseAdminClient = null;

if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseAdminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("[Supabase] ✅ Clients initialized successfully.");
} else {
    console.error("[Supabase] ❌ Supabase SDK not loaded. Make sure the CDN script is included BEFORE supabase-config.js.");
}

const supabaseHelper = {
    // 1. Log page view
    async logPageView(page) {
        if (!window.supabaseClient) { console.warn("[Supabase] Client not ready, skipping logPageView"); return; }
        const device = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
        try {
            const { error } = await window.supabaseClient.from('page_views').insert([{ page, device }]);
            if (error) throw error;
            console.log(`[Supabase] ✅ Page view logged: ${page} (${device})`);
        } catch (e) {
            console.error("[Supabase] ❌ Error logging page view:", e.message || e);
        }
    },

    // 2. Realtime User Heartbeat
    async updateSession(pageName) {
        if (!window.supabaseClient) return;
        let sessionId = sessionStorage.getItem('user_session_id');
        if (!sessionId) {
            sessionId = 'SESS_' + Math.random().toString(36).substring(2, 9) + Date.now();
            sessionStorage.setItem('user_session_id', sessionId);
        }
        const geo = JSON.parse(localStorage.getItem('user_geo') || '{"city":"Unknown","region":"Unknown"}');
        const device = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
        try {
            const { error } = await window.supabaseClient.from('active_sessions').upsert({
                id: sessionId,
                page: pageName,
                last_active: new Date().toISOString(),
                device: device,
                city: geo.city,
                region: geo.region
            });
            if (error) throw error;
        } catch (e) {
            console.error("[Supabase] ❌ Error updating active session:", e.message || e);
        }
    },

    // 3. Log lead — column names must match exactly what is in the Supabase table
    async logLead(leadData) {
        if (!window.supabaseClient) { console.warn("[Supabase] Client not ready, skipping logLead"); return; }
        try {
            const payload = {
                name: leadData.name,
                phone: leadData.phone,
                pincode: leadData.pincode,
                city: leadData.city,
                state: leadData.state,
                house: leadData.house,
                road: leadData.road,
                productid: leadData.productId,   // lowercase to match Postgres default
                color: leadData.color,
                geocity: leadData.geoCity,        // lowercase to match Postgres default
                georegion: leadData.geoRegion     // lowercase to match Postgres default
            };
            console.log("[Supabase] Inserting lead payload:", payload);
            const { data, error } = await window.supabaseClient.from('leads').insert(payload).select();
            if (error) throw error;
            console.log("[Supabase] ✅ Lead saved:", data);
        } catch (e) {
            console.error("[Supabase] ❌ Error saving lead:", e.message || e);
        }
    },

    // 4. Log order attempt
    async logOrder(orderData) {
        if (!window.supabaseClient) { console.warn("[Supabase] Client not ready, skipping logOrder"); return; }
        try {
            const payload = {
                productname: orderData.productName,  // lowercase to match Postgres default
                color: orderData.color,
                amount: orderData.amount,
                donation: orderData.donation,
                method: orderData.method,
                status: orderData.status,
                city: orderData.city,
                region: orderData.region
            };
            console.log("[Supabase] Inserting order payload:", payload);
            const { data, error } = await window.supabaseClient.from('orders').insert(payload).select();
            if (error) throw error;
            console.log("[Supabase] ✅ Order saved:", data);
        } catch (e) {
            console.error("[Supabase] ❌ Error saving order:", e.message || e);
        }
    },

    // 5. Get settings
    async getSettings() {
        if (!window.supabaseClient) return {};
        try {
            const { data, error } = await window.supabaseClient.from('settings').select('*');
            if (error) throw error;
            const settings = {};
            data.forEach(item => {
                settings[item.key] = item.value;
            });
            console.log("[Supabase] ✅ Settings loaded:", settings);
            return settings;
        } catch (e) {
            console.error("[Supabase] ❌ Error loading settings:", e.message || e);
            return {};
        }
    },

    // 6. Save settings
    async saveSettings(key, value) {
        if (!window.supabaseClient) return;
        try {
            const { error } = await window.supabaseClient.from('settings').upsert({ key, value });
            if (error) throw error;
            console.log(`[Supabase] ✅ Setting saved: ${key} = ${value}`);
        } catch (e) {
            console.error("[Supabase] ❌ Error saving setting:", e.message || e);
        }
    },

    // 7. Get dashboard stats aggregated
    async getStats() {
        const client = window.supabaseAdminClient || window.supabaseClient;
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
                if (error) throw error;
                stats[p] = count || 0;
            }
            for (const d of devices) {
                const { count, error } = await client
                    .from('page_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('device', d);
                if (error) throw error;
                stats[d] = count || 0;
            }
            console.log("[Supabase] ✅ Stats loaded:", stats);
            return stats;
        } catch (e) {
            console.error("[Supabase] ❌ Error fetching stats:", e.message || e);
            return { home: 0, product: 0, address: 0, cart: 0, payment: 0, mobile: 0, desktop: 0 };
        }
    },

    // 8. Fetch all leads
    async getLeads() {
        const client = window.supabaseAdminClient || window.supabaseClient;
        if (!client) return [];
        try {
            const { data, error } = await client
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            console.log(`[Supabase] ✅ Fetched ${data.length} leads`);
            return data.map(l => ({
                timestamp: l.created_at,
                name: l.name,
                phone: l.phone,
                pincode: l.pincode,
                geoCity: l.geocity,
                geoRegion: l.georegion,
                house: l.house,
                road: l.road,
                city: l.city,
                state: l.state,
                productId: l.productid,
                color: l.color
            }));
        } catch (e) {
            console.error("[Supabase] ❌ Error fetching leads:", e.message || e);
            return [];
        }
    },

    // 9. Fetch all orders
    async getOrders() {
        const client = window.supabaseAdminClient || window.supabaseClient;
        if (!client) return [];
        try {
            const { data, error } = await client
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            console.log(`[Supabase] ✅ Fetched ${data.length} orders`);
            return data.map(o => ({
                timestamp: o.created_at,
                productName: o.productname,
                color: o.color,
                amount: o.amount,
                donation: o.donation,
                method: o.method,
                city: o.city,
                region: o.region,
                status: o.status
            }));
        } catch (e) {
            console.error("[Supabase] ❌ Error fetching orders:", e.message || e);
            return [];
        }
    },

    // 10. Fetch active sessions (active in last 15s)
    async getActiveSessions() {
        const client = window.supabaseAdminClient || window.supabaseClient;
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
            console.error("[Supabase] ❌ Error fetching active sessions:", e.message || e);
            return [];
        }
    },

    // 11. Clear all tracking data
    async clearAllData() {
        const client = window.supabaseAdminClient || window.supabaseClient;
        if (!client) return;
        try {
            await client.from('page_views').delete().neq('id', -1);
            await client.from('leads').delete().neq('id', -1);
            await client.from('orders').delete().neq('id', -1);
            await client.from('active_sessions').delete().neq('id', '__placeholder__');
            console.log("[Supabase] ✅ All data cleared.");
        } catch (e) {
            console.error("[Supabase] ❌ Error clearing data:", e.message || e);
        }
    }
};

window.supabaseHelper = supabaseHelper;
