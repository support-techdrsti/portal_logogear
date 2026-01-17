import { create } from 'zustand'
import { api } from '../utils/api'

interface User {
  id: string
  email: string
  name: string
  department?: string
  roles: string[]
}

interface AuthState {
  user: User | null
  isLoading: boolean
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  checkAuth: async () => {
    try {
      const response = await api.get('/auth/me')
      set({ user: response.data, isLoading: false })
    } catch (error) {
      set({ user: null, isLoading: false })
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
      set({ user: null })
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      set({ user: null })
      window.location.href = '/auth/login'
    }
  },
}))