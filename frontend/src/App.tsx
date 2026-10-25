import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { queryClient } from '@/services/queryClient';
import { router } from '@/routes';
import { useThemeEffect } from '@/hooks/useTheme';
import { useUiStore } from '@/store/uiStore';

export default function App() {
  useThemeEffect();
  const theme = useUiStore((s) => s.theme);
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster position="bottom-right" theme={theme} richColors closeButton />
    </QueryClientProvider>
  );
}
