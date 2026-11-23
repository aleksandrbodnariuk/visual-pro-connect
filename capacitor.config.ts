import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.caf17b0047184c6f89ce8edc6f0e5c6f',
  appName: 'Спільнота B&C',
  webDir: 'dist',
  backgroundColor: '#0b0b0b',
  // Hot-reload from the Lovable sandbox. Remove the `server` block for a production APK.
  server: {
    url: 'https://caf17b00-4718-4c6f-89ce-8edc6f0e5c6f.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
