import React, { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import HelpMigrationGuide from "./HelpMigrationGuide";

const G = "#02d1ba";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const SPECIALITIES = [
  "Musculation", "Cardio", "CrossFit",
  "Sèche", "Force", "Performance",
  "Remise en forme", "Running",
  "Arts martiaux", "Nutrition",
];

const LEGAL_FORMS = [
  "Auto-entrepreneur",
  "EI",
  "EURL",
  "SASU",
  "SARL",
  "SAS",
  "Autre",
];

const TOTAL_STEPS = 7;

const slugify = (s) => (s || "")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 40);

const DEFAULT_PLANS = [
  { name: "3 mois",  duration_months: 3,  price_per_month: 150 },
  { name: "6 mois",  duration_months: 6,  price_per_month: 130 },
  { name: "12 mois", duration_months: 12, price_per_month: 100 },
];

export default function Onboarding({ coach, onComplete, preview = false }) {
  const t = useT();
  const [step, setStep] = useState(1);
  const initFirst = coach?.full_name?.split(" ")[0] || coach?.first_name || "";
  const initLast  = coach?.full_name?.split(" ").slice(1).join(" ") || coach?.last_name || "";

  // STEP 1 — Présentation
  const [firstName, setFirstName] = useState(initFirst);
  const [lastName,  setLastName]  = useState(initLast);
  const [specialties, setSpecialties] = useState(coach?.specialties || []);
  const [photoUrl, setPhotoUrl] = useState(coach?.public_photo_url || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);

  // STEP 2 — Infos pro
  const [siret, setSiret]     = useState(coach?.siret || "");
  const [phone, setPhone]     = useState(coach?.phone || "");
  const [legalForm, setLegalForm] = useState(coach?.legal_form || "");
  const [businessAddress, setBusinessAddress] = useState(coach?.business_address || "");

  // STEP 4 — Profil public
  const initSlug = coach?.public_slug || coach?.coach_slug || "";
  const [publicSlug, setPublicSlug] = useState(initSlug);
  const [publicBio, setPublicBio]   = useState(coach?.public_bio || "");
  const [publicCity, setPublicCity] = useState(coach?.public_city || coach?.city || "");
  const [ctaUrl, setCtaUrl]         = useState(coach?.public_cta_url || "");
  const [showRbBadge, setShowRbBadge] = useState(coach?.show_rb_badge !== false);
  const [publicEnabled, setPublicEnabled] = useState(coach?.public_profile_enabled !== false);

  // STEP 3 — Tes offres
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const updatePlan = (idx, key, value) => {
    setPlans((prev) => prev.map((p, i) => i === idx ? { ...p, [key]: value } : p));
  };
  const togglePlan = (idx) => {
    setPlans((prev) => prev.map((p, i) => i === idx ? { ...p, _disabled: !p._disabled } : p));
  };

  // STEP 4 — Premier client
  const [clientEmail,  setClientEmail]  = useState("");
  const [clientPrenom, setClientPrenom] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [showMigrationHelp, setShowMigrationHelp] = useState(false);

  // STEP 3 — Push
  const { permission: pushPerm, requestPermission: requestPush } = usePushNotifications({ coachId: coach?.id });
  const [pushAttempted, setPushAttempted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  function toggleSpecialty(s) {
    haptic.selection();
    setSpecialties((arr) => arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]);
  }

  async function handlePhotoFile(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Format image attendu (JPG, PNG)."); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo trop lourde (max 5 Mo)."); return;
    }
    setError("");
    if (preview) {
      setPhotoUrl(URL.createObjectURL(file));
      return;
    }
    setPhotoUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `coach-${coach.id}/photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("coach-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("coach-logos").getPublicUrl(path);
      setPhotoUrl(`${data.publicUrl}?v=${Date.now()}`);
    } catch (err) {
      setError("Upload photo : " + (err.message || "erreur"));
    }
    setPhotoUploading(false);
  }

  async function saveIdentity() {
    setError("");
    if (!firstName.trim()) { setError("Ton prénom est requis."); return; }
    if (specialties.length === 0) { setError("Choisis au moins 1 spécialité."); return; }
    haptic.selection();
    setSaving(true);
    try {
      if (!preview) {
        const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
        const { error } = await supabase
          .from("coaches")
          .update({
            full_name,
            first_name: firstName.trim(),
            last_name:  lastName.trim(),
            specialties,
            public_photo_url: photoUrl || null,
          })
          .eq("id", coach.id);
        if (error) throw error;
      }
      setStep(2);
    } catch (e) {
      setError(e.message || "Erreur de sauvegarde");
    }
    setSaving(false);
  }

  async function saveBusiness() {
    setError("");
    // SIRET optionnel mais si présent doit faire 14 chiffres
    if (siret.trim() && !/^\d{14}$/.test(siret.replace(/\s/g, ""))) {
      setError("Le SIRET doit faire 14 chiffres."); return;
    }
    haptic.selection();
    setSaving(true);
    try {
      if (!preview) {
        const { error } = await supabase
          .from("coaches")
          .update({
            siret: siret.replace(/\s/g, "") || null,
            phone: phone.trim() || null,
            legal_form: legalForm || null,
            business_address: businessAddress.trim() || null,
          })
          .eq("id", coach.id);
        if (error) throw error;
      }
      setStep(3);
    } catch (e) {
      setError(e.message || "Erreur de sauvegarde");
    }
    setSaving(false);
  }

  async function savePlans() {
    setError("");
    const active = plans.filter((p) => !p._disabled);
    if (active.length === 0) { setError("Garde au moins une offre active."); return; }
    for (const p of active) {
      if (!p.name?.trim()) { setError("Chaque offre doit avoir un nom."); return; }
      if (!p.price_per_month || p.price_per_month < 1) { setError("Prix mensuel requis (≥ 1€)."); return; }
      if (!p.duration_months || p.duration_months < 1) { setError("Durée requise (≥ 1 mois)."); return; }
    }
    haptic.selection();
    setSaving(true);
    try {
      if (!preview) {
        // Désactive tous les plans existants puis insère les nouveaux
        await supabase.from("coach_plans").update({ is_active: false }).eq("coach_id", coach.id);
        const rows = active.map((p, i) => ({
          coach_id: coach.id,
          name: p.name.trim(),
          price_per_month: Number(p.price_per_month),
          duration_months: Number(p.duration_months),
          billing_type: "monthly",
          is_active: true,
          display_order: i,
        }));
        const { error } = await supabase.from("coach_plans").insert(rows);
        if (error) throw error;
      }
      setStep(4);
    } catch (e) {
      setError(e.message || "Erreur de sauvegarde");
    }
    setSaving(false);
  }

  async function savePublicProfile() {
    setError("");
    const slug = slugify(publicSlug || `${firstName}-${lastName}`);
    if (publicEnabled && slug.length < 3) {
      setError("Le slug public doit faire au moins 3 caractères.");
      return;
    }
    haptic.selection();
    setSaving(true);
    try {
      if (!preview) {
        const { error } = await supabase
          .from("coaches")
          .update({
            public_slug: slug || null,
            public_bio: publicBio.trim() || null,
            public_city: publicCity.trim() || null,
            public_cta_url: ctaUrl.trim() || null,
            show_rb_badge: showRbBadge,
            public_profile_enabled: publicEnabled,
          })
          .eq("id", coach.id);
        if (error) throw error;
      }
      setStep(5);
    } catch (e) {
      setError(e.message || "Erreur de sauvegarde");
    }
    setSaving(false);
  }

  async function activatePush() {
    haptic.selection();
    if (pushPerm === "granted") { setStep(6); return; }
    setPushAttempted(true);
    try { await requestPush(); } catch {}
    setTimeout(() => setStep(6), 600);
  }

  function skipPush() { haptic.light(); setStep(6); }

  async function sendInvite() {
    const mail = clientEmail.trim().toLowerCase();
    setError("");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(mail)) {
      setError("Email invalide."); return;
    }
    haptic.selection();
    setInviteLoading(true);
    try {
      if (preview) {
        toast.success(fillTpl(t("onb.toast_invite_sent") || "Invitation envoyée à {email}", { email: mail }));
        setInviteSent(true);
        setTimeout(() => setStep(7), 400);
        setInviteLoading(false);
        return;
      }
      const { data: inv, error: insErr } = await supabase
        .from("invitations")
        .insert({
          coach_id: coach.id,
          email: mail,
          prenom: clientPrenom.trim() || null,
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (jwt) {
        try {
          await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({ invitation_id: inv.id }),
          });
        } catch (_) {}
      }

      toast.success(fillTpl(t("onb.toast_invite_sent") || "Invitation envoyée à {email}", { email: mail }));
      setInviteSent(true);
      setTimeout(() => setStep(7), 400);
    } catch (e) {
      setError(e.message || "Erreur envoi invitation");
    }
    setInviteLoading(false);
  }

  function skipInvite() { haptic.light(); setStep(7); }

  async function finishOnboarding() {
    haptic.success();
    setSaving(true);
    try {
      if (!preview) {
        const { error } = await supabase
          .from("coaches")
          .update({
            onboarding_completed_at: new Date().toISOString(),
            onboarding_step: "done",
          })
          .eq("id", coach.id);
        if (error) throw error;
      }
      if (onComplete) onComplete();
    } catch (e) {
      setError(e.message || "Erreur");
      setSaving(false);
    }
  }

  return (
    <div className="onb-root">
      <style>{`
        .onb-root {
          position: fixed; inset: 0;
          background: #0a0a0a;
          z-index: 9999;
          display: flex; flex-direction: column;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #fff;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .onb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 28px;
          flex-shrink: 0;
        }
        .onb-mark { display: inline-flex; align-items: center; opacity: .85; }
        .onb-counter {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .04em;
          color: rgba(255,255,255,.32);
          font-variant-numeric: tabular-nums;
        }
        .onb-counter strong { color: rgba(255,255,255,.7); font-weight: 600; }

        .onb-main {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          padding: 24px 28px 80px;
          overflow-y: auto;
        }
        .onb-card {
          width: 100%;
          max-width: 460px;
          margin-top: 4vh;
          animation: onbIn .55s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes onbIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .onb-h1 {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: clamp(28px, 5.4vw, 38px);
          font-weight: 900;
          letter-spacing: -1.5px;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 14px;
          text-align: center;
        }
        .onb-sub {
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255,255,255,.5);
          margin: 0 auto 36px;
          font-weight: 400;
          text-align: center;
          max-width: 380px;
        }

        .onb-row { display: flex; gap: 10px; }
        .onb-field { width: 100%; margin-bottom: 12px; }
        .onb-label {
          display: block;
          font-size: 12px; font-weight: 500;
          color: rgba(255,255,255,.45);
          margin-bottom: 8px;
        }
        .onb-input {
          width: 100%; height: 52px;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          color: #fff;
          font-family: inherit;
          font-size: 15px; font-weight: 400;
          padding: 0 16px;
          outline: none;
          box-sizing: border-box;
          transition: border-color .15s, background .15s;
        }
        .onb-input::placeholder { color: rgba(255,255,255,.25); }
        .onb-input:focus {
          border-color: rgba(255,255,255,.22);
          background: rgba(255,255,255,.05);
        }
        .onb-select {
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%23ffffff66' d='M6 8 0 0h12z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 36px;
          cursor: pointer;
        }
        .onb-section-label {
          font-size: 12px; font-weight: 500;
          color: rgba(255,255,255,.45);
          margin: 28px 0 14px;
          text-align: center;
        }
        .onb-pills {
          display: flex; flex-wrap: wrap; gap: 8px;
          justify-content: center;
          margin-bottom: 32px;
        }
        .onb-pill {
          padding: 9px 16px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 100px;
          background: transparent;
          font-family: inherit;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,.6);
          cursor: pointer;
          transition: all .12s ease;
          user-select: none;
        }
        .onb-pill:hover { border-color: rgba(255,255,255,.18); color: rgba(255,255,255,.9); }
        .onb-pill.on {
          border-color: ${G};
          color: ${G};
          background: rgba(2,209,186,.06);
        }

        .onb-btn {
          width: 100%; height: 52px;
          background: ${G};
          color: #000;
          border: none; border-radius: 12px;
          font-family: inherit;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: transform .12s, opacity .15s;
        }
        .onb-btn:hover { opacity: .92; }
        .onb-btn:active { transform: scale(.985); }
        .onb-btn:disabled { opacity: .35; cursor: not-allowed; }

        .onb-link {
          display: block;
          margin: 18px auto 0;
          background: none; border: none;
          font-family: inherit;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,.4);
          cursor: pointer;
          transition: color .15s;
        }
        .onb-link:hover { color: rgba(255,255,255,.75); }
        .onb-link.muted {
          font-size: 12px;
          color: rgba(255,255,255,.32);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .onb-error {
          font-size: 13px;
          color: #ef4444;
          margin: -8px 0 14px;
          line-height: 1.5;
          text-align: center;
        }

        /* Photo upload */
        .onb-photo-wrap {
          display: flex; flex-direction: column;
          align-items: center; gap: 12px;
          margin-bottom: 24px;
        }
        .onb-photo-avatar {
          width: 96px; height: 96px;
          border-radius: 50%;
          background: rgba(255,255,255,.04);
          border: 1px dashed rgba(255,255,255,.15);
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: border-color .15s, background .15s;
          position: relative;
        }
        .onb-photo-avatar:hover {
          border-color: ${G};
          background: rgba(2,209,186,.04);
        }
        .onb-photo-avatar img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .onb-photo-empty {
          color: rgba(255,255,255,.35);
        }
        .onb-photo-label {
          font-size: 12px;
          color: rgba(255,255,255,.4);
          text-align: center;
        }

        /* Notif previews */
        .onb-notif-stack { display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
        .onb-notif {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 14px;
          text-align: left;
        }
        .onb-notif-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .onb-notif-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; color: #fff; }
        .onb-notif-body { font-size: 12px; color: rgba(255,255,255,.42); line-height: 1.4; }

        .onb-push-status {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px; font-weight: 500;
          margin-bottom: 16px;
          line-height: 1.5;
          text-align: center;
        }
        .onb-push-status.ok {
          background: rgba(2,209,186,.06);
          border: 1px solid rgba(2,209,186,.25);
          color: ${G};
        }
        .onb-push-status.denied {
          background: rgba(255,170,0,.05);
          border: 1px solid rgba(255,170,0,.2);
          color: rgba(255,200,100,.85);
        }

        /* Recap */
        .onb-recap { margin: 28px 0 32px; padding: 4px 0; }
        .onb-recap-item {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255,255,255,.06);
          font-size: 14px;
          color: rgba(255,255,255,.7);
        }
        .onb-recap-item:last-child { border-bottom: none; }
        .onb-recap-check {
          width: 20px; height: 20px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .onb-recap-check.done { color: ${G}; }
        .onb-recap-check.skip { color: rgba(255,255,255,.22); }

        .onb-done-mark {
          width: 56px; height: 56px;
          margin: 0 auto 28px;
          display: block;
        }
        .onb-done-mark circle { fill: none; stroke: rgba(2,209,186,.18); stroke-width: 2; }
        .onb-done-mark path {
          fill: none; stroke: ${G};
          stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 40; stroke-dashoffset: 40;
          animation: onbDraw .55s cubic-bezier(.16,1,.3,1) .15s forwards;
        }
        @keyframes onbDraw { to { stroke-dashoffset: 0; } }

        /* Stagger fade-up sur chaque enfant du card */
        .onb-card > * {
          animation: onbStaggerIn .55s cubic-bezier(.16,1,.3,1) both;
        }
        .onb-card > *:nth-child(1) { animation-delay: .02s; }
        .onb-card > *:nth-child(2) { animation-delay: .08s; }
        .onb-card > *:nth-child(3) { animation-delay: .14s; }
        .onb-card > *:nth-child(4) { animation-delay: .2s; }
        .onb-card > *:nth-child(5) { animation-delay: .26s; }
        .onb-card > *:nth-child(6) { animation-delay: .32s; }
        .onb-card > *:nth-child(7) { animation-delay: .38s; }
        @keyframes onbStaggerIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Pill — micro-pulse au sélect */
        .onb-pill {
          transition: all .15s cubic-bezier(.34,1.56,.64,1);
        }
        .onb-pill:active { transform: scale(.94); }
        .onb-pill.on {
          animation: onbPillPulse .35s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes onbPillPulse {
          0%   { transform: scale(.96); }
          60%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }

        /* CTA — shine au hover */
        .onb-btn {
          position: relative;
          overflow: hidden;
        }
        .onb-btn::before {
          content: "";
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent);
          transition: left .6s ease;
        }
        .onb-btn:hover::before { left: 100%; }

        /* Photo upload — scale-in du preview */
        .onb-photo-avatar img {
          animation: onbPhotoIn .45s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes onbPhotoIn {
          from { transform: scale(.85); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        /* Plan cards */
        .onb-plans {
          display: flex; flex-direction: column; gap: 12px;
          margin-bottom: 24px;
        }
        .onb-plan-card {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          padding: 16px 18px;
          transition: opacity .25s, border-color .2s, transform .25s cubic-bezier(.16,1,.3,1);
        }
        .onb-plan-card:hover {
          border-color: rgba(255,255,255,.15);
          transform: translateY(-1px);
        }
        .onb-plan-card.off {
          opacity: .35;
          border-style: dashed;
        }
        .onb-plan-head {
          display: flex; gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }
        .onb-plan-name {
          flex: 1; height: 42px;
          font-size: 14px; font-weight: 600;
          background: transparent !important;
          border-color: transparent !important;
          padding: 0 4px;
          letter-spacing: -.2px;
        }
        .onb-plan-name:focus {
          border-color: rgba(255,255,255,.15) !important;
          background: rgba(255,255,255,.04) !important;
        }
        .onb-plan-toggle {
          width: 32px; height: 32px;
          border-radius: 100px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.5);
          font-size: 18px; font-weight: 400;
          line-height: 1;
          cursor: pointer;
          transition: all .15s;
          font-family: inherit;
          display: flex; align-items: center; justify-content: center;
        }
        .onb-plan-toggle:hover {
          background: rgba(255,255,255,.08);
          color: #fff;
        }
        .onb-plan-body {
          display: flex; gap: 10px;
        }
        .onb-plan-field { flex: 1; }
        .onb-plan-input-wrap {
          position: relative;
        }
        .onb-plan-input-wrap .onb-input {
          height: 44px;
          padding-right: 60px;
        }
        .onb-plan-suffix {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: rgba(255,255,255,.4);
          pointer-events: none;
          font-weight: 500;
        }
        .onb-plan-total {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px dashed rgba(255,255,255,.06);
          font-size: 12px;
          color: rgba(255,255,255,.45);
          text-align: right;
        }
        .onb-plan-total strong {
          color: ${G};
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        /* Slug input avec prefix */
        .onb-slug-wrap {
          display: flex; align-items: stretch;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          overflow: hidden;
          transition: border-color .15s;
        }
        .onb-slug-wrap:focus-within {
          border-color: rgba(255,255,255,.22);
          background: rgba(255,255,255,.05);
        }
        .onb-slug-prefix {
          padding: 0 4px 0 16px;
          font-size: 14px;
          color: rgba(255,255,255,.4);
          display: flex; align-items: center;
          white-space: nowrap;
          letter-spacing: -.1px;
        }
        .onb-slug-input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          padding: 0 16px 0 0 !important;
          height: 52px;
        }

        /* Textarea bio */
        .onb-textarea {
          height: auto !important;
          padding: 14px 16px !important;
          line-height: 1.5;
          resize: vertical;
          min-height: 88px;
          font-family: inherit;
        }
        .onb-char-count {
          font-size: 11px;
          color: rgba(255,255,255,.3);
          text-align: right;
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
        }

        /* Toggles */
        .onb-toggles {
          display: flex; flex-direction: column; gap: 10px;
          margin: 8px 0 18px;
        }
        .onb-toggle-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 12px;
          cursor: pointer;
          transition: border-color .15s, background .15s;
          font-size: 13px;
          color: rgba(255,255,255,.75);
        }
        .onb-toggle-row:hover {
          border-color: rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
        }
        .onb-toggle-input {
          position: absolute;
          opacity: 0; pointer-events: none;
        }
        .onb-toggle-slider {
          width: 38px; height: 22px;
          border-radius: 100px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.1);
          position: relative;
          flex-shrink: 0;
          transition: background .2s;
        }
        .onb-toggle-slider::after {
          content: "";
          position: absolute;
          top: 2px; left: 2px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: rgba(255,255,255,.85);
          transition: transform .25s cubic-bezier(.34,1.56,.64,1), background .2s;
        }
        .onb-toggle-input:checked + .onb-toggle-slider {
          background: ${G};
          border-color: ${G};
        }
        .onb-toggle-input:checked + .onb-toggle-slider::after {
          transform: translateX(16px);
          background: #000;
        }
        .onb-toggle-label {
          flex: 1;
          font-weight: 500;
        }

        /* Sentinel teaser */
        .onb-sentinel-card {
          background: linear-gradient(135deg, rgba(2,209,186,.06), rgba(2,209,186,.015));
          border: 1px solid rgba(2,209,186,.18);
          border-radius: 14px;
          padding: 16px 18px;
          margin-bottom: 24px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .onb-sentinel-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(2,209,186,.1);
          border: 1px solid rgba(2,209,186,.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .onb-sentinel-title {
          font-size: 13px; font-weight: 700;
          color: ${G};
          margin-bottom: 4px;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .onb-sentinel-body {
          font-size: 13px;
          color: rgba(255,255,255,.6);
          line-height: 1.5;
        }

        /* Booking 1:1 card (Done step) */
        .onb-booking {
          background: rgba(255,255,255,.02);
          border: 1px dashed rgba(2,209,186,.3);
          border-radius: 14px;
          padding: 18px;
          margin: 8px 0 20px;
          text-align: center;
        }
        .onb-booking-eyebrow {
          font-size: 10px; font-weight: 700;
          letter-spacing: .15em;
          color: ${G};
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .onb-booking-title {
          font-size: 15px; font-weight: 600;
          color: #fff;
          margin-bottom: 6px;
        }
        .onb-booking-sub {
          font-size: 12px;
          color: rgba(255,255,255,.5);
          margin-bottom: 14px;
          line-height: 1.5;
        }
        .onb-booking-btn {
          display: inline-block;
          padding: 10px 22px;
          background: rgba(2,209,186,.08);
          border: 1px solid rgba(2,209,186,.4);
          color: ${G};
          border-radius: 100px;
          font-size: 12px; font-weight: 600;
          text-decoration: none;
          letter-spacing: .03em;
          transition: all .15s;
          font-family: inherit;
          cursor: pointer;
        }
        .onb-booking-btn:hover {
          background: rgba(2,209,186,.14);
          border-color: ${G};
        }

        @media (max-width: 520px) {
          .onb-header { padding: 18px 20px; }
          .onb-main { padding: 16px 20px 60px; }
        }
      `}</style>

      <header className="onb-header">
        <div className="onb-mark" aria-label="RB Perform">
          <svg viewBox="170 50 180 410" width="14" height="32" aria-hidden="true">
            <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={G} />
          </svg>
        </div>
        <div className="onb-counter">
          <strong>{step}</strong> <span>/ {TOTAL_STEPS}</span>
        </div>
      </header>

      <main className="onb-main">

        {/* ───── STEP 1 — PRÉSENTATION ───── */}
        {step === 1 && (
          <div className="onb-card" key="s1">
            <h1 className="onb-h1">Présente-toi.</h1>
            <p className="onb-sub">Ton nom, ta photo et tes spécialités apparaîtront à tes clients dans l'app.</p>

            <div className="onb-photo-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFile}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="onb-photo-avatar"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Ajouter une photo"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="" />
                ) : (
                  <svg className="onb-photo-empty" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </button>
              <div className="onb-photo-label">
                {photoUploading ? "Upload en cours…" : photoUrl ? "Photo ajoutée — clique pour changer" : "Ajouter une photo (optionnel)"}
              </div>
            </div>

            <div className="onb-row">
              <div className="onb-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="onb-label">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Rayan"
                  className="onb-input"
                  autoFocus
                />
              </div>
              <div className="onb-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="onb-label">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Bonte"
                  className="onb-input"
                />
              </div>
            </div>

            <div className="onb-section-label">Tes spécialités</div>
            <div className="onb-pills">
              {SPECIALITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`onb-pill ${specialties.includes(s) ? "on" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && <div className="onb-error">{error}</div>}

            <button
              onClick={saveIdentity}
              disabled={saving || specialties.length === 0 || !firstName.trim()}
              className="onb-btn"
            >
              {saving ? "Enregistrement…" : "Continuer"}
            </button>
          </div>
        )}

        {/* ───── STEP 2 — INFOS PRO ───── */}
        {step === 2 && (
          <div className="onb-card" key="s2">
            <h1 className="onb-h1">Tes infos pro.</h1>
            <p className="onb-sub">Nécessaires pour facturer tes clients et générer tes CGV automatiquement.</p>

            <div className="onb-field">
              <label className="onb-label">SIRET</label>
              <input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="14 chiffres"
                className="onb-input"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="onb-row">
              <div className="onb-field" style={{ flex: 1, marginBottom: 12 }}>
                <label className="onb-label">Forme juridique</label>
                <select
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                  className="onb-input onb-select"
                >
                  <option value="">— Choisir —</option>
                  {LEGAL_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="onb-field" style={{ flex: 1, marginBottom: 12 }}>
                <label className="onb-label">Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 ..."
                  className="onb-input"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="onb-field">
              <label className="onb-label">Adresse pro <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(optionnel)</span></label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="10 rue Cardinale, 84000 Avignon"
                className="onb-input"
                autoComplete="street-address"
              />
            </div>

            {error && <div className="onb-error">{error}</div>}

            <button
              onClick={saveBusiness}
              disabled={saving}
              className="onb-btn"
              style={{ marginTop: 8 }}
            >
              {saving ? "Enregistrement…" : "Continuer"}
            </button>
            <button type="button" onClick={() => setStep(3)} className="onb-link">
              Compléter plus tard
            </button>
          </div>
        )}

        {/* ───── STEP 3 — TES OFFRES ───── */}
        {step === 3 && (
          <div className="onb-card" key="s3-plans">
            <h1 className="onb-h1">Tes offres.</h1>
            <p className="onb-sub">
              Renseigne les plans que tu proposes à tes clients. Tu pourras les <strong style={{ color: "rgba(255,255,255,.75)", fontWeight: 600 }}>ajuster à tout moment</strong>, varier les tarifs par client, ou en ajouter d'autres depuis tes Settings.
            </p>

            <div className="onb-plans">
              {plans.map((p, i) => (
                <div
                  key={i}
                  className={`onb-plan-card ${p._disabled ? "off" : ""}`}
                  style={{ animation: `onbIn .5s cubic-bezier(.22,1,.36,1) ${.05 + i * .08}s both` }}
                >
                  <div className="onb-plan-head">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePlan(i, "name", e.target.value)}
                      placeholder="Nom de l'offre"
                      className="onb-input onb-plan-name"
                      disabled={p._disabled}
                    />
                    <button
                      type="button"
                      onClick={() => { haptic.light(); togglePlan(i); }}
                      className="onb-plan-toggle"
                      title={p._disabled ? "Réactiver" : "Désactiver"}
                    >
                      {p._disabled ? "+" : "×"}
                    </button>
                  </div>
                  <div className="onb-plan-body">
                    <div className="onb-plan-field">
                      <label className="onb-label">Prix mensuel</label>
                      <div className="onb-plan-input-wrap">
                        <input
                          type="number"
                          min="1"
                          value={p.price_per_month}
                          onChange={(e) => updatePlan(i, "price_per_month", e.target.value)}
                          className="onb-input"
                          disabled={p._disabled}
                          inputMode="numeric"
                        />
                        <span className="onb-plan-suffix">€/mois</span>
                      </div>
                    </div>
                    <div className="onb-plan-field">
                      <label className="onb-label">Durée</label>
                      <div className="onb-plan-input-wrap">
                        <input
                          type="number"
                          min="1"
                          value={p.duration_months}
                          onChange={(e) => updatePlan(i, "duration_months", e.target.value)}
                          className="onb-input"
                          disabled={p._disabled}
                          inputMode="numeric"
                        />
                        <span className="onb-plan-suffix">mois</span>
                      </div>
                    </div>
                  </div>
                  {!p._disabled && p.price_per_month && p.duration_months ? (
                    <div className="onb-plan-total">
                      Total client : <strong>{Number(p.price_per_month) * Number(p.duration_months)} €</strong>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {error && <div className="onb-error">{error}</div>}

            <button
              onClick={savePlans}
              disabled={saving}
              className="onb-btn"
              style={{ marginTop: 8 }}
            >
              {saving ? "Enregistrement…" : "Continuer"}
            </button>
            <button type="button" onClick={() => setStep(4)} className="onb-link">
              Configurer plus tard
            </button>
          </div>
        )}

        {/* ───── STEP 4 — PROFIL PUBLIC ───── */}
        {step === 4 && (
          <div className="onb-card" key="s4-public">
            <h1 className="onb-h1">Ton profil public.</h1>
            <p className="onb-sub">
              Ta page <strong style={{ color: "rgba(255,255,255,.75)", fontWeight: 600 }}>rbperform.app/coach/{slugify(publicSlug || `${firstName}-${lastName}`) || "ton-nom"}</strong> — visible par les prospects, partageable en bio Insta. Ajustable plus tard.
            </p>

            <div className="onb-field">
              <label className="onb-label">URL personnalisée</label>
              <div className="onb-slug-wrap">
                <span className="onb-slug-prefix">rbperform.app/coach/</span>
                <input
                  type="text"
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(slugify(e.target.value))}
                  placeholder={slugify(`${firstName}-${lastName}`) || "ton-nom"}
                  className="onb-input onb-slug-input"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="onb-field">
              <label className="onb-label">Bio (2-3 phrases) <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>· visible aux prospects</span></label>
              <textarea
                value={publicBio}
                onChange={(e) => setPublicBio(e.target.value.slice(0, 280))}
                placeholder="Ex: Coach force depuis 8 ans. J'aide les hommes de 30-45 ans à reprendre le contrôle de leur corps en 3 mois. Méthode structurée, suivi quotidien."
                className="onb-input onb-textarea"
                rows={4}
              />
              <div className="onb-char-count">{publicBio.length}/280</div>
            </div>

            <div className="onb-field">
              <label className="onb-label">Ville <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(optionnel)</span></label>
              <input
                type="text"
                value={publicCity}
                onChange={(e) => setPublicCity(e.target.value)}
                placeholder="Avignon"
                className="onb-input"
              />
            </div>

            <div className="onb-field">
              <label className="onb-label">Lien CTA <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(WhatsApp / Calendly / Instagram)</span></label>
              <input
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://wa.me/33... ou https://cal.com/..."
                className="onb-input"
                autoComplete="off"
              />
            </div>

            <div className="onb-toggles">
              <label className="onb-toggle-row">
                <input type="checkbox" checked={publicEnabled} onChange={(e) => setPublicEnabled(e.target.checked)} className="onb-toggle-input" />
                <span className="onb-toggle-slider" />
                <span className="onb-toggle-label">Activer ma page publique</span>
              </label>
              <label className="onb-toggle-row">
                <input type="checkbox" checked={showRbBadge} onChange={(e) => setShowRbBadge(e.target.checked)} className="onb-toggle-input" />
                <span className="onb-toggle-slider" />
                <span className="onb-toggle-label">Afficher le badge "Founding Member"</span>
              </label>
            </div>

            {error && <div className="onb-error">{error}</div>}

            <button
              onClick={savePublicProfile}
              disabled={saving}
              className="onb-btn"
              style={{ marginTop: 8 }}
            >
              {saving ? "Enregistrement…" : "Continuer"}
            </button>
            <button type="button" onClick={() => setStep(5)} className="onb-link">
              Configurer plus tard
            </button>
          </div>
        )}

        {/* ───── STEP 5 — PUSH + SENTINEL ───── */}
        {step === 5 && (
          <div className="onb-card" key="s5-push">
            <h1 className="onb-h1">Sentinel veille pour toi.</h1>
            <p className="onb-sub">
              Notre IA surveille 7 signaux par client en continu (inactivité, RPE en baisse, no-show, etc.) et te ping quand ça vaut la peine. Tu réagis avant qu'il décroche.
            </p>

            <div className="onb-sentinel-card">
              <div className="onb-sentinel-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="onb-sentinel-title">Sentinel IA — activé</div>
                <div className="onb-sentinel-body">
                  Inclus dans ton plan Founding. Voici les 3 alertes que tu vas voir le plus :
                </div>
              </div>
            </div>

            <div className="onb-notif-stack">
              {[
                {
                  icon: <path d="M6 4h12v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4Zm0 0H3v2a3 3 0 0 0 3 3m12-5h3v2a3 3 0 0 1-3 3M9 17h6m-3-6v6m-2 4h4" />,
                  title: "Marc a battu un record",
                  body: "Squat 100 kg → 105 kg",
                  color: G,
                },
                {
                  icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
                  title: "Sarah a fini sa séance",
                  body: "Jambes · 47 min · RPE 8",
                  color: "rgba(255,255,255,.75)",
                },
                {
                  icon: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
                  title: "Thomas n'a pas log depuis 3j",
                  body: "Relance recommandée",
                  color: "rgba(255,170,0,.9)",
                },
              ].map((n, i) => (
                <div key={i} className="onb-notif" style={{ animation: `onbIn .55s cubic-bezier(.16,1,.3,1) ${.1 + i * .08}s both` }}>
                  <div className="onb-notif-icon" style={{
                    background: `${n.color}10`,
                    border: `1px solid ${n.color}28`,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={n.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      {n.icon}
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="onb-notif-title">{n.title}</div>
                    <div className="onb-notif-body">{n.body}</div>
                  </div>
                </div>
              ))}
            </div>

            {pushPerm === "granted" && pushAttempted && (
              <div className="onb-push-status ok">Notifications activées.</div>
            )}
            {pushPerm === "denied" && pushAttempted && (
              <div className="onb-push-status denied">
                Permission refusée. Tu pourras réactiver depuis les réglages du navigateur.
              </div>
            )}

            <button onClick={activatePush} className="onb-btn">
              {pushPerm === "granted" ? "Continuer" : "Activer les notifications"}
            </button>
            <button type="button" onClick={skipPush} className="onb-link">Plus tard</button>
          </div>
        )}

        {/* ───── STEP 6 — PREMIER CLIENT ───── */}
        {step === 6 && (
          <div className="onb-card" key="s6-invite">
            <h1 className="onb-h1">Invite ton premier client.</h1>
            <p className="onb-sub">
              Il reçoit un code par mail, télécharge l'app, et tu vois tout remonter en temps réel.
            </p>

            <div className="onb-field">
              <label className="onb-label">Email du client</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                className="onb-input"
                autoFocus
                autoCapitalize="none"
                autoComplete="email"
              />
            </div>

            <div className="onb-field">
              <label className="onb-label">Prénom <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(optionnel)</span></label>
              <input
                type="text"
                value={clientPrenom}
                onChange={(e) => setClientPrenom(e.target.value)}
                placeholder="Marc"
                className="onb-input"
              />
            </div>

            {error && <div className="onb-error">{error}</div>}

            <button
              onClick={sendInvite}
              disabled={inviteLoading || !clientEmail.trim()}
              className="onb-btn"
              style={{ marginTop: 8 }}
            >
              {inviteLoading ? "Envoi…" : inviteSent ? "Invitation envoyée" : "Envoyer l'invitation"}
            </button>

            <button type="button" onClick={skipInvite} className="onb-link">
              Passer cette étape
            </button>

            <button
              type="button"
              onClick={() => { haptic.light(); setShowMigrationHelp(true); }}
              className="onb-link muted"
              style={{ marginTop: 4 }}
            >
              Comment migrer mes clients existants ?
            </button>
          </div>
        )}

        <HelpMigrationGuide
          open={showMigrationHelp}
          onClose={() => setShowMigrationHelp(false)}
        />

        {/* ───── STEP 7 — DONE ───── */}
        {step === 7 && (
          <div className="onb-card" key="s7-done" style={{ textAlign: "center" }}>
            <svg className="onb-done-mark" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="30" />
              <path d="M18 33 L28 43 L46 24" />
            </svg>

            <h1 className="onb-h1" style={{ marginBottom: 12 }}>Tout est prêt.</h1>
            <p className="onb-sub" style={{ marginBottom: 8 }}>
              Tu peux toujours ajuster ces réglages depuis ton profil.
            </p>

            <div className="onb-recap" style={{ textAlign: "left" }}>
              <div className="onb-recap-item">
                <span className="onb-recap-check done">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                <span>Profil et spécialités configurés</span>
              </div>
              <div className="onb-recap-item">
                <span className={`onb-recap-check ${siret ? "done" : "skip"}`}>
                  {siret ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  )}
                </span>
                <span>{siret ? "Infos pro renseignées" : "Infos pro à compléter dans Settings"}</span>
              </div>
              <div className="onb-recap-item">
                <span className={`onb-recap-check ${plans.filter(p => !p._disabled).length ? "done" : "skip"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                <span>{plans.filter(p => !p._disabled).length} offre(s) configurée(s)</span>
              </div>
              <div className="onb-recap-item">
                <span className={`onb-recap-check ${publicEnabled ? "done" : "skip"}`}>
                  {publicEnabled ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  )}
                </span>
                <span>
                  {publicEnabled
                    ? <>Profil public en ligne : <strong style={{ color: G, fontWeight: 600 }}>rbperform.app/coach/{slugify(publicSlug || `${firstName}-${lastName}`)}</strong></>
                    : "Profil public désactivé"}
                </span>
              </div>
              <div className="onb-recap-item">
                <span className={`onb-recap-check ${pushPerm === "granted" ? "done" : "skip"}`}>
                  {pushPerm === "granted" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  )}
                </span>
                <span>{pushPerm === "granted" ? "Notifications activées" : "Notifications à activer plus tard"}</span>
              </div>
              <div className="onb-recap-item">
                <span className={`onb-recap-check ${inviteSent ? "done" : "skip"}`}>
                  {inviteSent ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  )}
                </span>
                <span>
                  {inviteSent
                    ? <>Invitation envoyée à <strong style={{ color: G, fontWeight: 600 }}>{clientEmail}</strong></>
                    : "Premier client à inviter"}
                </span>
              </div>
            </div>

            <div className="onb-booking">
              <div className="onb-booking-eyebrow">Inclus Founding</div>
              <div className="onb-booking-title">Réserve ton onboarding 1:1 avec Rayan</div>
              <div className="onb-booking-sub">
                20 minutes pour configurer ton premier client, calibrer Sentinel et te montrer les raccourcis pros.
              </div>
              <a
                href="mailto:rayan@rbperform.app?subject=Onboarding 1:1 — réservation&body=Salut Rayan,%0D%0A%0D%0AJe viens de finir l'onboarding. Voici 3 créneaux où je suis dispo cette semaine :%0D%0A%0D%0A1. %0D%0A2. %0D%0A3. %0D%0A%0D%0AMerci !"
                className="onb-booking-btn"
                onClick={() => haptic.light()}
              >
                Demander 3 créneaux →
              </a>
            </div>

            {error && <div className="onb-error">{error}</div>}

            <button
              onClick={finishOnboarding}
              disabled={saving}
              className="onb-btn"
            >
              {saving ? "Chargement…" : "Accéder à mon dashboard"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
