import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "X-Api-Key": API_KEY },
  timeout: 60000,
});

// attach telegram id automatically
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const s = localStorage.getItem("session");
      if (s) {
        const u = JSON.parse(s);
        if (u?.id) config.headers["X-Telegram-Id"] = String(u.id);
      }
    } catch {}
  }
  return config;
});

export const getHealth = () => api.get("/health").then(r => r.data);
export const getMe = () => api.get("/me").then(r => r.data);
export const getPlans = () => api.get("/plans").then(r => r.data);
export const getAccounts = () => api.get("/accounts").then(r => r.data);
export const getDialogs = (id: string) => api.get(`/accounts/${id}/dialogs`).then(r => r.data);
export const getCampaign = (id: string) => api.get(`/accounts/${id}/campaign`).then(r => r.data);
export const saveCampaign = (id: string, p: any) => api.post(`/accounts/${id}/campaign`, p).then(r => r.data);
export const startCampaign = (id: string) => api.post(`/accounts/${id}/start`).then(r => r.data);
export const stopCampaign = (id: string) => api.post(`/accounts/${id}/stop`).then(r => r.data);
export const getLogs = (id: string) => api.get(`/accounts/${id}/logs`).then(r => r.data);

export const adminGetUsers = () => api.get("/admin/users").then(r => r.data);
export const adminUpdatePlan = (p: any) => api.post("/admin/plans", p).then(r => r.data);
export const adminSetUserPlan = (user_id: number, plan: string) =>
  api.post("/admin/set-user-plan", { user_id, plan }).then(r => r.data);

export const sendOtp = (phone: string) =>
  api.post("/auth/send-otp", { phone }).then(r => r.data);
export const verifyOtp = (session_id: string, code: string, password?: string) =>
  api.post("/auth/verify-otp", { session_id, code, password }).then(r => r.data);
export const telegramMiniAuth = (init_data: string) =>
  api.post("/auth/telegram-mini", { init_data }).then(r => r.data);

export const saveLocal = (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); };
export const getLocal = (k: string) => { if (typeof window === "undefined") return null; const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; };
export const clearLocal = (k: string) => { if (typeof window !== "undefined") localStorage.removeItem(k); };

export const getTelegramWebApp = (): any => {
  if (typeof window === "undefined") return null;
  return (window as any).Telegram?.WebApp || null;
};

export const SUPPORT_USER = "@DEVELOPER_JAHID_BHAI";
