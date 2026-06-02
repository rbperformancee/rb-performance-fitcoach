/**
 * Test contrat _apns.js — vérifie le comportement no-op quand les env vars
 * APNs ne sont pas configurées. C'est la garde-fou anti-régression : tant
 * qu'on n'a pas de compte Apple Developer, le module doit dégrader
 * silencieusement sans throw, et l'endpoint send-push-apns doit renvoyer
 * 503 attendu.
 *
 * Ces tests tournent dans Jest (pas en prod). On nettoie les env vars
 * APNs avant chaque test pour partir d'un état connu.
 */

const apns = require("../../api/_apns");

describe("api/_apns — contrat no-op sans config", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    delete process.env.APNS_AUTH_KEY;
    delete process.env.APNS_BUNDLE_ID;
    delete process.env.APNS_USE_SANDBOX;
    apns._resetCache();
  });

  afterAll(() => {
    process.env = ORIG_ENV;
    apns._resetCache();
  });

  test("isApnsConfigured() === false par défaut", () => {
    expect(apns.isApnsConfigured()).toBe(false);
  });

  test("isApnsConfigured() === true quand les 3 env vars sont set", () => {
    process.env.APNS_KEY_ID = "ABCDEF1234";
    process.env.APNS_TEAM_ID = "TEAM123456";
    process.env.APNS_AUTH_KEY = "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----";
    expect(apns.isApnsConfigured()).toBe(true);
  });

  test("sendApnsNotification sans config retourne APNS_NOT_CONFIGURED, ne throw pas", async () => {
    const r = await apns.sendApnsNotification("a".repeat(64), { title: "t", body: "b" });
    expect(r.ok).toBe(false);
    expect(r.dead).toBe(false);
    expect(r.error).toBe("APNS_NOT_CONFIGURED");
  });

  test("sendApnsNotification rejette les tokens invalides sans appel réseau", async () => {
    process.env.APNS_KEY_ID = "ABCDEF1234";
    process.env.APNS_TEAM_ID = "TEAM123456";
    process.env.APNS_AUTH_KEY = "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----";
    const r = await apns.sendApnsNotification("short", { title: "t", body: "b" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("INVALID_TOKEN");
  });

  test("getApnsJwt() throw explicite si env manquante (ne masque pas le bug)", () => {
    expect(() => apns.getApnsJwt()).toThrow(/APNS_KEY_ID/);
  });

  test("getApnsJwt() signe correctement avec une clé EC P-256 valide", () => {
    // Génère une clé P-256 de test pour valider qu'on produit un JWT
    // structurellement correct (3 segments base64url séparés par des '.').
    const crypto = require("crypto");
    const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ format: "pem", type: "pkcs8" });

    process.env.APNS_KEY_ID = "TESTKEY123";
    process.env.APNS_TEAM_ID = "TESTTEAM12";
    process.env.APNS_AUTH_KEY = pem;

    const jwt = apns.getApnsJwt();
    expect(typeof jwt).toBe("string");
    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);
    // Header décodé doit avoir alg=ES256 et kid=TESTKEY123
    const header = JSON.parse(Buffer.from(parts[0], "base64").toString("utf8"));
    expect(header.alg).toBe("ES256");
    expect(header.kid).toBe("TESTKEY123");
    // Payload décodé doit avoir iss=TESTTEAM12 et un iat numérique
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    expect(payload.iss).toBe("TESTTEAM12");
    expect(typeof payload.iat).toBe("number");
  });

  test("getApnsJwt() cache le JWT (ne re-signe pas dans la fenêtre 50 min)", () => {
    const crypto = require("crypto");
    const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    process.env.APNS_KEY_ID = "TESTKEY123";
    process.env.APNS_TEAM_ID = "TESTTEAM12";
    process.env.APNS_AUTH_KEY = privateKey.export({ format: "pem", type: "pkcs8" });
    const j1 = apns.getApnsJwt();
    const j2 = apns.getApnsJwt();
    expect(j1).toBe(j2);
  });
});
