import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "X-Api-Key": API_KEY },
  timeout: 60000,
});

export const getHealth = () => api.get("/health").then(r => r.data);
export const getAccounts = () => api.get("/accounts").then(r => r.data);
export const getDialogs = (id: string) => api.get(`/accounts/${id}/dialogs`).then(r => r.data);
export const getCampaign = (id: string) => api.get(`/accounts/${id}/campaign`).then(r => r.data);
export const saveCampaign = (id: string, p: any) => api.post(`/accounts/${id}/campaign`, p).then(r => r.data);
export const startCampaign = (id: string) => api.post(`/accounts/${id}/start`).then(r => r.data);
export const stopCampaign = (id: string) => api.post(`/accounts/${id}/stop`).then(r => r.data);
export const getLogs = (id: string) => api.get(`/accounts/${id}/logs`).then(r => r.data);

export const sendOtp = (phone: string) =>
  api.post("/auth/send-otp", { phone }).then(r => r.data);
export const verifyOtp = (session_id: string, code: string, password?: string) =>
  api.post("/auth/verify-otp", { session_id, code, password }).then(r => r.data);
export const telegramMiniAuth = (init_data: string) =>
  api.post("/auth/telegram-mini", { init_data }).then(r => r.data);

export const saveLocal = (key: string, val: any) => {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(val));
};
export const getLocal = (key: string) => {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(key);
  return v ? JSON.parse(v) : null;
};
export const clearLocal = (key: string) => {
  if (typeof window !== "undefined") localStorage.removeItem(key);
};

export const getTelegramWebApp = (): any => {
  if (typeof window === "undefined") return null;
  return (window as any).Telegram?.WebApp || null;
};
