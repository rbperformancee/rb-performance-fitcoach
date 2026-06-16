// src/components/coach/CRMSection.jsx
//
// CRM personnel super-admin (Rayan). Agrège tous les contacts qui sont en
// base depuis des sources multiples :
//   - clients          (clients payants en cours)
//   - coaching_applications (candidatures /candidature)
//   - waitlist         (méthode-athlete + autres sources)
//   - cold_prospects   (B2B coachs ciblés)
//   - crm_manual_leads (DM Insta / contacts terrain ajoutés à la main)
//
// Déduplication par email lowercased. Stage / notes / tags / reminders sont
// stockés dans crm_contacts + crm_notes + crm_tags + crm_reminders.
//
// RLS super_admin only → invisible pour tous les autres coachs.

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const GREEN = "#02d1ba";
const BG = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.07)";

const STAGES = [
  { id: "cold",         label: "Cold",          color: "rgba(255,255,255,0.5)" },
  { id: "warm",         label: "Warm",          color: "#f59e0b" },
  { id: "hot",          label: "Hot",           color: "#ef4444" },
  { id: "call_booked",  label: "Call booké",    color: "#0891b2" },
  { id: "in_progress",  label: "En cours",      color: GREEN },
  { id: "closed_won",   label: "Signé",         color: "#10b981" },
  { id: "closed_lost",  label: "Perdu",         color: "rgba(255,255,255,0.3)" },
];

const SOURCE_LABELS = {
  client:             { label: "Client",       color: "#10b981" },
  candidature:        { label: "Candidature",  color: GREEN },
  waitlist:           { label: "Waitlist",     color: "#0891b2" },
  cold_prospect:      { label: "Cold B2B",     color: "#a78bfa" },
  manual:             { label: "Manuel",       color: "#f59e0b" },
};

