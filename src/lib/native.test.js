import {
  isNative,
  isIOSNative,
  isAndroidNative,
  isWeb,
  getPlatform,
  debugPlatform,
} from "./native";

// Sous Jest, on tourne en Node : @capacitor/core est bien importé mais
// `Capacitor.isNativePlatform()` retourne `false` et `getPlatform()` renvoie
// "web". Ces tests valident le contrat de défaut "web" qui sert de garde-fou
// anti-régression PWA.

describe("src/lib/native — contrat de défaut web", () => {
  test("isNative() === false hors WebView Capacitor", () => {
    expect(isNative()).toBe(false);
  });

  test("isWeb() est l'inverse strict de isNative()", () => {
    expect(isWeb()).toBe(!isNative());
    expect(isWeb()).toBe(true);
  });

  test("getPlatform() renvoie 'web' par défaut", () => {
    expect(getPlatform()).toBe("web");
  });

  test("isIOSNative() et isAndroidNative() sont mutuellement exclusifs avec web", () => {
    expect(isIOSNative()).toBe(false);
    expect(isAndroidNative()).toBe(false);
  });

  test("debugPlatform() renvoie un objet introspectable sans throw", () => {
    const d = debugPlatform();
    expect(typeof d).toBe("object");
    expect(d).toHaveProperty("isNative");
    expect(d).toHaveProperty("platform");
    expect(d).toHaveProperty("capacitorLoaded");
    expect(d.isNative).toBe(false);
    expect(d.platform).toBe("web");
  });
});
