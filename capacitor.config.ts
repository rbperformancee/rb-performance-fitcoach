import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rbperform',
  appName: 'RB Perform',
  webDir: 'build',
  ios: {
    scheme: 'RB Perform',
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#080C14',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080C14',
    },
  },
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
  },
};

export default config;
