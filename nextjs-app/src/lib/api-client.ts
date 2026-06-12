'use client'

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

// In Next.js the API is on the same origin, so baseURL is empty (relative URLs)
export const apiClient: AxiosInstance = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Auto-refresh on 401
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        useAuthStore.getState().setAccessToken(data.accessToken)
        onRefreshed(data.accessToken)
        isRefreshing = false
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(originalRequest)
      } catch {
        isRefreshing = false
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)
