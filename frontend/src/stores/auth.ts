import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserInfo {
  id: number
  username: string
  nickname: string
  role: string
  email: string
  avatar: string
}

interface AuthState {
  token: string | null
  user: UserInfo | null
  currentCluster: number | null
  setAuth: (token: string, user: UserInfo) => void
  setCluster: (id: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      currentCluster: null,
      setAuth: (token, user) => set({ token, user }),
      setCluster: (id) => set({ currentCluster: id }),
      logout: () => set({ token: null, user: null, currentCluster: null }),
    }),
    { name: 'kubemanage-auth' }
  )
)
