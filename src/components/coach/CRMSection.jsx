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

  // ════════ KPI funnel-specific (calculés sur coaching_applications) ════════
  // Show-up rate = LE KPI #1 cité dans la mémoire Jonas.
  // Close rate = combien de calls passés deviennent des signés.
  // Velocity = combien de candidatures cette semaine.
  const [funnelKpis, setFunnelKpis] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sinceMonth = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      const sinceWeek = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const { data } = await supabase
        .from("coaching_applications")
        .select("id,call_scheduled_at,call_completed_at,call_outcome,created_at")
        .gte("created_at", sinceMonth);
      if (cancelled || !Array.isArray(data)) return;

      // Show-up = calls dont l'outcome n'est PAS no_show (sur calls programmés et passés)
      const callsThatHadPlace = data.filter(
        (a) => a.call_scheduled_at &&
        new Date(a.call_scheduled_at) < new Date() &&
        a.call_outcome &&
        a.call_outcome !== "rescheduled" &&
        a.call_outcome !== "pending" &&
        a.call_outcome !== "rejected_by_us"
      );
      const showed = callsThatHadPlace.filter((a) => a.call_outcome !== "no_show");
      const showUpRate = callsThatHadPlace.length > 0
        ? Math.round((showed.length / callsThatHadPlace.length) * 100)
        : null;

      const callsCompleted = data.filter(
        (a) => a.call_outcome === "closed_won" || a.call_outcome === "closed_lost"
      );
      const won = data.filter((a) => a.call_outcome === "closed_won").length;
      const closeRate = callsCompleted.length > 0
        ? Math.round((won / callsCompleted.length) * 100)
        : null;

      const newThisWeek = data.filter((a) => new Date(a.created_at) >= new Date(sinceWeek)).length;
      const callsBookedWeek = data.filter((a) => a.call_scheduled_at && new Date(a.call_scheduled_at) >= new Date(sinceWeek)).length;

      setFunnelKpis({
        candidatures_30j: data.length,
        show_up_rate: showUpRate,
        close_rate: closeRate,
        won_30j: won,
        new_this_week: newThisWeek,
        calls_booked_week: callsBookedWeek,
      });
    })();
    return () => { cancelled = true; };
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

      {/* KPI funnel — 30 jours glissants */}
      {funnelKpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 14 }}>
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>
              Candidatures 30j
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>
              {funnelKpis.candidatures_30j}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 6, fontWeight: 600 }}>
                +{funnelKpis.new_this_week} cette sem.
              </span>
            </div>
          </div>
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>
              Show-up rate
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: funnelKpis.show_up_rate == null ? "rgba(255,255,255,0.4)" : (funnelKpis.show_up_rate >= 70 ? GREEN : "#ffb000") }}>
              {funnelKpis.show_up_rate == null ? "—" : `${funnelKpis.show_up_rate}%`}
            </div>
          </div>
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>
              Close rate
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: funnelKpis.close_rate == null ? "rgba(255,255,255,0.4)" : (funnelKpis.close_rate >= 30 ? GREEN : "#ffb000") }}>
              {funnelKpis.close_rate == null ? "—" : `${funnelKpis.close_rate}%`}
            </div>
          </div>
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>
              Signés 30j
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: GREEN }}>
              {funnelKpis.won_30j}
            </div>
          </div>
        </div>
      )}

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

  // ════════ Actions candidature coaching (set créneau / rejeter) ════════
  // Recherche la coaching_applications row par email. Si elle existe, on
  // affiche les actions admin (set call_scheduled_at, mark as rejected).
  const [application, setApplication] = useState(null);
  const [callDateInput, setCallDateInput] = useState("");
  const [applicationBusy, setApplicationBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("coaching_applications")
        .select("id,email,nom_prenom,call_scheduled_at,call_outcome,call_completed_at,preferred_slots")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const app = (data || [])[0] || null;
      setApplication(app);
      // Pré-remplir le datetime-local avec le créneau actuel si défini
      if (app?.call_scheduled_at) {
        const d = new Date(app.call_scheduled_at);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString().slice(0, 16);
        setCallDateInput(local);
      }
    })();
    return () => { cancelled = true; };
  }, [email]);

  async function setCallSchedule() {
    if (!application?.id || !callDateInput) return;
    setApplicationBusy(true);
    const iso = new Date(callDateInput).toISOString();
    const { error } = await supabase
      .from("coaching_applications")
      .update({ call_scheduled_at: iso })
      .eq("id", application.id);
    setApplicationBusy(false);
    if (error) {
      alert(`Erreur set créneau : ${error.message}`);
      return;
    }
    setApplication((a) => ({ ...a, call_scheduled_at: iso }));
    // Update CRM stage automatically
    if (stage !== "call_booked" && stage !== "signed") {
      saveStage("call_booked");
    }
    alert("Créneau confirmé. Reminders J-1 + H-2 envoyés auto par le cron.\n\n⚠ Pas de mail confirmation envoyé (créneau custom). Utilise les boutons préférés du prospect pour le mail auto.");
  }

  // Clic sur un créneau préféré → appelle l'endpoint qui :
  //   1. Update DB call_scheduled_at
  //   2. Envoie mail au candidat avec .ics + boutons calendrier + WhatsApp
  //   3. Envoie .ics à Rayan pour qu'il l'ajoute à son propre calendrier
  async function confirmSlot(slot) {
    if (!application?.id || !slot?.date || !slot?.time) return;
    setApplicationBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (!jwt) {
        alert("Session expirée. Reconnecte-toi.");
        setApplicationBusy(false);
        return;
      }
      const resp = await fetch("/api/confirm-coaching-call-slot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ application_id: application.id, slot }),
      });
      const json = await resp.json();
      setApplicationBusy(false);
      if (!resp.ok) {
        alert(`Erreur : ${json.error || "Unknown"}`);
        return;
      }
      setApplication((a) => ({ ...a, call_scheduled_at: json.call_scheduled_at }));
      if (stage !== "call_booked" && stage !== "signed") {
        saveStage("call_booked");
      }
      alert(`✓ Créneau confirmé : ${json.date_label}\n\n${json.email_sent ? "✓ Mail confirmation + .ics envoyé au candidat\n✓ .ics envoyé à toi pour ton calendrier" : "⚠ Mail n'a pas pu être envoyé (check logs)"}`);
    } catch (e) {
      setApplicationBusy(false);
      alert(`Erreur réseau : ${e.message}`);
    }
  }

  // Marque l'outcome du call post-meeting + update le CRM stage en conséquence.
  // closed_won → stage 'signed' (séquence onboarding existante prend le relais)
  // closed_lost → stage 'lost', déclenche le cron-coaching-call-followup J+1/J+3/J+7
  // no_show     → stage 'cold', à relancer manuellement
  // rescheduled → stage 'call_booked', Rayan re-set un créneau ensuite
  async function setCallOutcome(outcome) {
    if (!application?.id) return;
    const labels = {
      closed_won: "Marquer comme SIGNÉ ?",
      closed_lost: "Marquer comme LOST (relance J+1/J+3/J+7 auto envoyée) ?",
      no_show: "Marquer comme NO-SHOW ?",
      rescheduled: "Marquer comme REPORTÉ (annule call_scheduled_at) ?",
    };
    if (!confirm(labels[outcome] || `Marquer comme ${outcome} ?`)) return;
    setApplicationBusy(true);
    const update = {
      call_outcome: outcome,
      call_completed_at: new Date().toISOString(),
    };
    if (outcome === "rescheduled") {
      update.call_scheduled_at = null;
      update.call_completed_at = null;
    }
    const { error } = await supabase
      .from("coaching_applications")
      .update(update)
      .eq("id", application.id);
    setApplicationBusy(false);
    if (error) {
      alert(`Erreur : ${error.message}`);
      return;
    }
    setApplication((a) => ({ ...a, ...update }));
    // Auto stage CRM
    const nextStage = {
      closed_won: "signed",
      closed_lost: "lost",
      no_show: "cold",
      rescheduled: "call_booked",
    }[outcome];
    if (nextStage && nextStage !== stage) saveStage(nextStage);

    // Si signé → trigger le mail "tu as fait le bon choix" auto
    let wonEmailNote = "";
    if (outcome === "closed_won") {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData?.session?.access_token;
        if (jwt) {
          const resp = await fetch("/api/notify-coaching-won", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ application_id: application.id }),
          });
          const json = await resp.json();
          wonEmailNote = json.email_sent
            ? "\n\n✓ Mail 'tu as fait le bon choix' envoyé."
            : "\n\n⚠️ Mail won n'a pas pu être envoyé.";
        }
      } catch (e) {
        wonEmailNote = `\n\n⚠️ Erreur mail won : ${e.message}`;
      }
    }

    const followups = {
      closed_won: "Signé ! Pense à coller le lien Stripe Payment." + wonEmailNote,
      closed_lost: "Marqué lost. Séquence relance J+1/J+3/J+7 part automatiquement.",
      no_show: "Marqué no-show. Pense à le rappeler ou WhatsApp.",
      rescheduled: "Reporté. Re-set un nouveau créneau quand confirmé.",
    };
    alert(followups[outcome] || "Outcome enregistré.");
  }

  async function rejectApplication() {
    if (!application?.id) return;
    if (!confirm("Rejeter cette candidature ?\n\nUn email 'pas le bon match' sera envoyé avec le lien vers l'ebook 100J. Action non réversible (mais on peut juste ne rien renvoyer).")) return;
    setApplicationBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (!jwt) {
        alert("Session expirée. Reconnecte-toi.");
        setApplicationBusy(false);
        return;
      }
      const resp = await fetch("/api/reject-coaching-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ application_id: application.id }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        alert(`Erreur rejet : ${json.error || "Unknown"}`);
        setApplicationBusy(false);
        return;
      }
      setApplication((a) => ({ ...a, call_outcome: "rejected_by_us" }));
      saveStage("lost");
      alert(json.email_sent ? "Rejet envoyé + mail expédié." : "Rejet marqué, mais l'email a échoué (check Sentry).");
    } catch (e) {
      alert(`Erreur réseau : ${e.message}`);
    }
    setApplicationBusy(false);
  }

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

        {contact?.raw?.candidature && (() => {
          const cand = contact.raw.candidature;
          // Champs à masquer du rendu (déjà affichés ailleurs ou bruit DB)
          const HIDDEN = new Set(["id","email","nom_prenom","telephone","created_at","updated_at","status","call_scheduled_at","call_outcome","call_completed_at","preferred_slots","coach_id","rejected_at","rejected_reason"]);
          const LABELS = {
            objectif: "Objectif", niveau: "Niveau actuel", sport_principal: "Sport principal",
            disponibilite: "Dispo / semaine", budget_mensuel: "Budget mensuel",
            historique_blessures: "Blessures", motivation: "Motivation",
            instagram: "Instagram", ville: "Ville", age: "Âge",
            why: "Pourquoi", commitment: "Engagement",
          };
          const entries = Object.entries(cand).filter(([k,v]) => !HIDDEN.has(k) && v != null && v !== "");
          if (!entries.length) return null;
          return (
            <div style={{ marginBottom: 14, padding: "14px 16px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: GREEN, fontWeight: 700, marginBottom: 12 }}>Réponses candidature</div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px 12px", fontSize: 12, lineHeight: 1.5 }}>
                {entries.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <div style={{ color: "rgba(255,255,255,0.45)", textTransform: "lowercase", fontVariant: "small-caps", fontWeight: 600 }}>{LABELS[k] || k.replace(/_/g, " ")}</div>
                    <div style={{ color: "rgba(255,255,255,0.85)", wordBreak: "break-word" }}>{typeof v === "string" ? v : JSON.stringify(v)}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Actions candidature coaching — visible seulement si une coaching_applications existe */}
        {application && application.call_outcome !== "rejected_by_us" && (
          <div style={{ marginBottom: 18, padding: 14, background: BG, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: GREEN, marginBottom: 10, fontWeight: 700 }}>
              Actions candidature
            </div>

            {/* Set / update call_scheduled_at — 1 clic sur un créneau préféré
                envoie auto le mail confirmation + .ics au candidat + .ics à Rayan
                + marque le stage call_booked. Fallback : input datetime-local
                si aucun des 3 slots prospect ne convient. */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                Créneaux proposés par le prospect — clic = booké + mail confirmation envoyé :
              </div>
              {application.preferred_slots && Array.isArray(application.preferred_slots) && application.preferred_slots.length > 0 ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {application.preferred_slots.map((s, i) => {
                    const label = (() => {
                      try {
                        const d = new Date(s.date + "T" + s.time + ":00");
                        return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) + " · " + s.time;
                      } catch { return `${s.date} · ${s.time}`; }
                    })();
                    return (
                      <button
                        key={i}
                        onClick={() => confirmSlot(s)}
                        disabled={applicationBusy}
                        style={{
                          padding: "10px 14px", background: GREEN, color: "#000",
                          border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800,
                          letterSpacing: .3, cursor: applicationBusy ? "not-allowed" : "pointer",
                          opacity: applicationBusy ? 0.5 : 1, textTransform: "capitalize",
                        }}
                      >
                        Valider · {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontStyle: "italic", marginBottom: 10 }}>
                  Pas de créneaux proposés par le prospect. Utilise le picker ci-dessous.
                </div>
              )}

              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Ou créneau custom</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="datetime-local"
                  value={callDateInput}
                  onChange={(e) => setCallDateInput(e.target.value)}
                  style={{
                    flex: 1, minWidth: 200, padding: "8px 10px",
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                    borderRadius: 6, color: "#fff", fontSize: 12, fontFamily: "inherit",
                    colorScheme: "dark",
                  }}
                />
                <button
                  onClick={setCallSchedule}
                  disabled={!callDateInput || applicationBusy}
                  style={{
                    padding: "8px 14px", background: "rgba(255,255,255,0.08)", color: "#fff",
                    border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, fontWeight: 800,
                    letterSpacing: 0.5, textTransform: "uppercase",
                    cursor: callDateInput && !applicationBusy ? "pointer" : "not-allowed",
                    opacity: callDateInput && !applicationBusy ? 1 : 0.4,
                  }}
                >
                  {application.call_scheduled_at ? "Modifier" : "Confirmer"}
                </button>
              </div>
              {application.call_scheduled_at && (
                <div style={{ marginTop: 10, fontSize: 11, color: GREEN, fontWeight: 600 }}>
                  ✓ Créneau confirmé : {new Date(application.call_scheduled_at).toLocaleString("fr-FR")}
                </div>
              )}
            </div>

            {/* Post-call outcome buttons — visible une fois le créneau confirmé
                ET que l'outcome n'est pas encore défini (call pas encore eu lieu) */}
            {application.call_scheduled_at && (!application.call_outcome || application.call_outcome === "pending") && (
              <div style={{ marginBottom: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                  Une fois le call passé :
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button
                    onClick={() => setCallOutcome("closed_won")}
                    disabled={applicationBusy}
                    style={{
                      padding: "10px 12px",
                      background: `${GREEN}22`,
                      color: GREEN,
                      border: `1px solid ${GREEN}66`,
                      borderRadius: 6, fontSize: 11, fontWeight: 800,
                      letterSpacing: 0.5, textTransform: "uppercase",
                      cursor: applicationBusy ? "not-allowed" : "pointer",
                      opacity: applicationBusy ? 0.4 : 1,
                    }}
                  >
                    ✓ Signé
                  </button>
                  <button
                    onClick={() => setCallOutcome("closed_lost")}
                    disabled={applicationBusy}
                    style={{
                      padding: "10px 12px",
                      background: "rgba(255,176,0,0.1)",
                      color: "#ffb000",
                      border: "1px solid rgba(255,176,0,0.4)",
                      borderRadius: 6, fontSize: 11, fontWeight: 800,
                      letterSpacing: 0.5, textTransform: "uppercase",
                      cursor: applicationBusy ? "not-allowed" : "pointer",
                      opacity: applicationBusy ? 0.4 : 1,
                    }}
                  >
                    🟡 À relancer
                  </button>
                  <button
                    onClick={() => setCallOutcome("no_show")}
                    disabled={applicationBusy}
                    style={{
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      letterSpacing: 0.5, textTransform: "uppercase",
                      cursor: applicationBusy ? "not-allowed" : "pointer",
                      opacity: applicationBusy ? 0.4 : 1,
                    }}
                  >
                    ⏰ No-show
                  </button>
                  <button
                    onClick={() => setCallOutcome("rescheduled")}
                    disabled={applicationBusy}
                    style={{
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      letterSpacing: 0.5, textTransform: "uppercase",
                      cursor: applicationBusy ? "not-allowed" : "pointer",
                      opacity: applicationBusy ? 0.4 : 1,
                    }}
                  >
                    📅 Reporté
                  </button>
                </div>
              </div>
            )}

            {/* État courant si outcome déjà set (visible aussi après) */}
            {application.call_outcome && application.call_outcome !== "pending" && application.call_outcome !== "rejected_by_us" && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                {application.call_outcome === "closed_won" && <span style={{ color: GREEN, fontWeight: 700 }}>✓ Signé</span>}
                {application.call_outcome === "closed_lost" && <span style={{ color: "#ffb000", fontWeight: 700 }}>🟡 À relancer — séquence J+1/J+3/J+7 active</span>}
                {application.call_outcome === "no_show" && <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>⏰ No-show</span>}
                {application.call_outcome === "rescheduled" && <span>📅 Reporté</span>}
              </div>
            )}

            {/* Rejeter (= avant call ou indépendant de l'outcome) */}
            <button
              onClick={rejectApplication}
              disabled={applicationBusy}
              style={{
                padding: "8px 14px",
                background: "transparent",
                color: "#ff6b6b",
                border: "1px solid rgba(255,107,107,0.4)",
                borderRadius: 6, fontSize: 11, fontWeight: 700,
                letterSpacing: 0.5, textTransform: "uppercase",
                cursor: applicationBusy ? "not-allowed" : "pointer",
                opacity: applicationBusy ? 0.4 : 1,
              }}
            >
              🚫 Rejeter (envoyer mail "pas le bon match" + ebook)
            </button>
          </div>
        )}

        {application?.call_outcome === "rejected_by_us" && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 8, fontSize: 12, color: "#ff6b6b", fontWeight: 600 }}>
            🚫 Candidature rejetée — mail "pas le bon match" envoyé
          </div>
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
