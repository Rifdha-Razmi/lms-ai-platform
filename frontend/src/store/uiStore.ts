import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface UiState {
  theme: Theme;
  language: string;
  sidebarOpen: boolean;
  setTheme: (t: Theme) => void;
  setLanguage: (l: string) => void;
  setSidebarOpen: (o: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'en',
      sidebarOpen: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: 'lms-ui', partialize: (s) => ({ theme: s.theme, language: s.language }) },
  ),
);
