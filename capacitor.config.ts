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
      // launchAutoHide: true + 5s : iOS ferme le splash natif tout seul
      // au bout de 5s peu importe ce que fait JS (Rayan 12/06 — flash noir
      // entre splash et home sur builds 70-72). hide() explicite tourne
      // toujours en parallèle via rAF×2 dans index.js, donc en pratique
      // aucun écart visuel ressenti — filet de sécurité pur.
      launchAutoHide: true,
      launchShowDuration: 5000,
      launchFadeOutDuration: 0,
      // #050505 = même couleur que body de index.html → zero flash de
      // couleur entre splash natif et HTML.
      backgroundColor: '#050505',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // 'LIGHT' = icônes/texte CLAIRS sur un fond sombre (Capacitor :
      // Style.Light correspond à UIStatusBarStyleLightContent). L'app
      // est dark mode → icônes blanches sur #080C14, sinon elles sont
      // noires-sur-sombre = invisibles.
      style: 'LIGHT',
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
