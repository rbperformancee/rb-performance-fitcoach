import React, { useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";

const G = "#02d1ba";

/**
 * ProgrammeDuplicateModal
 * Duplique un programme vers 1+ clients en un clic.
 *
 * Workflow :
 *  1. fetch html_content du programme source (pas en cache dans la liste)
 *  2. pour chaque client cible :
 *       - archive le programme actif
 *       - insert nouveau programme avec html + nom + is_active=true
 *
 * Props :
 *   programme: { id, programme_name, client_id }
 *   clients: liste des clients du coach
 *   onClose: () => void
 *   onSuccess?: (count) => void
 */
export default function ProgrammeDuplicateModal({ programme, clients = [], onClose, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [notifyClients, setNotifyClients] = useState(true);

  const sourceClientId = programme?.client_id;
  const eligibleClients = useMemo(
    () => clients.filter(c => c.id !== sourceClientId),
    [clients, sourceClientId]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligibleClients;
    return eligibleClients.filter(c =>
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [eligibleClients, search]);

  const toggle = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selectionne au moins un client");
      return;
    }
    setRunning(true);
    setProgress({ done: 0, total: selectedIds.size });

    // 1. fetch the source HTML
    const { data: srcProg, error: fetchErr } = await supabase
      .from("programmes")
      .select("html_content, programme_name")
      .eq("id", programme.id)
      .single();

    if (fetchErr || !srcProg) {
      toast.error("Impossible de charger le programme source");
      setRunning(false);
      return;
    }

    const finalName = customName.trim() || srcProg.programme_name;
    let successCount = 0;
    const errors = [];
    const targets = [...selectedIds];
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    for (let i = 0; i < targets.length; i++) {
      const clientId = targets[i];
      const clientObj = clients.find(c => c.id === clientId);
      try {
        // archive l'actif
        await supabase.from("programmes")
          .update({ is_active: false })
          .eq("client_id", clientId)
          .eq("is_active", true);

        // insere le nouveau
        const { error: insErr } = await supabase.from("programmes").insert({
          client_id: clientId,
          html_content: srcProg.html_content,
          programme_name: finalName,
          is_active: true,
          uploaded_by: "duplication",
        });
        if (insErr) {
          errors.push({ clientId, message: insErr.message });
        } else {
          successCount++;
          // notifications best-effort (n'echoue pas la duplication si KO)
          if (notifyClients && clientObj) {
            // push
            if (supabaseUrl && anonKey) {
              fetch(`${supabaseUrl}/functions/v1/send-push`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: anonKey },
                body: JSON.stringify({
                  client_id: clientId,
                  title: "RB PERFORM",
                  body: "Ton programme est pret. C'est parti !",
                }),
              }).catch(() => {});
            }
            // email
            if (clientObj.email) {
              fetch("/api/send-welcome", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: clientObj.email,
                  full_name: clientObj.full_name,
                  type: "programme_ready",
                  programme_name: finalName,
                }),
              }).catch(() => {});
            }
          }
        }
      } catch (e) {
        errors.push({ clientId, message: e?.message || "erreur inconnue" });
      }
      setProgress({ done: i + 1, total: targets.length });
    }

    if (successCount > 0) {
      toast.success(`Programme duplique pour ${successCount} client${successCount > 1 ? "s" : ""}`);
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} echec(s) — verifie la console`);
      console.error("Duplication errors:", errors);
    }
    setRunning(false);
    if (onSuccess) onSuccess(successCount);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !running) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "max(6vh, 56px) 16px 16px",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        color: "#fff",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Dupliquer le programme"
    >
      <div style={{
        width: "100%", maxWidth: 500,
        maxHeight: "calc(100dvh - 80px)",
        background: "#0b0d0f",
        border: ".5px solid rgba(2,209,186,.2)",
        borderRadius: 18,
        boxShadow: "0 30px 80px rgba(0,0,0,.7)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 14px", borderBottom: ".5px solid rgba(255,255,255,.05)" }}>
          <div style={{ fontSize: 10, color: `${G}99`, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>Dupliquer le programme</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            {programme?.programme_name || "Programme"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
            Selectionne les clients qui recevront une copie active de ce programme.
          </div>
        </div>

        {/* Renommer (optionnel) */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Renommer la copie (optionnel)</div>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={programme?.programme_name || "Nom du programme"}
            disabled={running}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "#fff", fontSize: 13, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Toggle notifier les clients */}
        <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => !running && setNotifyClients(v => !v)}
            disabled={running}
            style={{
              width: 36, height: 20, borderRadius: 100,
              background: notifyClients ? G : "rgba(255,255,255,0.1)",
              border: "none", cursor: running ? "wait" : "pointer", position: "relative",
              transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <div style={{
              position: "absolute", top: 2, left: notifyClients ? 18 : 2,
              width: 16, height: 16, background: "#fff", borderRadius: "50%",
              transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>Prevenir les clients</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Push + email "programme pret"</div>
          </div>
        </div>

        {/* Search + select all */}
        <div style={{ padding: "14px 20px 8px", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            disabled={running}
            style={{
              flex: 1, padding: "10px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "#fff", fontSize: 13, outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={toggleAll}
            disabled={running || filtered.length === 0}
            style={{
              padding: "10px 14px", fontSize: 11, fontWeight: 700,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "rgba(255,255,255,0.7)", cursor: "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap",
              opacity: running || filtered.length === 0 ? 0.4 : 1,
            }}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? "Aucun" : "Tous"}
          </button>
        </div>

        {/* Liste clients */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "8px 20px 20px",
          WebkitOverflowScrolling: "touch",
        }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              {eligibleClients.length === 0
                ? "Aucun autre client disponible"
                : "Aucun client ne correspond"}
            </div>
          )}
          {filtered.map(c => {
            const checked = selectedIds.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => !running && toggle(c.id)}
                disabled={running}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  marginBottom: 6,
                  background: checked ? "rgba(2,209,186,.08)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${checked ? "rgba(2,209,186,.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12,
                  cursor: running ? "wait" : "pointer",
                  fontFamily: "inherit", color: "#fff",
                  textAlign: "left",
                  transition: "background .15s, border-color .15s",
                }}
              >
                <div style={{
                  width: 20, height: 20,
                  borderRadius: 6,
                  background: checked ? G : "transparent",
                  border: `1.5px solid ${checked ? G : "rgba(255,255,255,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {checked && <span style={{ color: "#000", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.full_name || c.email}
                  </div>
                  {c.full_name && c.email && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.email}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px 20px", borderTop: ".5px solid rgba(255,255,255,.05)", display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={running}
            style={{
              flex: "0 0 auto", padding: "12px 18px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, color: "rgba(255,255,255,0.7)",
              fontSize: 13, fontWeight: 600, cursor: running ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >Annuler</button>
          <button
            onClick={handleConfirm}
            disabled={running || selectedIds.size === 0}
            style={{
              flex: 1, padding: "12px 18px",
              background: (running || selectedIds.size === 0) ? "rgba(255,255,255,0.04)" : G,
              color: (running || selectedIds.size === 0) ? "rgba(255,255,255,0.25)" : "#000",
              border: "none", borderRadius: 12,
              fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase",
              cursor: (running || selectedIds.size === 0) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: (running || selectedIds.size === 0) ? "none" : `0 8px 24px rgba(2,209,186,0.3)`,
            }}
          >
            {running
              ? `Duplication... ${progress.done}/${progress.total}`
              : `Dupliquer pour ${selectedIds.size} client${selectedIds.size > 1 ? "s" : ""}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
