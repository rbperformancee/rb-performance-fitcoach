import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rbperform',
  appName: 'RB Perform',
  webDir: 'build',
  ios: {
    scheme: 'RB Perform',
    // 'never' = la WebView occupe TOUT l'écran y compris derrière le notch/
    // Dynamic Island. Le body CSS background #050505 peint la zone safe-area.
    // 'always' laissait une bande blanche au-dessus du status bar.
    contentInset: 'never',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      // Auto-hide = false → on garde le splash natif iOS tant que React
      // n'a pas monté. Sans ça, iOS hide à 500ms puis la WebView affiche
      // ~1.5s d'écran noir avant que index.html peinte. Le hide() explicite
      // est appelé dans App.jsx après le 1er paint.
      launchAutoHide: false,
      // Fallback : si JS plante / n'appelle jamais hide(), iOS hide après 4s.
      launchShowDuration: 4000,
      // #050505 = même couleur que body de index.html → zero flash de
      // couleur entre splash natif et HTML.
      backgroundColor: '#050505',
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
