// Onboarding lite déclenché au premier login d'un client (typiquement un client
// high-ticket validé hors-app par Rayan). 3 steps + welcome :
//   1. Photo de profil (avatar)
//   2. Poids actuel (insert weight_logs)
//   3. Objectif principal (upsert onboarding_forms)
//   4. Welcome → onboarding_done = true
import React, { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import haptic from "../lib/haptic";

const G = "#02d1ba";

export default function ClientFirstLoginFlow({ client, user, onComplete }) {
  const [step, setStep] = useState(1);
  const [avatarUrl, setAvatarUrl] = useState(client?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [poids, setPoids] = useState("");
  const [objectif, setObjectif] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const clientId = client?.id;
  const firstName = (client?.full_name || user?.email || "").split(" ")[0] || "";

  const uploadAvatar = async (file) => {
    if (!file || !clientId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = "avatars/" + clientId + "." + ext;
      await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("clients").update({ avatar_url: publicUrl }).eq("id", clientId);
      setAvatarUrl(publicUrl);
      haptic.success();
    } catch (e) { console.error("avatar upload:", e); }
    setUploading(false);
  };

  const finish = async () => {
    if (!clientId) { onComplete?.(); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const w = parseFloat(poids);
      if (w && w > 20 && w < 250) {
        await supabase.from("weight_logs").upsert(
          { client_id: clientId, date: today, weight: w, note: "Poids initial" },
          { onConflict: "client_id,date" }
        );
      }
      if (objectif.trim()) {
        await supabase.from("onboarding_forms").upsert({
          client_id: clientId,
          email: client?.email || user?.email,
          objectifs_6mois: objectif.trim(),
        }, { onConflict: "client_id" });
      }
      await supabase.from("clients").update({ onboarding_done: true }).eq("id", clientId);
      haptic.success();
      onComplete?.();
    } catch (e) { console.error("first-login finish:", e); }
    setSaving(false);
  };

  const next = () => { haptic.light(); setStep(s => s + 1); };
  const back = () => { haptic.light(); setStep(s => Math.max(1, s - 1)); };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", padding: "60px 24px 40px", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "-apple-system, Inter, sans-serif" }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{
            width: n === step ? 24 : 8, height: 4, borderRadius: 2,
            background: n <= step ? G : "rgba(255,255,255,0.08)",
            transition: "all 0.3s",
          }} />
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 440, animation: "fadeUp 0.5s ease both" }}>
        {step === 1 && (
          <>
            <div style={{ fontSize: 10, color: G, letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Étape 1 sur 3</div>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, marginBottom: 14, letterSpacing: "-1px" }}>
              Bienvenue{firstName ? ` ${firstName}` : ""}.<br />
              <span style={{ color: G }}>Ajoute ta photo.</span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 36 }}>
              Pour que je puisse mettre un visage sur ton suivi.
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
              <div onClick={() => fileRef.current?.click()} style={{ position: "relative", width: 180, height: 180, borderRadius: "50%", overflow: "hidden", cursor: "pointer", background: avatarUrl ? "#1a1a1a" : "rgba(2,209,186,0.06)", border: `2px solid ${avatarUrl ? "rgba(2,209,186,0.6)" : "rgba(2,209,186,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: avatarUrl ? `0 0 40px ${G}33` : "none" }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
                {uploading && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 26, height: 26, border: `2px solid ${G}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            </div>
            <button onClick={next} disabled={!avatarUrl || uploading} style={btnPrimary(!!avatarUrl && !uploading)}>
              {avatarUrl ? "Continuer" : "Choisir ma photo"}
            </button>
            <button onClick={next} style={btnSkip}>Plus tard</button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: 10, color: G, letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Étape 2 sur 3</div>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, marginBottom: 14, letterSpacing: "-1px" }}>
              Ton poids <span style={{ color: G }}>aujourd'hui</span>.
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 36 }}>
              Le point de départ de ton suivi. Tu pourras le mettre à jour à tout moment depuis ton dashboard.
            </div>
            <div style={{ position: "relative", marginBottom: 40 }}>
              <input
                type="number"
                inputMode="decimal"
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                placeholder="75"
                autoFocus
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid rgba(2,209,186,0.25)`, borderRadius: 14, color: "#fff", padding: "20px 60px 20px 24px", fontSize: 32, fontWeight: 700, outline: "none", textAlign: "center", letterSpacing: "-1px" }}
              />
              <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: 16, fontWeight: 600 }}>kg</div>
            </div>
            <button onClick={next} disabled={!poids} style={btnPrimary(!!poids)}>Continuer</button>
            <button onClick={back} style={btnSkip}>Retour</button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontSize: 10, color: G, letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Étape 3 sur 3</div>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, marginBottom: 14, letterSpacing: "-1px" }}>
              Ton <span style={{ color: G }}>objectif</span>.
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 36 }}>
              Pour qu'on garde le cap. Une phrase suffit.
            </div>
            <textarea
              value={objectif}
              onChange={(e) => setObjectif(e.target.value)}
              placeholder="Ex : prendre 5 kg de muscle d'ici 6 mois, redescendre à 75 kg, courir un 10 km en 45 min…"
              autoFocus
              rows={4}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid rgba(2,209,186,0.25)`, borderRadius: 14, color: "#fff", padding: "16px 18px", fontSize: 15, fontWeight: 500, outline: "none", lineHeight: 1.5, resize: "vertical", fontFamily: "-apple-system, Inter, sans-serif", marginBottom: 32 }}
            />
            <button onClick={next} disabled={!objectif.trim()} style={btnPrimary(!!objectif.trim())}>Continuer</button>
            <button onClick={back} style={btnSkip}>Retour</button>
          </>
        )}

        {step === 4 && (
          <>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 18 }}>⚡</div>
              <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, marginBottom: 14, letterSpacing: "-1px" }}>
                C'est parti.
              </div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 40, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                Tu es dans la place. Ton dashboard est prêt — programme, suivi, et moi en face de toi quand tu en as besoin.
              </div>
              <button onClick={finish} disabled={saving} style={btnPrimary(!saving)}>
                {saving ? "..." : "Accéder à mon espace"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const btnPrimary = (enabled) => ({
  width: "100%", padding: "17px", borderRadius: 14, border: "none",
  background: enabled ? G : "rgba(255,255,255,0.06)",
  color: enabled ? "#000" : "rgba(255,255,255,0.3)",
  fontSize: 14, fontWeight: 800, letterSpacing: "0.5px",
  textTransform: "uppercase", cursor: enabled ? "pointer" : "not-allowed",
  marginBottom: 12, transition: "all 0.15s",
  boxShadow: enabled ? `0 8px 24px ${G}33` : "none",
});

const btnSkip = {
  width: "100%", padding: "12px", borderRadius: 12, border: "none",
  background: "transparent", color: "rgba(255,255,255,0.35)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
};
