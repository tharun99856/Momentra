'use client'

import { create } from 'zustand'

export interface AuthUser {
  id: string
  username: string
  email: string
  globalRole: 'admin' | 'user'
  avatarUrl: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
  setAccessToken: (accessToken: string) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setAccessToken: (accessToken) => set({ accessToken }),
}))
