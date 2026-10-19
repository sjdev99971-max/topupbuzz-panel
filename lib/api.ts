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
      if (s) { const u = JSON.parse(s); if (u?.id) config.headers["X-Telegram-Id"] = String(u.id); }
      const st = localStorage.getItem("stealth_id");
      if (st) config.headers["X-Stealth-Id"] = st;
    } catch {}
  }
  return config;
});

// health
export const getHealth = () => api.get("/health").then(r => r.data);
export const getMe = () => api.get("/me").then(r => r.data);
export const getPlans = () => api.get("/plans").then(r => r.data);

// accounts
export const getAccounts = () => api.get("/accounts").then(r => r.data);
export const getAccount = (id: string) => api.get(`/accounts/${id}`).then(r => r.data);
export const deleteAccount = (id: string) => api.delete(`/accounts/${id}`).then(r => r.data);
export const getSession = (id: string) => api.get(`/accounts/${id}/session`).then(r => r.data);
export const refreshDialogs = (id: string) => api.post(`/accounts/${id}/dialogs/refresh`).then(r => r.data);

// campaign
export const getCampaign = (id: string) => api.get(`/accounts/${id}/campaign`).then(r => r.data);
export const saveCampaign = (id: string, p: any) => api.post(`/accounts/${id}/campaign`, p).then(r => r.data);
export const startCampaign = (id: string) => api.post(`/accounts/${id}/campaign/start`).then(r => r.data);
export const stopCampaign = (id: string) => api.post(`/accounts/${id}/campaign/stop`).then(r => r.data);

// logs
export const getLogs = (id: string, limit = 100) => api.get(`/accounts/${id}/logs?limit=${limit}`).then(r => r.data);
export const getLogsCsv = (id: string) => `${API_URL}/accounts/${id}/logs.csv`;

// auth
export const sendOtp = (phone: string, telegram_id?: number) =>
  api.post("/auth/send-otp", { phone, telegram_id }).then(r => r.data);
export const verifyOtp = (sid: string, code: string, pw?: string) =>
  api.post("/auth/verify-otp", { session_id: sid, code, password: pw }).then(r => r.data);
export const telegramMiniAuth = (init_data: string) =>
  api.post("/auth/telegram-mini", { init_data }).then(r => r.data);

// admin
export const adminGetUsers = () => api.get("/admin/users").then(r => r.data);
export const adminUpdatePlan = (p: any) => api.post("/admin/plans", p).then(r => r.data);
export const adminSetUserPlan = (user_id: number, plan: string) =>
  api.post("/admin/set-user-plan", { user_id, plan }).then(r => r.data);
export const adminBroadcast = (text: string) => api.post("/admin/broadcast", { text }).then(r => r.data);

// analytics
export const getAnalytics = () => api.get("/analytics/me").then(r => r.data);

// helpers
export const saveLocal = (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); };
export const getLocal = (k: string) => { if (typeof window === "undefined") return null; const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; };
export const clearLocal = (k: string) => { if (typeof window !== "undefined") localStorage.removeItem(k); };
export const getTelegramWebApp = (): any => typeof window === "undefined" ? null : (window as any).Telegram?.WebApp || null;

export const SUPPORT_USER = "@DEVELOPER_JAHID_BHAI";


// stealth
export const setStealth = (userId: number) => {
  if (typeof window !== "undefined") localStorage.setItem("stealth_id", String(userId));
};
export const clearStealth = () => {
  if (typeof window !== "undefined") localStorage.removeItem("stealth_id");
};
export const getStealth = (): number | null => {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("stealth_id");
  return v ? parseInt(v, 10) : null;
};
export const getMeStealth = () => api.get("/me-stealth").then(r => r.data);


// stats
export const getMyStats = () => api.get("/stats/me").then(r => r.data);
export const getAdminStats = () => api.get("/stats/admin").then(r => r.data);
export const getAccountStats = (id: string) => api.get(`/accounts/${id}/stats`).then(r => r.data);

// v2
export const retryFailed = (accId: string) => api.post(`/accounts/${accId}/retry-failed`).then(r => r.data);
export const scheduleCampaign = (accId: string, scheduled_at: number) =>
  api.post(`/accounts/${accId}/campaign/schedule`, { scheduled_at }).then(r => r.data);
export const unscheduleCampaign = (accId: string) =>
  api.post(`/accounts/${accId}/campaign/unschedule`).then(r => r.data);
export const duplicateCampaign = (accId: string, from_acc_id: string) =>
  api.post(`/accounts/${accId}/campaign/duplicate`, { from_acc_id }).then(r => r.data);

// batch1
export const getNotifications = () => api.get("/notifications").then(r => r.data);
export const markNotifsSeen = () => api.post("/notifications/mark-seen").then(r => r.data);

// batch2
export const pauseCampaign = (accId: string) => api.post(`/accounts/${accId}/campaign/pause`).then(r => r.data);
export const resumeCampaign = (accId: string) => api.post(`/accounts/${accId}/campaign/resume`).then(r => r.data);
export const getHealthAccounts = () => api.get("/health/accounts").then(r => r.data);
export const runHealthCheck = (accId: string) => api.post(`/accounts/${accId}/health-check`).then(r => r.data);
export const getAnalyticsGroups = () => api.get("/analytics/groups").then(r => r.data);
export const getAnalyticsHours = () => api.get("/analytics/hours").then(r => r.data);
export const getAnalyticsCost = () => api.get("/analytics/cost").then(r => r.data);

// New User Features
export const getMyAccounts = () => api.get("/my-accounts").then(r => r.data);
export const getFolders = () => api.get("/folders").then(r => r.data);
export const createFolder = (name: string, groups: any[]) => api.post("/folders", { name, groups }).then(r => r.data);
export const getReferralLink = () => api.get("/referral/link").then(r => r.data);
export const redeemCoins = (days: number, cost: number) => api.post("/redeem-coins", { days, cost }).then(r => r.data);

export const broadcastNow = (payload: any) => api.post("/broadcast-now", payload).then(r => r.data);
export const getSavedPosts = () => api.get("/saved-posts").then(r => r.data);
export const createSavedPost = (payload: any) => api.post("/saved-posts", payload).then(r => r.data);
