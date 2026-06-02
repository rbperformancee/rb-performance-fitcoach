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
    // 'capacitor' au lieu de 'https' — sur iOS 26 + Capacitor 8, le scheme
    // 'https' déclenche un FrameLoadInterruptedByPolicyChange (code 102) qui
    // empêche le bundle local de charger dans WKWebView. Le scheme natif
    // 'capacitor' contourne la policy ATS et reste compatible avec l'origin
    // 'capacitor://localhost'. Aucun impact sur le bundle web (cf gating
    // isNative dans usePushNotifications, useAuth, etc.).
    iosScheme: 'capacitor',
    androidScheme: 'https',
  },
};

export default config;
