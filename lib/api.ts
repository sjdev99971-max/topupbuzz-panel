import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "X-Api-Key": API_KEY },
  timeout: 30000,
});

export const getHealth = () => api.get("/health").then(r => r.data);
export const getAccounts = () => api.get("/accounts").then(r => r.data);
export const getDialogs = (accId: string) =>
  api.get(`/accounts/${accId}/dialogs`).then(r => r.data);
export const getCampaign = (accId: string) =>
  api.get(`/accounts/${accId}/campaign`).then(r => r.data);
export const saveCampaign = (accId: string, payload: any) =>
  api.post(`/accounts/${accId}/campaign`, payload).then(r => r.data);
export const startCampaign = (accId: string) =>
  api.post(`/accounts/${accId}/start`).then(r => r.data);
export const stopCampaign = (accId: string) =>
  api.post(`/accounts/${accId}/stop`).then(r => r.data);
export const getLogs = (accId: string) =>
  api.get(`/accounts/${accId}/logs`).then(r => r.data);
