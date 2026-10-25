export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') === 'true',
  appName: import.meta.env.VITE_APP_NAME ?? 'LMS-AI',
};
