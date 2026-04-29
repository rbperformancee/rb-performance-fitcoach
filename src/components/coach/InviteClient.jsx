import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

const G = "#02d1ba";

/**
 * InviteClient — modal pour inviter un nouveau client par email.
 * Flow:
 *   1. Coach remplit email + prenom + programme (optionnel)
 *   2. INSERT dans invitations (token auto-genere)
 *   3. Appel Edge Function send-invite (Resend)
 *   4. Toast succes + callback onInvited
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   coachId: uuid
 *   onInvited: (invitation) => void  // appele apres envoi OK
 */
export default function InviteClient({ open, onClose, coachId, onInvited }) {
  const t = useT();
  const [email, setEmail]   = useState("");
  const [prenom, setPrenom] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [programmes, setProgrammes]   = useState([]);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState("");

  // Charge la liste des programmes actifs du coach (pour selector optionnel)
  useEffect(() => {
    if (!open || !coachId) return;
    let cancelled = false;
    (async () => {
      // On charge les derniers programmes, groupe par nom unique (snapshot).
      // Si pas de programmes, le selector sera cache.
      const { data } = await supabase
        .from("programmes")
        .select("id, programme_name, client_id, uploaded_at")
        .eq("is_active", true)
        .order("uploaded_at", { ascending: false })
        .limit(20);
      if (!cancelled && Array.isArray(data)) {
        // Dedupe par programme_name (on prend le premier id qui apparait)
        const seen = new Map();
        for (const p of data) {
          const key = p.programme_name || "Sans nom";
          if (!seen.has(key)) seen.set(key, p);
        }
        setProgrammes(Array.from(seen.values()));
      }
    })();
    return () => { cancelled = true; };
  }, [open, coachId]);

  // Reset a l'ouverture
  useEffect(() => {
    if (open) {
      setEmail(""); setPrenom(""); setProgrammeId(""); setError(""); setSending(false);
    }
  }, [open]);

  async function handleInvite() {
    const mail = email.trim().toLowerCase();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(mail)) {
      setError(t("iv.error_invalid_email")); return;
    }
    setError("");
    haptic.selection();
    setSending(true);
    try {
      // Insert invitation (token genere cote DB via default gen_random_uuid)
      const { data: inv, error: insErr } = await supabase
        .from("invitations")
        .insert({
          coach_id: coachId,
          email: mail,
          prenom: prenom.trim() || null,
          programme_id: programmeId || null,
          status: "pending",
        })
        .select("id,email,prenom,token,programme_id,created_at,expires_at")
        .single();
      if (insErr) throw insErr;

      // Call edge function send-invite
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error(t("iv.error_session_expired"));

      const fnRes = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ invitation_id: inv.id }),
      });
      const fnJson = await fnRes.json();
      if (!fnRes.ok || !fnJson.success) {
        console.warn("[send-invite] non-critique:", fnJson);
        // On ne throw pas — l'invitation est creee, le coach peut resend plus tard
        toast.info(t("iv.toast_email_not_sent"));
      } else {
        toast.success(t("iv.toast_sent").replace("{email}", mail));
      }

      if (onInvited) onInvited(inv);
      onClose?.();
    } catch (e) {
      setError(e.message || t("iv.error_generic"));
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,.65)",
        WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12vh 16px 16px",
        animation: "invFadeIn .18s ease both",
      }}
    >
      <style>{`
        @keyframes invFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes invSlide  { from { transform: translateY(-8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .inv-input:focus { border-color: ${G} !important; background: rgba(2,209,186,.04) !important; outline: none; }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("iv.aria_title")}
        style={{
          width: "100%", maxWidth: 440,
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,.1)",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(2,209,186,.05)",
          padding: "28px 28px 24px",
          animation: "invSlide .22s cubic-bezier(.22,1,.36,1) both",
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          color: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(2,209,186,.7)" }}>
            {t("iv.eyebrow")}
          </div>
          <button
            onClick={onClose}
            aria-label={t("iv.aria_close")}
            style={{
              background: "rgba(255,255,255,.04)",
              border: "none",
              borderRadius: 8,
              width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,.5)",
            }}
          >
            <AppIcon name="x" size={14} color="rgba(255,255,255,.5)" />
          </button>
        </div>

        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 22, fontWeight: 900, letterSpacing: "-.5px",
          color: "#fff", margin: "0 0 8px", lineHeight: 1.2,
        }}>
          {t("iv.title")}<span style={{ color: G }}>.</span>
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: "0 0 22px", lineHeight: 1.5 }}>
          {t("iv.subtitle")}
        </p>

        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>{t("iv.label_email")}</label>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("iv.placeholder_email")}
            className="inv-input"
            style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            autoCapitalize="none"
            autoComplete="email"
          />
        </div>

        {/* Prenom */}
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>{t("iv.label_first_name")}</label>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder={t("iv.placeholder_first_name")}
            className="inv-input"
            style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
        </div>

        {/* Programme selector */}
        {programmes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>{t("iv.label_program")}</label>
            <select
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              className="inv-input"
              style={{ ...fieldInput, cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><polyline fill=%22none%22 stroke=%22%23666%22 stroke-width=%221.5%22 points=%221 1 5 5 9 1%22/></svg>')", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 36 }}
            >
              <option value="">{t("iv.option_no_program")}</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.programme_name || t("iv.no_name")}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 8, marginBottom: 8,
            padding: "8px 12px",
            background: "rgba(255,107,107,.06)",
            border: ".5px solid rgba(255,107,107,.2)",
            borderRadius: 8,
            fontSize: 12, color: "#ef4444",
          }}>{error}</div>
        )}

        <button
          onClick={handleInvite}
          disabled={sending || !email.trim()}
          style={{
            width: "100%", marginTop: 18,
            padding: "14px 20px",
            background: G, color: "#000",
            border: "none", borderRadius: 12,
            fontFamily: "'Syne', sans-serif",
            fontSize: 13, fontWeight: 900,
            letterSpacing: ".1em", textTransform: "uppercase",
            cursor: sending ? "wait" : "pointer",
            opacity: (sending || !email.trim()) ? .5 : 1,
            boxShadow: "0 16px 40px rgba(2,209,186,.3)",
            transition: "opacity .15s, transform .15s",
          }}
        >
          {sending ? t("iv.btn_sending") : t("iv.btn_send")}
        </button>

        <div style={{
          marginTop: 12,
          fontSize: 11,
          color: "rgba(255,255,255,.3)",
          textAlign: "center",
          letterSpacing: ".04em",
        }}>
          {t("iv.footer_free")}
        </div>
      </div>
    </div>
  );
}

// ===== STYLES =====
const fieldLabel = {
  display: "block",
  fontSize: 10, fontWeight: 600,
  letterSpacing: ".12em", textTransform: "uppercase",
  color: "rgba(255,255,255,.35)",
  marginBottom: 6,
};
const fieldInput = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,.03)",
  border: ".5px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .15s, background .15s",
  boxSizing: "border-box",
};
