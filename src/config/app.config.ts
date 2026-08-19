export const APP_CONFIG = {
  name: 'Solution Advisory Platform',
  version: '1.0.0',
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://187.127.163.17:3009',
  defaultLanguage: 'en',
  stepperInterval: 3000, // Poll status every 3 seconds
};
