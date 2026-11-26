import type { CapacitorConfig } from '@capacitor/cli';

// Production config: the APK bundles the built site from `dist` (no live server),
// so every release works offline-first and matches the published web code.
// appId must never change: Android updates require the same package id + signing key.
const config: CapacitorConfig = {
  appId: 'app.communitybc.social',
  appName: 'Спільнота B&C',
  webDir: 'dist',
  backgroundColor: '#0b0b0b',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
