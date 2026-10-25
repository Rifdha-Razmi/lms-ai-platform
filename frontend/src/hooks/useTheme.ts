import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';

/** Applies the theme class to <html> and follows the OS when set to "system". */
export function useThemeEffect() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
