import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Spinner from "./Spinner";
import haptic from "../lib/haptic";

// ========== CHARTE RB PERFORM ==========
const GREEN = "#02d1ba";
const BG_BLACK = "#050505";

// ========== COMPOSANTS UI PREMIUM ==========

// Input premium — fontSize 16 obligatoire pour empecher l'auto-zoom iOS Safari
const Input = ({ label, placeholder, type = "text", value, onChange, textarea = false, half = false, autoFocus = false }) => (
  <div style={{ marginBottom: 18, width: half ? "calc(50% - 8px)" : "100%" }}>
    <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600 }}>
      {label}
    </div>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          color: "#fff",
          fontFamily: "-apple-system,Inter,sans-serif",
          fontSize: 16, // 16 minimum pour iOS no-zoom
          fontWeight: 400,
          lineHeight: 1.5,
          padding: "14px 16px",
          outline: "none",
          resize: "vertical",
          minHeight: 90,
          boxSizing: "border-box",
          transition: "border-color 0.2s, background 0.2s",
          WebkitAppearance: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(2,209,186,0.4)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={type === "number" ? "decimal" : undefined}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          color: "#fff",
          fontFamily: "-apple-system,Inter,sans-serif",
          fontSize: 16, // 16 minimum pour iOS no-zoom
          fontWeight: 400,
          padding: "14px 16px",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s, background 0.2s",
          WebkitAppearance: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(2,209,186,0.4)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
      />
    )}
  </div>
);

// Scale 1-10 — pills rondes premium au lieu des cases carrees
const Scale = ({ label, value, onChange }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12, fontWeight: 600 }}>
      {label}
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
        const active = value >= n;
        const isCurrent = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              flex: 1,
              height: 42,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: active ? GREEN : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? GREEN : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12,
              color: active ? "#000" : "rgba(255,255,255,0.3)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.18s ease",
              boxShadow: isCurrent ? `0 0 20px rgba(2,209,186,0.4)` : "none",
              transform: isCurrent ? "scale(1.04)" : "scale(1)",
              WebkitTapHighlightColor: "transparent",
              WebkitAppearance: "none",
              fontFamily: "-apple-system,Inter,sans-serif",
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  </div>
);

// Barre de progression premium
const StepBar = ({ step, total }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", fontWeight: 600 }}>
        Etape {step} <span style={{ color: "rgba(255,255,255,0.2)" }}>/ {total}</span>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.5px" }}>
        {Math.round((step / total) * 100)}%
      </div>
    </div>
    <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${(step / total) * 100}%`,
          background: `linear-gradient(90deg, ${GREEN}, #0891b2)`,
          borderRadius: 2,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: `0 0 12px rgba(2,209,186,0.4)`,
        }}
      />
    </div>
  </div>
);

// ========== COMPOSANT PRINCIPAL ==========

