import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  isDark: boolean
  collapsed: boolean
  toggleTheme: () => void
  toggleCollapsed: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      collapsed: false,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: 'kubemanage-theme' }
  )
)
