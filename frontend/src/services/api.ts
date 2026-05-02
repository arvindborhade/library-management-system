import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Books
export const booksApi = {
  list: (page = 1, pageSize = 10) =>
    api.get(`/api/books?page=${page}&page_size=${pageSize}`),
  get: (id: string) => api.get(`/api/books/${id}`),
  create: (data: object) => api.post("/api/books", data),
  update: (id: string, data: object) => api.put(`/api/books/${id}`, data),
  delete: (id: string) => api.delete(`/api/books/${id}`),
  search: (q: string) => api.get(`/api/books/search?q=${encodeURIComponent(q)}`),
};

// Members
export const membersApi = {
  list: (page = 1, pageSize = 10) =>
    api.get(`/api/members?page=${page}&page_size=${pageSize}`),
  get: (id: string) => api.get(`/api/members/${id}`),
  create: (data: object) => api.post("/api/members", data),
  update: (id: string, data: object) => api.put(`/api/members/${id}`, data),
  delete: (id: string) => api.delete(`/api/members/${id}`),
  search: (q: string) => api.get(`/api/members/search?q=${encodeURIComponent(q)}`),
  borrowedBooks: (id: string) => api.get(`/api/members/${id}/borrowed-books`),
  borrowingHistory: (id: string) => api.get(`/api/members/${id}/borrowing-history`),
};

// Borrowings
export const borrowingsApi = {
  list: (page = 1, pageSize = 10, status?: string, q?: string) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    return api.get(`/api/borrowings?${params}`);
  },
  active: () => api.get("/api/borrowings/active"),
  overdue: () => api.get("/api/borrowings/overdue"),
  get: (id: string) => api.get(`/api/borrowings/${id}`),
  borrow: (data: object) => api.post("/api/borrowings/borrow", data),
  return: (id: string) => api.post(`/api/borrowings/${id}/return`),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get("/api/dashboard/summary"),
  recentActivities: () => api.get("/api/dashboard/recent-activities"),
};

export default api;
