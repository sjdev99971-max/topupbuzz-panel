import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "X-Api-Key": API_KEY },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const s = localStorage.getItem("session");
      if (s) { const u = JSON.parse(s); const uid = u?.id || u?.user_id; if (uid) config.headers["X-Telegram-Id"] = String(uid); }
      const st = localStorage.getItem("stealth_id");
      if (st) config.headers["X-Stealth-Id"] = st;
    } catch {}
  }
  return config;
});

export const SUPPORT_USER = "@DEVELOPER_JAHID_BHAI";

// Core & Auth
export const getHealth = () => api.get("/health").then(r => r.data);
export const getMe = () => api.get("/me").then(r => r.data);
export const getPlans = () => api.get("/plans").then(r => r.data);
export const getMyStats = () => api.get("/stats/me").then(r => r.data);
export const sendOtp = (phone: string, telegram_id?: number) => api.post("/auth/send-otp", { phone, telegram_id }).then(r => r.data);
export const verifyOtp = (session_id: string, code: string, password?: string) => api.post("/auth/verify-otp", { session_id, code, password }).then(r => r.data);
export const telegramMiniAuth = (init_data: string) => api.post("/auth/telegram-mini", { init_data }).then(r => r.data);

// Accounts & Campaigns
export const getAccounts = () => api.get("/accounts").then(r => r.data);
export const getAccount = (id: string) => api.get(`/accounts/${id}`).then(r => r.data);
export const deleteAccount = (id: string) => api.delete(`/accounts/${id}`).then(r => r.data);
export const refreshDialogs = (id: string) => api.post(`/accounts/${id}/dialogs/refresh`).then(r => r.data);
export const getAccountStats = (id: string) => api.get(`/accounts/${id}/stats`).then(r => r.data);
export const getCampaign = (id: string) => api.get(`/accounts/${id}/campaign`).then(r => r.data);
export const saveCampaign = (id: string, payload: any) => api.post(`/accounts/${id}/campaign`, payload).then(r => r.data);
export const startCampaign = (id: string) => api.post(`/accounts/${id}/campaign/start`).then(r => r.data);
export const stopCampaign = (id: string) => api.post(`/accounts/${id}/campaign/stop`).then(r => r.data);
export const pauseCampaign = (id: string) => api.post(`/accounts/${id}/campaign/pause`).then(r => r.data);
export const resumeCampaign = (id: string) => api.post(`/accounts/${id}/campaign/resume`).then(r => r.data);
export const scheduleCampaign = (id: string, scheduled_at: number) => api.post(`/accounts/${id}/campaign/schedule`, { scheduled_at }).then(r => r.data);
export const unscheduleCampaign = (id: string) => api.post(`/accounts/${id}/campaign/unschedule`).then(r => r.data);
export const retryFailed = (id: string) => api.post(`/accounts/${id}/retry-failed`).then(r => r.data);
export const getLogs = (id: string, limit: number = 100) => api.get(`/accounts/${id}/logs?limit=${limit}`).then(r => r.data);
export const getLogsCsv = (id: string) => `${API_URL}/accounts/${id}/logs.csv`;

// Admin
export const getAdminStats = () => api.get("/stats/admin").then(r => r.data);
export const adminGetUsers = () => api.get("/admin/users").then(r => r.data);
export const adminUpdatePlan = (payload: any) => api.post("/admin/plans", payload).then(r => r.data);
export const adminSetUserPlan = (userId: number, plan: string, days?: number) => api.post("/admin/set-user-plan", { user_id: userId, plan, days }).then(r => r.data);
export const adminBroadcast = (text: string) => api.post("/admin/broadcast", { text }).then(r => r.data);

// New Features (Broadcast, Chats, Folders)
export const broadcastNow = (payload: any) => api.post("/broadcast-now", payload).then(r => r.data);
export const getSavedPosts = () => api.get("/saved-posts").then(r => r.data);
export const createSavedPost = (payload: any) => api.post("/saved-posts", payload).then(r => r.data);
export const getFolders = () => api.get("/folders").then(r => r.data);
export const createFolder = (name: string, groups: any[]) => api.post("/folders", { name, groups }).then(r => r.data);

// Stealth & LocalStorage
export const setStealth = (userId: number) => { if (typeof window !== "undefined") localStorage.setItem("stealth_id", String(userId)); };
export const saveLocal = (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); };
export const getLocal = (k: string) => { if (typeof window === "undefined") return null; const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; };
export const clearLocal = (k: string) => { if (typeof window !== "undefined") localStorage.removeItem(k); };
export const getTelegramWebApp = (): any => typeof window === "undefined" ? null : (window as any).Telegram?.WebApp || null;


// Analytics
export const getAnalyticsGroups = () => api.get("/analytics/groups").then(r => r.data);
export const getAnalyticsHours = () => api.get("/analytics/hours").then(r => r.data);
export const getAnalyticsCost = () => api.get("/analytics/cost").then(r => r.data);

// Health
export const getHealthAccounts = () => api.get("/health/accounts").then(r => r.data);
export const runHealthCheck = (id: string) => api.post(`/accounts/${id}/health-check`).then(r => r.data);

// Notifications
export const getNotifications = () => api.get("/notifications").then(r => r.data);
export const markNotifsSeen = () => api.post("/notifications/mark-seen").then(r => r.data);

// Webhooks
export const getWebhooks = () => api.get("/webhooks").then(r => r.data);
export const addWebhook = (url: string, events: string) => api.post("/webhooks", { url, events }).then(r => r.data);
export const deleteWebhook = (id: number) => api.delete(`/webhooks/${id}`).then(r => r.data);

// Stealth & Me
export const getMeStealth = () => api.get("/me-stealth").then(r => r.data);

// Campaigns
export const duplicateCampaign = (id: string, from_acc_id: string) => api.post(`/accounts/${id}/campaign/duplicate`, { from_acc_id }).then(r => r.data);

// Coins
export const getReferralLink = () => api.get("/referral/link").then(r => r.data);
export const redeemCoins = (days: number, cost: number) => api.post("/redeem-coins", { days, cost }).then(r => r.data);

// Session
export const getSession = (id: string) => api.get(`/accounts/${id}/session`).then(r => r.data);


export const getStealth = (): number | null => {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("stealth_id");
  return v ? parseInt(v, 10) : null;
};
export const clearStealth = () => {
  if (typeof window !== "undefined") localStorage.removeItem("stealth_id");
};

export const joinMissingGroups = (acc_id: string, groups: any[]) => api.post("/groups/join-missing", { acc_id, groups }).then(r => r.data);
export const exportFolder = (folder_id: number) => `${API_URL}/folders/${folder_id}/export`;

export const checkSpamBot = (id: string) => api.post(`/accounts/${id}/check-spambot`).then(r => r.data);

// For file download with headers
export const downloadFolderFile = async (id: number) => {
  try {
    const res = await api.get(`/folders/${id}/export`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `folder_${id}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (e) {
    console.error("Download failed", e);
    alert("Download failed!");
  }
};


export const adminDemoteUser = async (uid: number) => await api.post('/admin/demote-user', { user_id: uid }).then(r => r.data);

export const updateFolder = async (id: number, name: string, groups: any[]) => await api.put(`/folders/${id}`, { name, groups }).then(r => r.data);

export const updateSettings = async (settings: any) => await api.post('/user/settings', settings).then(r => r.data);

export const adminGetAllAccounts = () => api.get("/admin/all-accounts").then(r => r.data);
