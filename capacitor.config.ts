import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rbperform',
  appName: 'RB Perform',
  webDir: 'build',
  // backgroundColor de la WKWebView — couvre la zone derrière la status bar
  // et l'overscroll. Sans ça, iOS peint la WebView en NOIR pur (#000) par
  // défaut → bande noire visible au-dessus du body #050505 (Rayan, 12/06).
  backgroundColor: '#050505',
  ios: {
    scheme: 'RB Perform',
    // 'never' = la WebView occupe TOUT l'écran y compris derrière le notch/
    // Dynamic Island. Le body CSS background #050505 peint la zone safe-area.
    // 'always' laissait une bande blanche au-dessus du status bar.
    contentInset: 'never',
    backgroundColor: '#050505',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      // Auto-hide ACTIVÉ avec durée 5s : si JS plante ou que React met du
      // temps à monter, iOS ferme le splash tout seul à 5s. Sans ça l'athlète
      // pouvait rester figé sur l'éclair indéfiniment (Rayan, 12/06 build 68).
      // Le hide() explicite dans App.jsx s'exécute toujours en premier au
      // 1er paint via rAF×2 (~16-100ms), donc en pratique aucun écart visuel
      // visible — c'est un filet de sécurité pur.
      launchAutoHide: true,
      launchShowDuration: 5000,
      launchFadeOutDuration: 0,
      // #050505 = même couleur que body de index.html → zero flash de
      // couleur entre splash natif et HTML #splash (PWA-style éclair 80px).
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
