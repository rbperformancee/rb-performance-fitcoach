import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// /candidature/profil — Level 2 du funnel candidature.
// Après que l'athlète a posté sa candidature courte (email + nom + tel +
// âge + objectif + 3 slots + budget), on lui demande ici les détails
// approfondis pour rendre l'appel utile.
//
// On UPDATE la row coaching_applications existante (lookup par email),
// pas d'insert. Si l'email ne match pas une row → on insert quand même
// avec les champs partiels (Rayan triera).

const GREEN = "#02D1BA";
const BG = "#050505";

const FIELDS = [
  { key: "poids",                 label: "Poids actuel (kg)",          type: "number",   placeholder: "75" },
  { key: "taille",                label: "Taille (cm)",                type: "number",   placeholder: "180" },
  { key: "metier",                label: "Métier",                     type: "text",     placeholder: "Comptable, étudiant, etc." },
  { key: "passe_sportif",         label: "Passé sportif",              type: "textarea", placeholder: "Sports pratiqués, niveau, années" },
  { key: "sommeil",               label: "Heures de sommeil par nuit", type: "text",     placeholder: "7h" },
  { key: "repas",                 label: "Repas par jour",             type: "text",     placeholder: "3" },
  { key: "jours_entrainement",    label: "Jours d'entraînement / semaine", type: "text", placeholder: "4" },
  { key: "heures_seance",         label: "Durée moyenne d'une séance", type: "text",     placeholder: "1h" },
  { key: "diet_actuelle",         label: "Diète actuelle",             type: "textarea", placeholder: "Ce que tu manges en gros sur une journée" },
  { key: "points_faibles",        label: "Points faibles physiques",   type: "textarea", placeholder: "Bras, épaules, sèche, etc." },
  { key: "vision_physique",       label: "Vision physique cible",      type: "textarea", placeholder: "Athlète, esthète, performance" },
  { key: "objectifs_3mois",       label: "Objectifs à 3 mois",         type: "textarea", placeholder: "Ce que tu veux avoir atteint" },
  { key: "freins",                label: "Tes freins principaux",      type: "textarea", placeholder: "Ce qui t'empêche d'avancer aujourd'hui" },
  { key: "sacrifices",            label: "Ce que tu es prêt à sacrifier", type: "textarea", placeholder: "Sorties, junk food, temps libre, etc." },
  { key: "motivation_principale", label: "Ton vrai pourquoi",          type: "textarea", placeholder: "Pour quoi tu fais ça réellement ?" },
  { key: "risques_abandon",       label: "Ce qui te ferait décrocher", type: "textarea", placeholder: "Sois honnête, c'est utile" },
];

export default function CandidatureLevel2() {
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill email depuis query param (lien dans email de confirmation)
  // ou depuis localStorage (form draft de la candidature courte).
  useEffect(() => {
    try {
      const qEmail = new URLSearchParams(window.location.search).get("email");
      const draftRaw = localStorage.getItem("rb_application_draft");
      const draft = draftRaw ? JSON.parse(draftRaw)?.form : null;
      const e = qEmail || draft?.email || "";
      if (e) {
        setEmail(e);
        setEmailLocked(!!qEmail);
      }
    } catch {}
  }, []);

  const submit = async () => {
    if (saving) return;
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email invalide.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Lookup row par email (case-insensitive)
      const { data: existing } = await supabase
        .from("coaching_applications")
        .select("id")
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Nettoie les champs numériques
      const cleanNum = (v) => {
        if (v === null || v === undefined || v === "") return null;
        const s = String(v).trim().replace(",", ".").replace(/[^\d.\-]/g, "");
        return s === "" ? null : s;
      };
      const payload = {
        ...form,
        poids: cleanNum(form.poids),
        taille: cleanNum(form.taille),
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("coaching_applications")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Pas de candidature initiale trouvée — insert standalone.
        const { error } = await supabase
          .from("coaching_applications")
          .insert({ email, ...payload, source: "l2_standalone" });
        if (error) throw error;
      }
      setDone(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e?.message || "Erreur — réessaie ou contacte-moi.");
      setSaving(false);
    }
  };

  if (done) {
    return (
      <main style={{ minHeight: "100dvh", background: BG, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system,Inter,sans-serif" }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${GREEN}, #0891b2)`, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#000" }}>✓</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-1px", marginBottom: 14 }}>Profil complété.</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
            Merci. Je lis tout avant notre appel — comme ça on attaque direct.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: BG, color: "#fff", padding: "44px 24px 100px", fontFamily: "-apple-system,Inter,sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", marginBottom: 14, fontWeight: 700 }}>Profil approfondi</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 16 }}>
          Pour qu'on<br/>
          <span style={{ color: GREEN }}>attaque direct.</span>
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 28, maxWidth: 420 }}>
          5 min de questions plus précises. Tout ce que tu remplis ici, c'est du temps gagné en appel pour parler du fond.
        </p>

        <Field label="Email (pour relier à ta candidature)" value={email} onChange={setEmail} type="email" placeholder="ton@email.com" disabled={emailLocked} />

        {FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            type={f.type}
            value={form[f.key] || ""}
            onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
          />
        ))}

        {error && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, fontSize: 12, color: "#ff9090" }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={saving || !email}
          style={{
            width: "100%", padding: 17, marginTop: 28,
            background: saving || !email ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${GREEN}, #0891b2)`,
            color: saving || !email ? "rgba(255,255,255,0.25)" : "#000",
            border: "none", borderRadius: 16,
            fontSize: 14, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase",
            cursor: saving || !email ? "not-allowed" : "pointer",
            fontFamily: "-apple-system,Inter,sans-serif",
            boxShadow: saving || !email ? "none" : `0 8px 32px rgba(2,209,186,0.25)`,
          }}
        >
          {saving ? "Envoi…" : "Envoyer mon profil →"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, disabled }) {
  const isTextarea = type === "textarea";
  const Cmp = isTextarea ? "textarea" : "input";
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.3px", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>
      <Cmp
        type={isTextarea ? undefined : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={isTextarea ? 3 : undefined}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          color: "#fff",
          fontSize: 14,
          fontFamily: "-apple-system,Inter,sans-serif",
          outline: "none",
          resize: isTextarea ? "vertical" : "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