export default function CRMSection({ coachId }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filterStage, setFilterStage] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);

  // Load aggregated contacts on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [appsRes, waitRes, clientsRes, coldRes, manualRes, crmRes] = await Promise.all([
          supabase.from("coaching_applications").select("email, nom_prenom, telephone, created_at, status").order("created_at", { ascending: false }),
          supabase.from("waitlist").select("email, name, source, created_at").order("created_at", { ascending: false }),
          supabase.from("clients").select("email, full_name, phone, created_at, subscription_status").eq("coach_id", coachId),
          supabase.from("cold_prospects").select("email, full_name, instagram, niche, status, note, created_at"),
          supabase.from("crm_manual_leads").select("email, source, context, created_at"),
          supabase.from("crm_contacts").select("*"),
        ]);
        if (cancelled) return;

        // Merge by email (lowercased)
        const byEmail = new Map();

        const ensure = (email) => {
          const key = (email || "").toLowerCase().trim();
          if (!key) return null;
          if (!byEmail.has(key)) {
            byEmail.set(key, {
              email: key,
              display_name: "",
              phone: "",
              instagram_handle: "",
              sources: new Set(),
              first_seen: null,
              raw: {},
            });
          }
          return byEmail.get(key);
        };

        const updateFirstSeen = (c, dt) => {
          if (!dt) return;
          if (!c.first_seen || dt < c.first_seen) c.first_seen = dt;
        };

        (clientsRes.data || []).forEach((r) => {
          const c = ensure(r.email); if (!c) return;
          c.sources.add("client");
          c.display_name = c.display_name || r.full_name || "";
          c.phone = c.phone || r.phone || "";
          updateFirstSeen(c, r.created_at);
          c.raw.client = r;
        });

        (appsRes.data || []).forEach((r) => {
          const c = ensure(r.email); if (!c) return;
          c.sources.add("candidature");
          c.display_name = c.display_name || r.nom_prenom || "";
          c.phone = c.phone || r.telephone || "";
          updateFirstSeen(c, r.created_at);
          c.raw.candidature = r;
        });

        (waitRes.data || []).forEach((r) => {
          const c = ensure(r.email); if (!c) return;
          c.sources.add("waitlist");
          c.display_name = c.display_name || r.name || "";
          updateFirstSeen(c, r.created_at);
          c.raw.waitlist = r;
        });

        (coldRes.data || []).forEach((r) => {
          const c = ensure(r.email); if (!c) return;
          c.sources.add("cold_prospect");
          c.display_name = c.display_name || r.full_name || "";
          c.instagram_handle = c.instagram_handle || r.instagram || "";
          updateFirstSeen(c, r.created_at);
          c.raw.cold = r;
        });

        (manualRes.data || []).forEach((r) => {
          const c = ensure(r.email); if (!c) return;
          c.sources.add("manual");
          updateFirstSeen(c, r.created_at);
          c.raw.manual = r;
        });

        // Merge crm_contacts (stage, notes_summary, last_contacted, etc.)
        (crmRes.data || []).forEach((r) => {
          const c = ensure(r.email); if (!c) return;
          c.stage = r.stage || "cold";
          c.notes_summary = r.notes_summary || "";
          c.last_contacted_at = r.last_contacted_at;
          c.next_action_at = r.next_action_at;
          c.display_name = c.display_name || r.display_name || "";
          c.phone = c.phone || r.phone || "";
          c.instagram_handle = c.instagram_handle || r.instagram_handle || "";
        });

        // Default stage for contacts not yet in crm_contacts
        const arr = [...byEmail.values()].map((c) => ({ ...c, stage: c.stage || "cold" }));
        arr.sort((a, b) => (b.first_seen || "").localeCompare(a.first_seen || ""));

        setContacts(arr);
      } catch (e) {
        console.error("[CRM] load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coachId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filterStage !== "all" && c.stage !== filterStage) return false;
      if (filterSource !== "all" && !c.sources.has(filterSource)) return false;
      if (q && !(c.email.includes(q) || (c.display_name || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [contacts, filterStage, filterSource, search]);

  const stats = useMemo(() => {
    const out = { total: contacts.length };
    STAGES.forEach((s) => { out[s.id] = contacts.filter((c) => c.stage === s.id).length; });
    return out;
  }, [contacts]);

  return (
    <div style={{ padding: "16px 16px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 4 }}>
            CRM personnel · Super admin
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.5px" }}>
            {stats.total} contacts
          </h2>
        </div>
        <button
          onClick={() => setShowAddLead(true)}
          style={{
            background: `linear-gradient(135deg, ${GREEN}, #0891b2)`,
            color: "#000", border: "none", borderRadius: 10,
            padding: "10px 16px", fontSize: 12, fontWeight: 800,
            letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer",
          }}
        >
          + Ajouter lead
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 18 }}>
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterStage(filterStage === s.id ? "all" : s.id)}
            style={{
              background: filterStage === s.id ? `${s.color}22` : BG,
              border: `1px solid ${filterStage === s.id ? s.color : BORDER}`,
              borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ fontSize: 9, color: s.color, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{stats[s.id]}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche email ou nom…"
          style={{
            flex: "1 1 200px", minWidth: 200, padding: "8px 12px",
            background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
            color: "#fff", fontSize: 13, fontFamily: "inherit",
          }}
        />
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={{ padding: "8px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13 }}
        >
          <option value="all">Toutes sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.4)", padding: 24, textAlign: "center" }}>Chargement…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((c) => (
            <ContactRow key={c.email} c={c} onOpen={() => setSelectedEmail(c.email)} />
          ))}
          {filtered.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.4)", padding: 24, textAlign: "center" }}>
              Aucun contact ne match les filtres.
            </div>
          )}
        </div>
      )}

      {selectedEmail && (
        <ContactDetail
          email={selectedEmail}
          contact={contacts.find((c) => c.email === selectedEmail)}
          onClose={() => setSelectedEmail(null)}
          onUpdate={(patch) => {
            setContacts((prev) => prev.map((c) => c.email === selectedEmail ? { ...c, ...patch } : c));
          }}
        />
      )}

      {showAddLead && (
        <AddManualLead
          onClose={() => setShowAddLead(false)}
          onAdded={(newContact) => {
            setContacts((prev) => {
              const next = [newContact, ...prev.filter((c) => c.email !== newContact.email)];
              return next;
            });
            setShowAddLead(false);
          }}
        />
      )}
    </div>
  );
}

function ContactRow({ c, onOpen }) {
  const stage = STAGES.find((s) => s.id === c.stage) || STAGES[0];
  return (
    <button
      onClick={onOpen}
      style={{
        background: BG, border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: "12px 14px", textAlign: "left", cursor: "pointer",
        display: "grid", gridTemplateColumns: "1fr auto", gap: 12,
        color: "#fff", fontFamily: "inherit",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.display_name || c.email}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.email}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[...c.sources].map((s) => {
            const meta = SOURCE_LABELS[s] || { label: s, color: "rgba(255,255,255,0.5)" };
            return (
              <span key={s} style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 4,
                background: `${meta.color}22`, color: meta.color,
                letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 800,
              }}>
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{
          fontSize: 10, padding: "3px 9px", borderRadius: 100,
          background: `${stage.color}22`, color: stage.color,
          letterSpacing: 1, textTransform: "uppercase", fontWeight: 800,
        }}>
          {stage.label}
        </span>
        {c.first_seen && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            {(c.first_seen || "").slice(0, 10)}
          </span>
        )}
      </div>
    </button>
  );
}

