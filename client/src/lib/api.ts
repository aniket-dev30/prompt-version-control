import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor — attach token to every request ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — handle auth errors globally ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — log out
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  me: () => api.get('/auth/me'),

  sharedWithMe: () => api.get('/auth/shared-with-me'),
}

// ── Prompts API ───────────────────────────────────────────────────────────────
export const promptsAPI = {
  create: (data: {
    name: string
    description?: string
    tags?: string[]
    is_public?: boolean
  }) => api.post('/prompts', data),

  getAll: (params?: {
    search?: string
    tag?: string
    page?: number
    limit?: number
  }) => api.get('/prompts', { params }),

  getOne: (id: string) => api.get(`/prompts/${id}`),

  update: (id: string, data: {
    name?: string
    description?: string
    tags?: string[]
    is_public?: boolean
  }) => api.patch(`/prompts/${id}`, data),

  delete: (id: string) => api.delete(`/prompts/${id}`),
}

// ── Versions API ──────────────────────────────────────────────────────────────
export const versionsAPI = {
  create: (promptId: string, data: {
    user_prompt: string
    system_prompt?: string
    commit_message?: string
    model?: string
    temperature?: number
    max_tokens?: number
    variables?: Record<string, string>
  }) => api.post(`/prompts/${promptId}/versions`, data),

  getAll: (promptId: string) =>
    api.get(`/prompts/${promptId}/versions`),

  getOne: (promptId: string, versionNumber: number) =>
    api.get(`/prompts/${promptId}/versions/${versionNumber}`),

  diff: (promptId: string, v1: number, v2: number) =>
    api.get(`/prompts/${promptId}/versions/diff`, { params: { v1, v2 } }),

  changelog: (promptId: string, v1: number, v2: number) =>
    api.get(`/prompts/${promptId}/versions/changelog`, { params: { v1, v2 } }),

  delete: (promptId: string, versionNumber: number) =>
    api.delete(`/prompts/${promptId}/versions/${versionNumber}`),
}

// ── Execution API ─────────────────────────────────────────────────────────────
export const executionAPI = {
  execute: (promptId: string, versionNumber: number, data: {
    input_variables?: Record<string, string>
    model?: string
  }) => api.post(`/prompts/${promptId}/versions/${versionNumber}/execute`, data),

  getOutputs: (promptId: string, versionNumber: number) =>
    api.get(`/prompts/${promptId}/versions/${versionNumber}/outputs`),
}

// ── Shares API ────────────────────────────────────────────────────────────────
export const sharesAPI = {
  share: (promptId: string, data: { email: string; permission: 'view' | 'edit' }) =>
    api.post(`/prompts/${promptId}/shares`, data),

  getAll: (promptId: string) =>
    api.get(`/prompts/${promptId}/shares`),

  update: (promptId: string, shareId: string, permission: 'view' | 'edit') =>
    api.patch(`/prompts/${promptId}/shares/${shareId}`, { permission }),

  remove: (promptId: string, shareId: string) =>
    api.delete(`/prompts/${promptId}/shares/${shareId}`),

}
// ── Evaluation API ────────────────────────────────────────────────────────────
export const evaluationAPI = {
  evaluate: (promptId: string, versionNumber: number) =>
    api.post(`/prompts/${promptId}/versions/${versionNumber}/evaluate`),

  getSaved: (promptId: string, versionNumber: number) =>
    api.get(`/prompts/${promptId}/versions/${versionNumber}/evaluation`),
}
export default api