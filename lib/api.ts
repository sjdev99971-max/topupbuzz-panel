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

// Auth & Core
export const getHealth = () => api.get("/health").then(r => r.data);
export const getMe = () => api.get("/me").then(r => r.data);
export const getPlans = () => api.get("/plans").then(r => r.data);
export const getMyStats = () => api.get("/stats/me").then(r => r.data);
export const getAccounts = () => api.get("/accounts").then(r => r.data);
export const getCampaign = (id: string) => api.get(`/accounts/${id}/campaign`).then(r => r.data);
export const deleteAccount = (id: string) => api.delete(`/accounts/${id}`).then(r => r.data);
export const telegramMiniAuth = (init_data: string) => api.post("/auth/telegram-mini", { init_data }).then(r => r.data);
export const refreshDialogs = (id: string) => api.post(`/accounts/${id}/dialogs/refresh`).then(r => r.data);

// Broadcast & Posts
export const broadcastNow = (payload: any) => api.post("/broadcast-now", payload).then(r => r.data);
export const getSavedPosts = () => api.get("/saved-posts").then(r => r.data);
export const createSavedPost = (payload: any) => api.post("/saved-posts", payload).then(r => r.data);

// Folders & Coins
export const getFolders = () => api.get("/folders").then(r => r.data);
export const createFolder = (name: string, groups: any[]) => api.post("/folders", { name, groups }).then(r => r.data);

// LocalStorage & WebApp
export const saveLocal = (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); };
export const getLocal = (k: string) => { if (typeof window === "undefined") return null; const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; };
export const clearLocal = (k: string) => { if (typeof window !== "undefined") localStorage.removeItem(k); };
export const getTelegramWebApp = (): any => typeof window === "undefined" ? null : (window as any).Telegram?.WebApp || null;
