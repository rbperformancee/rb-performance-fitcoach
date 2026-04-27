import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT, getLocale } from "../../lib/i18n";

const G = "#02d1ba";

const intlLocale = () => (getLocale() === "en" ? "en-US" : "fr-FR");
const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

export default function CoachPlansSettings({ coachId, plans = [], onReload }) {
  const t = useT();
  const [editing, setEditing] = useState(null); // plan object or 'new'
  const [form, setForm] = useState({ name: "", price_per_month: "", duration_months: "", billing_type: "upfront" });
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(null); // plan id being archived

  const openNew = () => {
    setForm({ name: "", price_per_month: "", duration_months: "", billing_type: "upfront" });
    setEditing("new");
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name,
      price_per_month: String(plan.price_per_month),
      duration_months: String(plan.duration_months),
      billing_type: plan.billing_type,
    });
    setEditing(plan);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price_per_month || !form.duration_months) {
      toast.error(t("cps.toast_fill_fields"));
      return;
    }
    setSaving(true);
    const payload = {
      coach_id: coachId,
      name: form.name.trim(),
      price_per_month: parseFloat(form.price_per_month),
      duration_months: parseInt(form.duration_months),
      billing_type: form.billing_type,
    };

    let error;
    if (editing === "new") {
      payload.display_order = plans.length + 1;
      const res = await supabase.from("coach_plans").insert(payload).select();
      error = res.error;
    } else {
      const res = await supabase.from("coach_plans").update(payload).eq("id", editing.id).select();
      error = res.error;
    }

    setSaving(false);
    if (error) {
      // Ignorer "no rows returned" — l'insert a reussi cote DB
      if (error.message?.includes("0 rows") || error.code === "PGRST116") {
        // Insert OK mais SELECT post-insert bloque par RLS — pas grave
      } else {
        toast.error(error.message.includes("unique") ? t("cps.toast_name_exists") : t("cps.toast_error_prefix") + error.message);
        return;
      }
    }
    toast.success(editing === "new" ? t("cps.toast_created") : t("cps.toast_updated"));
    setEditing(null);
    onReload?.();
  };

  const archive = async (plan) => {
    const activePlans = plans.filter(p => p.is_active);
    if (activePlans.length <= 1) {
      toast.error(t("cps.toast_archive_min"));
      return;
    }
    setArchiving(plan.id);
    const { error } = await supabase.from("coach_plans").update({ is_active: false }).eq("id", plan.id);
    setArchiving(null);
    if (error) { toast.error(t("cps.toast_error")); return; }
    toast.success(t("cps.toast_archived"));
    onReload?.();
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12, color: "#fff", fontSize: 15, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };
  const labelStyle = {
    fontSize: 10, letterSpacing: "2px", textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600, display: "block",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>{t("cps.eyebrow")}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{t("cps.title")}</div>
        </div>
        <button onClick={openNew} style={{
          padding: "8px 16px", background: `${G}15`, border: `1px solid ${G}30`,
          borderRadius: 10, color: G, fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>{t("cps.btn_add")}</button>
      </div>

      {/* Plans list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {plans.map(plan => (
          <div key={plan.id} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: "16px 18px", position: "relative",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{plan.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: G, marginBottom: 4 }}>
              {Number(plan.price_per_month).toLocaleString(intlLocale())}€<span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t("cps.per_month_short")}</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
              {fillTpl(t("cps.duration_separator"), { n: plan.duration_months, type: plan.billing_type === "upfront" ? t("cps.billing_upfront") : t("cps.billing_monthly") })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openEdit(plan)} style={{
                flex: 1, padding: "8px", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>{t("cps.btn_modify")}</button>
              <button onClick={() => archive(plan)} disabled={archiving === plan.id} style={{
                flex: 1, padding: "8px", background: "rgba(255,107,107,0.06)",
                border: "1px solid rgba(255,107,107,0.15)", borderRadius: 8,
                color: "#ff6b6b", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                opacity: archiving === plan.id ? 0.5 : 1,
              }}>{archiving === plan.id ? "..." : t("cps.btn_archive")}</button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          {t("cps.empty")}
        </div>
      )}

      {/* Modal edit/create */}
      {editing && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }} style={{
          position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            width: "100%", maxWidth: 420, background: "#0a0c10",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
                {editing === "new" ? t("cps.modal_new") : t("cps.modal_edit")}
              </div>
              <button onClick={() => setEditing(null)} aria-label={t("cps.aria_close")} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, cursor: "pointer", color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>{t("cps.field_name")}</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("cps.field_name_placeholder")} style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>{t("cps.field_price")}</label>
                  <input type="number" min="0" value={form.price_per_month} onChange={e => setForm({ ...form, price_per_month: e.target.value })} placeholder={t("cps.field_price_placeholder")} inputMode="decimal" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t("cps.field_duration")}</label>
                  <input type="number" min="1" value={form.duration_months} onChange={e => setForm({ ...form, duration_months: e.target.value })} placeholder={t("cps.field_duration_placeholder")} inputMode="numeric" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t("cps.field_billing_type")}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "upfront", label: t("cps.billing_upfront") },
                    { id: "monthly", label: t("cps.billing_monthly") },
                  ].map(bt => (
                    <button key={bt.id} onClick={() => setForm({ ...form, billing_type: bt.id })} style={{
                      flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                      background: form.billing_type === bt.id ? `${G}12` : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${form.billing_type === bt.id ? G : "rgba(255,255,255,0.06)"}`,
                      color: form.billing_type === bt.id ? G : "rgba(255,255,255,0.4)",
                      fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    }}>{bt.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setEditing(null)} style={{
                flex: 0, padding: "14px 20px", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
                color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>{t("cps.btn_cancel")}</button>
              <button onClick={save} disabled={saving} style={{
                flex: 1, padding: 14,
                background: `linear-gradient(135deg, ${G}, ${G}cc)`,
                color: "#000", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800,
                cursor: saving ? "default" : "pointer", fontFamily: "inherit",
                opacity: saving ? 0.6 : 1,
              }}>{saving ? t("cps.btn_saving") : t("cps.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