export default function OnboardingFlow({ client, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlot, setBookedSlot] = useState(null);

  const [form, setForm] = useState({
    nom_prenom: client?.full_name || "",
    telephone: "",
    age: "", poids: "", taille: "", passe_sportif: "",
    metier: "", sommeil: "", pas_jour: "", allergies: "", repas: "", jours_entrainement: "", heures_seance: "", diet_actuelle: "",
    points_faibles: "", objectifs_6semaines: "", objectifs_3mois: "", objectifs_6mois: "",
    motivation_score: 0, freins: "", sacrifices: "", vision_physique: "",
    one_rm_bench: "", one_rm_squat: "", one_rm_traction: "",
    motivation_principale: "", risques_abandon: "", autres_infos: "",
  });

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    if (step === 6) fetchSlots();
  }, [step]);

  const fetchSlots = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("coach_slots")
      .select("*")
      .eq("is_available", true)
      .gte("date", today)
      .order("date")
      .order("heure")
      .limit(20);
    setSlots(data || []);
  };

  const saveForm = async () => {
    setSaving(true);
    if (client?.id) {
      await supabase
        .from("onboarding_forms")
        .upsert({ client_id: client.id, ...form, is_complete: true, submitted_at: new Date().toISOString() }, { onConflict: "client_id" });
    }
    setSaving(false);
  };

  const bookSlot = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    if (client?.id) {
      await supabase.from("bookings").insert({ client_id: client.id, slot_id: selectedSlot.id });
    }
    await supabase.from("coach_slots").update({ is_available: false }).eq("id", selectedSlot.id);
    setBookedSlot(selectedSlot);
    setSaving(false);
    setStep(7);
  };

  const nextStep = async () => {
    haptic.selection();
    if (step === 5) await saveForm();
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  // ========== STYLES PARTAGES ==========

  const S = {
    wrap: {
      minHeight: "100vh",
      background: BG_BLACK,
      fontFamily: "-apple-system,Inter,sans-serif",
      color: "#fff",
      padding: "0 0 100px",
      WebkitTapHighlightColor: "transparent",
    },
    inner: {
      maxWidth: 480,
      margin: "0 auto",
      padding: "44px 24px 0",
      animation: "stepFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
    },
    eyebrow: {
      fontSize: 10,
      letterSpacing: "4px",
      textTransform: "uppercase",
      color: "rgba(2,209,186,0.55)",
      marginBottom: 10,
      fontWeight: 700,
    },
    h1: {
      fontSize: 44,
      fontWeight: 900,
      letterSpacing: "-2px",
      lineHeight: 0.92,
      color: "#fff",
      marginBottom: 28,
    },
    row: { display: "flex", gap: 16, flexWrap: "wrap" },
    btn: (active = true) => ({
      width: "100%",
      padding: 17,
      background: active ? `linear-gradient(135deg, ${GREEN}, #0891b2)` : "rgba(255,255,255,0.04)",
      border: "none",
      borderRadius: 16,
      color: active ? "#000" : "rgba(255,255,255,0.25)",
      fontSize: 14,
      fontWeight: 800,
      cursor: active ? "pointer" : "not-allowed",
      fontFamily: "-apple-system,Inter,sans-serif",
      marginTop: 28,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      boxShadow: active ? `0 8px 32px rgba(2,209,186,0.25)` : "none",
      transition: "transform 0.15s ease, box-shadow 0.2s ease",
      WebkitTapHighlightColor: "transparent",
      WebkitAppearance: "none",
    }),
    back: {
      background: "transparent",
      border: "none",
      color: "rgba(255,255,255,0.3)",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "-apple-system,Inter,sans-serif",
      marginTop: 14,
      display: "block",
      textAlign: "center",
      width: "100%",
      letterSpacing: "0.5px",
      WebkitTapHighlightColor: "transparent",
      WebkitAppearance: "none",
      padding: 6,
    },
  };

  // Background ambient — radial vert subtil + grille discrete
  const BG = (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(2,209,186,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(2,209,186,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, #000 30%, transparent 80%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          top: -250,
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(2,209,186,0.12), transparent 65%)",
          borderRadius: "50%",
          filter: "blur(90px)",
        }}
      />
    </div>
  );

  // Animations CSS globales injectees une seule fois
  const GLOBAL_STYLES = (
    <style>{`
      @keyframes stepFadeIn {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes checkIn {
        0% { opacity: 0; transform: scale(0.5); }
        70% { transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes tealPulse {
        0%, 100% { color: ${GREEN}; }
        50% { color: #5ee8d4; text-shadow: 0 0 30px rgba(2,209,186,0.6); }
      }
      input::placeholder, textarea::placeholder {
        color: rgba(255,255,255,0.2);
      }
      /* Hide spinner buttons on number inputs */
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type=number] { -moz-appearance: textfield; }
      /* No tap zoom on iOS Safari for any input */
      input, textarea, select, button { -webkit-tap-highlight-color: transparent; }
    `}</style>
  );

  // ========== ETAPES ==========

  // ── ETAPE 1 — Profil ────────────────────────────────────────
  if (step === 1)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step1" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={1} total={6} />
          <div style={S.eyebrow}>01 · Identite</div>
          <div style={S.h1}>
            Ton<br />
            <span style={{ color: GREEN }}>Profil.</span>
          </div>
          <Input label="Nom et prenom" placeholder="Ton nom complet" value={form.nom_prenom} onChange={set("nom_prenom")} />
          <div style={S.row}>
            <Input label="Age" placeholder="ans" type="number" value={form.age} onChange={set("age")} half />
            <Input label="Poids" placeholder="kg" type="number" value={form.poids} onChange={set("poids")} half />
          </div>
          <Input label="Taille" placeholder="cm" type="number" value={form.taille} onChange={set("taille")} />
          <Input label="Telephone" placeholder="+33 6 xx xx xx xx" type="tel" value={form.telephone} onChange={set("telephone")} />
          <Input label="Passe sportif" placeholder="Sports pratiques, niveau, experience..." value={form.passe_sportif} onChange={set("passe_sportif")} textarea />
          <button style={S.btn(!!form.nom_prenom)} onClick={nextStep}>Continuer</button>
        </div>
      </div>
    );

  // ── ETAPE 2 — Mode de vie ───────────────────────────────────
  if (step === 2)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step2" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={2} total={6} />
          <div style={S.eyebrow}>02 · Quotidien</div>
          <div style={S.h1}>
            Ton mode<br />
            <span style={{ color: GREEN }}>de vie.</span>
          </div>
          <Input label="Metier ou etudes" placeholder="Ton activite professionnelle" value={form.metier} onChange={set("metier")} />
          <div style={S.row}>
            <Input label="Sommeil" placeholder="h / nuit" value={form.sommeil} onChange={set("sommeil")} half />
            <Input label="Pas / jour" placeholder="~ pas" value={form.pas_jour} onChange={set("pas_jour")} half />
          </div>
          <Input label="Allergies / restrictions" placeholder="Intolerances, allergies, preferences..." value={form.allergies} onChange={set("allergies")} textarea />
          <Input label="Repas actuels et flexibilite" placeholder="Combien de repas par jour ? Peux-tu les adapter ?" value={form.repas} onChange={set("repas")} textarea />
          <div style={S.row}>
            <Input label="Jours d'entrainement" placeholder="j / semaine" value={form.jours_entrainement} onChange={set("jours_entrainement")} half />
            <Input label="Duree par seance" placeholder="h / seance" value={form.heures_seance} onChange={set("heures_seance")} half />
          </div>
          <Input label="Diet actuelle" placeholder="Comment tu manges en ce moment ?" value={form.diet_actuelle} onChange={set("diet_actuelle")} textarea />
          <button style={S.btn()} onClick={nextStep}>Continuer</button>
          <button style={S.back} onClick={() => setStep(1)}>← Retour</button>
        </div>
      </div>
    );

  // ── ETAPE 3 — Objectifs ─────────────────────────────────────
  if (step === 3)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step3" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={3} total={6} />
          <div style={S.eyebrow}>03 · Vision</div>
          <div style={S.h1}>
            Objectifs &<br />
            <span style={{ color: GREEN }}>points faibles.</span>
          </div>
          <Input label="Points faibles a ameliorer" placeholder="Quelles zones souhaites-tu ameliorer en priorite ?" value={form.points_faibles} onChange={set("points_faibles")} textarea />
          <Input label="Objectifs a 6 semaines" placeholder="Ou veux-tu etre dans 6 semaines ?" value={form.objectifs_6semaines} onChange={set("objectifs_6semaines")} textarea />
          <Input label="Objectifs a 3 mois" placeholder="Ou veux-tu etre dans 3 mois ?" value={form.objectifs_3mois} onChange={set("objectifs_3mois")} textarea />
          <Input label="Objectifs a 6 mois" placeholder="Ou veux-tu etre dans 6 mois ?" value={form.objectifs_6mois} onChange={set("objectifs_6mois")} textarea />
          <button style={S.btn()} onClick={nextStep}>Continuer</button>
          <button style={S.back} onClick={() => setStep(2)}>← Retour</button>
        </div>
      </div>
    );

  // ── ETAPE 4 — Mindset ───────────────────────────────────────
  if (step === 4)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step4" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={4} total={6} />
          <div style={S.eyebrow}>04 · Mental</div>
          <div style={S.h1}>
            Ton<br />
            <span style={{ color: GREEN }}>mindset.</span>
          </div>
          <Scale label="Niveau de motivation aujourd'hui (1 → 10)" value={form.motivation_score} onChange={set("motivation_score")} />
          <Input label="Qu'est-ce qui t'empeche de tenir sur la duree ?" placeholder="Sois honnete avec toi-meme..." value={form.freins} onChange={set("freins")} textarea />
          <Input label="Qu'es-tu pret(e) a mettre de cote ?" placeholder="Quels sacrifices es-tu pret(e) a faire ?" value={form.sacrifices} onChange={set("sacrifices")} textarea />
          <Input label="A quoi ressemble le physique que tu veux avoir ?" placeholder="Decris ta vision, mentionne des references..." value={form.vision_physique} onChange={set("vision_physique")} textarea />
          <button style={S.btn()} onClick={nextStep}>Continuer</button>
          <button style={S.back} onClick={() => setStep(3)}>← Retour</button>
        </div>
      </div>
    );

  // ── ETAPE 5 — Performance ───────────────────────────────────
  if (step === 5)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step5" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={5} total={6} />
          <div style={S.eyebrow}>05 · Performance</div>
          <div style={S.h1}>
            Performance &<br />
            <span style={{ color: GREEN }}>autres.</span>
          </div>

          {/* Carte performance actuelle */}
          <div
            style={{
              background: "rgba(2,209,186,0.04)",
              border: "1px solid rgba(2,209,186,0.18)",
              borderRadius: 18,
              padding: "20px 18px 4px",
              marginBottom: 22,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 14, fontWeight: 700 }}>
              Performance actuelle
            </div>
            <div style={S.row}>
              <Input label="1RM Developpe couche" placeholder="kg" type="number" value={form.one_rm_bench} onChange={set("one_rm_bench")} half />
              <Input label="1RM Back squat" placeholder="kg" type="number" value={form.one_rm_squat} onChange={set("one_rm_squat")} half />
            </div>
            <Input label="1RM Traction / max reps" placeholder="kg / reps" value={form.one_rm_traction} onChange={set("one_rm_traction")} />
          </div>

          <Input label="Motivation principale" placeholder="Qu'est-ce qui te donne envie d'etre suivi(e) ?" value={form.motivation_principale} onChange={set("motivation_principale")} textarea />
          <Input label="Risques d'abandon" placeholder="Qu'est-ce qui pourrait faire que tu abandonnes ?" value={form.risques_abandon} onChange={set("risques_abandon")} textarea />
          <Input label="Autres informations" placeholder="Tout ce que tu juges utile de mentionner..." value={form.autres_infos} onChange={set("autres_infos")} textarea />
          <button style={S.btn()} onClick={nextStep} disabled={saving}>
            {saving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={18} color="#000" />Enregistrement</span>) : "Reserver mon appel"}
          </button>
          <button style={S.back} onClick={() => setStep(4)}>← Retour</button>
        </div>
      </div>
    );

  // ── ETAPE 6 — Calendrier ────────────────────────────────────
  if (step === 6)
    return (
      <div style={S.wrap}>
        {GLOBAL_STYLES}
        {BG}
        <div key="step6" style={{ ...S.inner, position: "relative", zIndex: 1 }}>
          <StepBar step={6} total={6} />
          <div style={S.eyebrow}>06 · Appel decouverte</div>
          <div style={S.h1}>
            Reserve<br />
            <span style={{ color: GREEN }}>ton appel.</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 28, maxWidth: 400 }}>
            Choisis un creneau pour ton appel de demarrage avec ton coach. 30 minutes pour construire ton programme sur mesure.
          </div>

          {slots.length === 0 ? (
            <div
              style={{
                padding: 28,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 18,
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Aucun creneau disponible pour le moment.
              <br />
              <span style={{ color: GREEN, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px" }}>
                Ton coach va te contacter directement.
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slots.map((slot) => {
                const date = new Date(slot.date + "T12:00:00");
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: "16px 20px",
                      background: isSelected ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.025)",
                      border: `1.5px solid ${isSelected ? GREEN : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 16,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s ease",
                      WebkitTapHighlightColor: "transparent",
                      WebkitAppearance: "none",
                      fontFamily: "-apple-system,Inter,sans-serif",
                      textAlign: "left",
                      width: "100%",
                      boxShadow: isSelected ? "0 4px 24px rgba(2,209,186,0.15)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? GREEN : "#fff", marginBottom: 3, textTransform: "capitalize" }}>
                        {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{slot.heure}</div>
                    </div>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: `2px solid ${isSelected ? GREEN : "rgba(255,255,255,0.15)"}`,
                        background: isSelected ? GREEN : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        color: "#000",
                        fontWeight: 800,
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            style={S.btn(!!selectedSlot || slots.length === 0)}
            onClick={slots.length === 0 ? () => setStep(7) : bookSlot}
            disabled={saving}
          >
            {saving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={18} color="#000" />Reservation</span>) : slots.length === 0 ? "Continuer" : "Confirmer ce creneau"}
          </button>
          <button style={S.back} onClick={() => setStep(5)}>← Retour</button>
        </div>
      </div>
    );

  // ── ETAPE 7 — Confirmation ──────────────────────────────────
  return (
    <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {GLOBAL_STYLES}
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1, textAlign: "center", padding: "44px 24px" }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GREEN}, #0891b2)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 32px",
            animation: "checkIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            fontSize: 36,
            color: "#000",
            boxShadow: `0 12px 48px rgba(2,209,186,0.4)`,
          }}
        >
          ✓
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "5px",
            textTransform: "uppercase",
            color: "rgba(2,209,186,0.6)",
            marginBottom: 16,
            fontWeight: 700,
            animation: "fadeUp 0.6s ease 0.2s both",
          }}
        >
          Bienvenue dans la team
        </div>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 0.9,
            marginBottom: 24,
            animation: "fadeUp 0.6s ease 0.3s both",
          }}
        >
          Tu es<br />
          <span style={{ animation: "tealPulse 3s ease-in-out infinite" }}>pret(e).</span>
        </h1>
        {bookedSlot && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(2,209,186,0.08)",
              border: "1px solid rgba(2,209,186,0.25)",
              borderRadius: 100,
              padding: "10px 22px",
              fontSize: 12,
              color: GREEN,
              fontWeight: 600,
              marginBottom: 24,
              animation: "fadeUp 0.6s ease 0.4s both",
              letterSpacing: "0.3px",
            }}
          >
            📞 Appel reserve · {new Date(bookedSlot.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} a {bookedSlot.heure}
          </div>
        )}
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.8,
            marginBottom: 36,
            animation: "fadeUp 0.6s ease 0.5s both",
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Ton questionnaire a ete envoye a ton coach.<br />
          Il prepare ton programme sur mesure.
        </p>
        <button
          style={{ ...S.btn(), animation: "fadeUp 0.6s ease 0.6s both" }}
          onClick={async () => {
            if (client?.id) {
              await supabase.from("clients").update({ onboarding_done: true }).eq("id", client.id);
            } else {
              const { data } = await supabase.from("clients").select("id").eq("email", client?.email || "").single();
              if (data?.id) await supabase.from("clients").update({ onboarding_done: true }).eq("id", data.id);
            }
            haptic.success();
            onComplete();
          }}
        >
          Acceder a mon espace
        </button>
      </div>
    </div>
  );
}
