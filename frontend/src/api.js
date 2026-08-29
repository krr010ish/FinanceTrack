import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Auth
export const register   = (data) => api.post("/api/auth/register", data);
export const login      = (data) => api.post("/api/auth/login", data);
export const logout     = ()     => api.post("/api/auth/logout");
export const getMe      = ()     => api.get("/api/auth/me");
export const updateMe   = (data) => api.put("/api/auth/me", data);

// Dashboard
export const getSummary    = (month) => api.get("/api/dashboard/summary", { params: { month } });
export const getPredictions= ()      => api.get("/api/dashboard/predict");
export const getCategories = ()      => api.get("/api/dashboard/categories");

// Transactions
export const getTransactions  = (params) => api.get("/api/transactions/", { params });
export const addTransaction   = (data)   => api.post("/api/transactions/", data);
export const updateTransaction= (id, d)  => api.put(`/api/transactions/${id}`, d);
export const deleteTransaction = (id)    => api.delete(`/api/transactions/${id}`);

// Budgets
export const getBudgets   = ()     => api.get("/api/budgets/");
export const setBudget    = (data) => api.post("/api/budgets/", data);
export const deleteBudget = (id)   => api.delete(`/api/budgets/${id}`);

// Reminders
export const getReminders   = ()      => api.get("/api/reminders/");
export const addReminder    = (data)  => api.post("/api/reminders/", data);
export const markPaid       = (id)    => api.post(`/api/reminders/${id}/pay`);
export const deleteReminder = (id)    => api.delete(`/api/reminders/${id}`);

export default api;
