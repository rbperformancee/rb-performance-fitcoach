import { setProgrammeHtml, getProgrammeHtml, clearProgrammeCache } from "./offline";

// Sous Jest (Node, isNative() === false), on est sur le path web. Les
// fonctions doivent dégrader silencieusement quand le service worker
// n'existe pas, et ne pas throw.

describe("src/lib/offline — web path dégradé sans SW", () => {
  test("setProgrammeHtml() retourne false silencieusement sans SW", async () => {
    const r = await setProgrammeHtml("<html>test</html>");
    expect(r).toBe(false); // pas de navigator.serviceWorker.controller
  });

  test("setProgrammeHtml() ignore les inputs invalides", async () => {
    expect(await setProgrammeHtml(null)).toBe(false);
    expect(await setProgrammeHtml("")).toBe(false);
    expect(await setProgrammeHtml(undefined)).toBe(false);
    expect(await setProgrammeHtml(42)).toBe(false);
  });

  test("getProgrammeHtml() retourne null sans Cache API", async () => {
    const r = await getProgrammeHtml();
    expect(r).toBe(null);
  });

  test("clearProgrammeCache() ne throw pas même sans SW", async () => {
    await expect(clearProgrammeCache()).resolves.toBeUndefined();
  });

  test("setProgrammeHtml() poste au SW si controller présent", async () => {
    const posted = [];
    const origNav = global.navigator;
    // Mock minimal de navigator.serviceWorker.controller
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        ...origNav,
        serviceWorker: {
          controller: { postMessage: (msg) => { posted.push(msg); } },
        },
      },
    });
    const r = await setProgrammeHtml("<html>X</html>");
    expect(r).toBe(true);
    expect(posted).toHaveLength(1);
    expect(posted[0]).toEqual({ type: "CACHE_PROGRAMME", html: "<html>X</html>" });
    // restore
    Object.defineProperty(global, "navigator", { configurable: true, value: origNav });
  });
});
