import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const GREEN = "#02d1ba";
const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

// ── Composant Input ──────────────────────────────────────────
const Input = ({ label, placeholder, type="text", value, onChange, textarea=false, half=false }) => (
  <div style={{ marginBottom: 20, width: half ? "calc(50% - 8px)" : "100%" }}>
    <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(2,209,186,0.7)", marginBottom: 8, fontWeight: 700 }}>{label}</div>
    {textarea ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={3} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `3px solid ${GREEN}`, borderRadius: "0 8px 8px 0", color: "#fff", fontFamily: "-apple-system,Inter,sans-serif", fontSize: 14, fontWeight: 300, padding: "12px 14px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: `3px solid ${GREEN}`, borderRadius: "0 8px 8px 0", color: "#fff", fontFamily: "-apple-system,Inter,sans-serif", fontSize: 14, fontWeight: 300, padding: "12px 14px", outline: "none", boxSizing: "border-box" }} />
    )}
  </div>
);

// ── Composant Scale ─────────────────────────────────────────
const Scale = ({ label, value, onChange }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(2,209,186,0.7)", marginBottom: 10, fontWeight: 700 }}>{label}</div>
    <div style={{ display: "flex", gap: 6 }}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <div key={n} onClick={() => onChange(n)} style={{ flex: 1, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: value >= n ? GREEN : "rgba(255,255,255,0.04)", border: `1px solid ${value >= n ? GREEN : "rgba(255,255,255,0.08)"}`, borderRadius: 6, color: value >= n ? "#000" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{n}</div>
      ))}
    </div>
  </div>
);