function ContactDetail({ email, contact, onClose, onUpdate }) {
  const [stage, setStage] = useState(contact?.stage || "cold");
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Ensure crm_contacts row exists
      await supabase.from("crm_contacts").upsert(
        { email, stage: contact?.stage || "cold", display_name: contact?.display_name || null },
        { onConflict: "email" }
      );
      const { data } = await supabase.from("crm_notes").select("*").eq("email", email).order("created_at", { ascending: false });
      if (!cancelled) setNotes(data || []);
    })();
    return () => { cancelled = true; };
  }, [email, contact]);

  const saveStage = async (next) => {
    setStage(next);
    setSaving(true);
    const { error } = await supabase.from("crm_contacts").update({ stage: next, last_contacted_at: new Date().toISOString() }).eq("email", email);
    if (!error) onUpdate({ stage: next });
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const body = newNote.trim();
    setNewNote("");
    const { data, error } = await supabase.from("crm_notes").insert({ email, body }).select().single();
    if (!error && data) setNotes((p) => [data, ...p]);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#0d0d0d", borderTopLeftRadius: 18, borderTopRightRadius: 18,
        width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto",
        padding: 22, color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{contact?.display_name || email}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{email}</div>
            {contact?.phone && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>📞 {contact.phone}</div>}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 700 }}>Stage pipeline</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => saveStage(s.id)}
                disabled={saving}
                style={{
                  padding: "6px 12px", fontSize: 11, fontWeight: 800,
                  letterSpacing: 0.5, textTransform: "uppercase",
                  background: stage === s.id ? `${s.color}33` : "rgba(255,255,255,0.04)",
                  color: stage === s.id ? s.color : "rgba(255,255,255,0.5)",
                  border: `1px solid ${stage === s.id ? s.color : BORDER}`,
                  borderRadius: 8, cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {contact?.raw?.candidature && (
          <details style={{ marginBottom: 14, padding: "10px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 11, color: GREEN, fontWeight: 700 }}>📋 Réponses candidature</summary>
            <pre style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {JSON.stringify(contact.raw.candidature, null, 2)}
            </pre>
          </details>
        )}

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 700 }}>Notes ({notes.length})</div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Nouvelle note (Cmd+Enter pour valider)…"
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote(); }}
            style={{
              width: "100%", minHeight: 60, padding: 10,
              background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8,
              color: "#fff", fontSize: 13, fontFamily: "inherit", resize: "vertical",
            }}
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim()}
            style={{
              marginTop: 8, padding: "8px 16px", background: GREEN, color: "#000",
              border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800,
              letterSpacing: 0.5, textTransform: "uppercase", cursor: newNote.trim() ? "pointer" : "not-allowed",
              opacity: newNote.trim() ? 1 : 0.4,
            }}
          >
            Ajouter note
          </button>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ padding: "10px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.body}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, letterSpacing: 0.3 }}>
                  {new Date(n.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: 12, textAlign: "center" }}>Aucune note pour l'instant.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddManualLead({ onClose, onAdded }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [insta, setInsta] = useState("");
  const [context, setContext] = useState("");
  const [source, setSource] = useState("instagram");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) { setErr("Email invalide"); return; }
    setSaving(true);
    setErr("");
    try {
      const emailLow = email.toLowerCase().trim();
      // 1. crm_contacts
      await supabase.from("crm_contacts").upsert({
        email: emailLow,
        stage: "warm",
        display_name: name || null,
        instagram_handle: insta || null,
        source_primary: source,
        notes_summary: context || null,
      }, { onConflict: "email" });
      // 2. crm_manual_leads
      await supabase.from("crm_manual_leads").upsert({
        email: emailLow,
        source,
        context,
      }, { onConflict: "email" });
      onAdded({
        email: emailLow,
        display_name: name,
        instagram_handle: insta,
        phone: "",
        sources: new Set(["manual"]),
        stage: "warm",
        first_seen: new Date().toISOString(),
        raw: {},
      });
    } catch (e) {
      setErr(e.message || "Erreur");
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1001, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#0d0d0d", borderTopLeftRadius: 18, borderTopRightRadius: 18,
        width: "100%", maxWidth: 480, padding: 22, color: "#fff",
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 16px" }}>Nouveau lead manuel</h3>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom / Nom" style={inputStyle} />
        <input value={insta} onChange={(e) => setInsta(e.target.value)} placeholder="@instagram (optionnel)" style={inputStyle} />
        <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
          <option value="instagram">Instagram</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Téléphone</option>
          <option value="event">Évènement</option>
          <option value="autre">Autre</option>
        </select>
        <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Contexte (ex : DM 16/06, répond à story protein)" style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
        {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: 12, background: GREEN, border: "none", borderRadius: 8, color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>{saving ? "…" : "Ajouter"}</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: 12, marginBottom: 10,
  background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
  color: "#fff", fontSize: 14, fontFamily: "inherit",
  boxSizing: "border-box",
};
