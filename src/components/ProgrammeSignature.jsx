import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import haptic from "../lib/haptic";
import Spinner from "./Spinner";

const G = "#02d1ba";

export default function ProgrammeSignature({ programme, client, onSigned }) {
  const [name, setName] = useState("");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstName = client?.full_name?.split(" ")[0] || "";

  const handleSign = async () => {
    if (!name.trim() || !checked) return;
    haptic.success();
    setSaving(true);
    await supabase.from("programmes").update({
      programme_accepted_at: new Date().toISOString(),
      accepted_by: name.trim(),
    }).eq("id", programme.id);

    // Push notification au coach
    try {
      await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: process.env.REACT_APP_SUPABASE_ANON_KEY },
        body: JSON.stringify({ client_id: client.id, title: "RB PERFORM", body: `${firstName || name.trim()} a accepte son programme. La transformation commence.` }),
      });
    } catch {}

    setSaving(false);
    if (onSigned) onSigned();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes sigFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:rgba(255,255,255,0.2)}
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.12), transparent 65%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 400, width: "100%", textAlign: "center", animation: "sigFade 0.6s ease both" }}>
        {/* Icone document */}
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(2,209,186,0.08)", border: `1px solid rgba(2,209,186,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>

        <div style={{ fontSize: 10, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 12, fontWeight: 700 }}>Nouveau programme</div>

        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.95, marginBottom: 14 }}>
          {programme?.programme_name || "Programme"}
        </h1>

        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 32, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
          Ton coach t'a prepare un nouveau programme. Accepte-le pour commencer ta transformation.
        </p>

        {/* Input prenom */}
        <div style={{ marginBottom: 16, textAlign: "left" }}>
          <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600 }}>Tape ton prenom pour signer</div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={firstName || "Prenom"}
            autoFocus
            style={{ width: "100%", padding: "16px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "#fff", fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box", fontFamily: "inherit", textAlign: "center", letterSpacing: "1px" }}
          />
        </div>

        {/* Checkbox */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, cursor: "pointer", justifyContent: "center" }}>
          <div
            onClick={() => setChecked(c => !c)}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: checked ? G : "rgba(255,255,255,0.04)",
              border: `2px solid ${checked ? G : "rgba(255,255,255,0.15)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s", color: "#000", fontSize: 14, fontWeight: 900,
            }}
          >
            {checked ? "✓" : ""}
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
            J'accepte de suivre ce programme et je m'engage a donner le meilleur de moi-meme.
          </span>
        </label>

        {/* CTA */}
        <button
          onClick={handleSign}
          disabled={!name.trim() || !checked || saving}
          style={{
            width: "100%", padding: 18,
            background: name.trim() && checked ? `linear-gradient(135deg, ${G}, #0891b2)` : "rgba(255,255,255,0.04)",
            color: name.trim() && checked ? "#000" : "rgba(255,255,255,0.25)",
            border: "none", borderRadius: 16,
            fontSize: 14, fontWeight: 800, cursor: name.trim() && checked ? "pointer" : "not-allowed",
            fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
            boxShadow: name.trim() && checked ? "0 10px 36px rgba(2,209,186,0.35)" : "none",
          }}
        >
          {saving ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Spinner variant="dots" size={18} color="#000" />Signature</span>) : "Accepter et commencer"}
        </button>
      </div>
    </div>
  );
}
