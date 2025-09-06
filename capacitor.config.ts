import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'FarmAlert',
  // webDir: 'dist/mobile-app/browser'
  server: {
    url: "http://10.97.49.70:4200",
    cleartext: true
  }
};

export default config;