// ── Étape progress bar ───────────────────────────────────────
const StepBar = ({ step, total }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(2,209,186,0.5)" }}>Étape {step} / {total}</div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{Math.round((step/total)*100)}%</div>
    </div>
    <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
      <div style={{ height: "100%", width: `${(step/total)*100}%`, background: `linear-gradient(90deg,${GREEN},#0891b2)`, borderRadius: 1, transition: "width 0.5s ease" }} />
    </div>
  </div>
);

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

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (step === 6) fetchSlots();
  }, [step]);

  const fetchSlots = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("coach_slots").select("*").eq("is_available", true).gte("date", today).order("date").order("heure").limit(20);
    setSlots(data || []);
  };

  const saveForm = async () => {
    setSaving(true);
    if (client?.id) {
      await supabase.from("onboarding_forms").upsert({
        client_id: client.id, ...form, is_complete: true, submitted_at: new Date().toISOString()
      }, { onConflict: "client_id" });
    }
    setSaving(false);
  };

  const bookSlot = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    if (client?.id) { await supabase.from("bookings").insert({ client_id: client.id, slot_id: selectedSlot.id }); }
    await supabase.from("coach_slots").update({ is_available: false }).eq("id", selectedSlot.id);
    setBookedSlot(selectedSlot);
    setSaving(false);
    setStep(7);
  };

  const nextStep = async () => {
    if (step === 5) await saveForm();
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const S = {
    wrap: { minHeight: "100vh", background: "#000", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", padding: "0 0 80px" },
    inner: { maxWidth: 480, margin: "0 auto", padding: "40px 24px 0" },
    title: { fontSize: 9, letterSpacing: 5, textTransform: "uppercase", color: "rgba(2,209,186,0.5)", marginBottom: 8 },
    h1: { fontSize: 38, fontWeight: 900, letterSpacing: -2, lineHeight: 0.9, color: "#fff", marginBottom: 24 },
    row: { display: "flex", gap: 16, flexWrap: "wrap" },
    btn: (active=true) => ({ width: "100%", padding: 17, background: active ? `linear-gradient(135deg,${GREEN},#0891b2)` : "rgba(255,255,255,0.04)", border: "none", borderRadius: 14, color: active ? "#000" : "rgba(255,255,255,0.2)", fontSize: 14, fontWeight: 800, cursor: active ? "pointer" : "not-allowed", fontFamily: "-apple-system,Inter,sans-serif", marginTop: 24, letterSpacing: 0.3 }),
    back: { background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 13, cursor: "pointer", fontFamily: "-apple-system,Inter,sans-serif", marginTop: 16, display: "block", textAlign: "center", width: "100%" },
  };

  const BG = (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(2,209,186,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(2,209,186,0.03) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
      <div style={{ position: "absolute", width: 500, height: 500, top: -200, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle,rgba(2,209,186,0.1),transparent 65%)", borderRadius: "50%", filter: "blur(80px)" }} />
    </div>
  );

  // ── ÉTAPE 1 — Profil ────────────────────────────────────────
  if (step === 1) return (
    <div style={S.wrap}>
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1 }}>
        <StepBar step={1} total={6} />
        <div style={S.title}>01 · Identité</div>
        <div style={S.h1}>Ton<br /><span style={{ color: GREEN }}>Profil.</span></div>
        <Input label="Nom, Prénom" placeholder="Ton nom complet" value={form.nom_prenom} onChange={set("nom_prenom")} />
        <div style={S.row}>
          <Input label="Âge" placeholder="ans" type="number" value={form.age} onChange={set("age")} half />
          <Input label="Poids" placeholder="kg" value={form.poids} onChange={set("poids")} half />
        </div>
        <Input label="Taille" placeholder="cm" value={form.taille} onChange={set("taille")} />
        <Input label="Téléphone" placeholder="+33 6 xx xx xx xx" value={form.telephone} onChange={set("telephone")} />
        <Input label="Passé sportif" placeholder="Sports pratiqués, niveau, expérience..." value={form.passe_sportif} onChange={set("passe_sportif")} textarea />
        <button style={S.btn(!!form.nom_prenom)} onClick={nextStep}>Continuer →</button>
      </div>
    </div>
  );

  // ── ÉTAPE 2 — Mode de vie ───────────────────────────────────
  if (step === 2) return (
    <div style={S.wrap}>
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1 }}>
        <StepBar step={2} total={6} />
        <div style={S.title}>02 · Quotidien</div>
        <div style={S.h1}>Ton Mode<br /><span style={{ color: GREEN }}>de Vie.</span></div>
        <Input label="Métier ou études" placeholder="Ton activité professionnelle" value={form.metier} onChange={set("metier")} />
        <div style={S.row}>
          <Input label="Heures de sommeil" placeholder="h/nuit" value={form.sommeil} onChange={set("sommeil")} half />
          <Input label="Pas / jour" placeholder="~pas" value={form.pas_jour} onChange={set("pas_jour")} half />
        </div>
        <Input label="Allergies / restrictions alimentaires" placeholder="Intolérances, allergies, préférences..." value={form.allergies} onChange={set("allergies")} textarea />
        <Input label="Repas actuel & flexibilité" placeholder="Combien de repas par jour ? Peux-tu les adapter ?" value={form.repas} onChange={set("repas")} textarea />
        <div style={S.row}>
          <Input label="Jours d'entraînement" placeholder="j/semaine" value={form.jours_entrainement} onChange={set("jours_entrainement")} half />
          <Input label="Durée par séance" placeholder="h/séance" value={form.heures_seance} onChange={set("heures_seance")} half />
        </div>
        <Input label="Diet actuelle" placeholder="Comment tu manges en ce moment ?" value={form.diet_actuelle} onChange={set("diet_actuelle")} textarea />
        <button style={S.btn()} onClick={nextStep}>Continuer →</button>
        <button style={S.back} onClick={() => setStep(1)}>← Retour</button>
      </div>
    </div>
  );

  // ── ÉTAPE 3 — Objectifs ─────────────────────────────────────
  if (step === 3) return (
    <div style={S.wrap}>
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1 }}>
        <StepBar step={3} total={6} />
        <div style={S.title}>03 · Vision</div>
        <div style={S.h1}>Objectifs &<br /><span style={{ color: GREEN }}>Points Faibles.</span></div>
        <Input label="Points faibles à améliorer" placeholder="Quelles zones souhaites-tu améliorer en priorité ?" value={form.points_faibles} onChange={set("points_faibles")} textarea />
        <Input label="Objectifs à 6 semaines" placeholder="Où veux-tu être dans 6 semaines ?" value={form.objectifs_6semaines} onChange={set("objectifs_6semaines")} textarea />
        <Input label="Objectifs à 3 mois" placeholder="Où veux-tu être dans 3 mois ?" value={form.objectifs_3mois} onChange={set("objectifs_3mois")} textarea />
        <Input label="Objectifs à 6 mois" placeholder="Où veux-tu être dans 6 mois ?" value={form.objectifs_6mois} onChange={set("objectifs_6mois")} textarea />
        <button style={S.btn()} onClick={nextStep}>Continuer →</button>
        <button style={S.back} onClick={() => setStep(2)}>← Retour</button>
      </div>
    </div>
  );

  // ── ÉTAPE 4 — Mindset ───────────────────────────────────────
  if (step === 4) return (
    <div style={S.wrap}>
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1 }}>
        <StepBar step={4} total={6} />
        <div style={S.title}>04 · Mental</div>
        <div style={S.h1}>Ton<br /><span style={{ color: GREEN }}>Mindset.</span></div>
        <Scale label="Niveau de motivation aujourd'hui (1 → 10)" value={form.motivation_score} onChange={set("motivation_score")} />
        <Input label="Qu'est-ce qui t'empêche de tenir sur la durée ?" placeholder="Sois honnête avec toi-même..." value={form.freins} onChange={set("freins")} textarea />
        <Input label="Qu'es-tu prêt(e) à mettre de côté ?" placeholder="Quels sacrifices es-tu prêt(e) à faire ?" value={form.sacrifices} onChange={set("sacrifices")} textarea />
        <Input label="À quoi ressemble le physique que tu veux avoir ?" placeholder="Décris ta vision, mentionne des références..." value={form.vision_physique} onChange={set("vision_physique")} textarea />
        <button style={S.btn()} onClick={nextStep}>Continuer →</button>
        <button style={S.back} onClick={() => setStep(3)}>← Retour</button>
      </div>
    </div>
  );

  // ── ÉTAPE 5 — Performance ───────────────────────────────────
  if (step === 5) return (
    <div style={S.wrap}>
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1 }}>
        <StepBar step={5} total={6} />
        <div style={S.title}>05 · Performance</div>
        <div style={S.h1}>Motivation &<br /><span style={{ color: GREEN }}>Autres.</span></div>
        <div style={{ background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.12)", borderRadius: 16, padding: "20px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(2,209,186,0.5)", marginBottom: 14 }}>Performance actuelle</div>
          <div style={{ display: "flex", gap: 12 }}>
            <Input label="1RM Développé couché" placeholder="kg" value={form.one_rm_bench} onChange={set("one_rm_bench")} half />
            <Input label="1RM Back Squat" placeholder="kg" value={form.one_rm_squat} onChange={set("one_rm_squat")} half />
          </div>
          <Input label="1RM Traction / Max reps" placeholder="kg / reps" value={form.one_rm_traction} onChange={set("one_rm_traction")} />
        </div>
        <Input label="Motivation principale" placeholder="Qu'est-ce qui te donne envie d'être suivi(e) ?" value={form.motivation_principale} onChange={set("motivation_principale")} textarea />
        <Input label="Risques d'abandon" placeholder="Qu'est-ce qui pourrait faire que tu abandonnes ?" value={form.risques_abandon} onChange={set("risques_abandon")} textarea />
        <Input label="Autres informations" placeholder="Tout ce que tu juges utile de mentionner..." value={form.autres_infos} onChange={set("autres_infos")} textarea />
        <button style={S.btn()} onClick={nextStep}>{saving ? "Enregistrement..." : "Réserver mon appel →"}</button>
        <button style={S.back} onClick={() => setStep(4)}>← Retour</button>
      </div>
    </div>
  );

  // ── ÉTAPE 6 — Calendrier ────────────────────────────────────
  if (step === 6) return (
    <div style={S.wrap}>
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1 }}>
        <StepBar step={6} total={6} />
        <div style={S.title}>06 · Appel découverte</div>
        <div style={S.h1}>Réserve<br /><span style={{ color: GREEN }}>ton Appel.</span></div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: 28 }}>
          Choisis un créneau pour ton appel de démarrage avec Rayan. Cet appel de 30 minutes permettra de construire ton programme sur mesure.
        </div>

        {slots.length === 0 ? (
          <div style={{ padding: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Aucun créneau disponible pour le moment.<br />
            <span style={{ color: GREEN, fontSize: 11 }}>Rayan va te contacter directement.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {slots.map(slot => {
              const date = new Date(slot.date + "T12:00:00");
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <div key={slot.id} onClick={() => setSelectedSlot(slot)} style={{ padding: "16px 20px", background: isSelected ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.02)", border: `1.5px solid ${isSelected ? GREEN : "rgba(255,255,255,0.07)"}`, borderRadius: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? GREEN : "#fff" }}>
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{slot.heure}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${isSelected ? GREEN : "rgba(255,255,255,0.15)"}`, background: isSelected ? GREEN : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000" }}>
                    {isSelected ? "✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button style={S.btn(!!selectedSlot || slots.length === 0)} onClick={slots.length === 0 ? () => setStep(7) : bookSlot}>
          {saving ? "Réservation..." : slots.length === 0 ? "Continuer →" : "Confirmer ce créneau →"}
        </button>
        <button style={S.back} onClick={() => setStep(5)}>← Retour</button>
      </div>
    </div>
  );

  // ── ÉTAPE 7 — Confirmation ──────────────────────────────────
  return (
    <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {BG}
      <div style={{ ...S.inner, position: "relative", zIndex: 1, textAlign: "center" }}>
        <style>{`@keyframes checkIn{0%{opacity:0;transform:scale(0.5)}70%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes tealPulse{0%,100%{color:#02d1ba}50%{color:#5ee8d4;text-shadow:0 0 30px rgba(2,209,186,0.6)}}`}</style>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg,${GREEN},#0891b2)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", animation: "checkIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both", fontSize: 32 }}>✓</div>
        <div style={{ fontSize: 9, letterSpacing: 5, textTransform: "uppercase", color: "rgba(2,209,186,0.5)", marginBottom: 14, animation: "fadeUp 0.6s ease 0.2s both" }}>Bienvenue dans la Team</div>
        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, lineHeight: 0.9, marginBottom: 20, animation: "fadeUp 0.6s ease 0.3s both" }}>
          Tu es<br /><span style={{ animation: "tealPulse 3s ease-in-out infinite" }}>prêt(e).</span>
        </h1>
        {bookedSlot && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 100, padding: "8px 20px", fontSize: 12, color: GREEN, fontWeight: 600, marginBottom: 20, animation: "fadeUp 0.6s ease 0.4s both" }}>
            📞 Appel réservé · {new Date(bookedSlot.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à {bookedSlot.heure}
          </div>
        )}
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.8, marginBottom: 32, animation: "fadeUp 0.6s ease 0.5s both" }}>
          Ton questionnaire a été envoyé à Rayan.<br />
          Il prépare ton programme sur mesure.
        </p>
        <button style={{ ...S.btn(), animation: "fadeUp 0.6s ease 0.6s both" }} onClick={onComplete}>
          Accéder à mon espace →
        </button>
      </div>
    </div>
  );
}
