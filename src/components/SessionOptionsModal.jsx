import React, { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, verticalListSortingStrategy,
  useSortable, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "./Toast";
import haptic from "../lib/haptic";
import { useT } from "../lib/i18n";

const G = "#02d1ba";
const ORANGE = "#f97316";
const RED = "#ef4444";

/**
 * SessionOptionsModal — 4 actions sur la séance courante
 *  - Reporter (1 jour)
 *  - Jour de repos (idem + log)
 *  - Remplacer un exercice
 *  - Réordonner les exercices
 *
 * Props:
 *   open
 *   onClose
 *   sessionName
 *   exercises     : array brut depuis le programme (avec overrides applique)
 *   weekIndex
 *   sessionIndex
 *   ovApi         : { bumpStartDate, substituteExercise, reorderExercises }
 *   onProgrammeMutated : callback apres reporter/repos pour reload le programme
 */
export default function SessionOptionsModal({
  open, onClose,
  sessionName, exercises = [],
  weekIndex, sessionIndex,
  ovApi, onProgrammeMutated,
}) {
  const t = useT();
  const [view, setView] = useState("home"); // home | replace | reorder
  const [confirmRest, setConfirmRest] = useState(false);
  const [confirmReport, setConfirmReport] = useState(false);

  if (!open) return null;

  const close = () => { setView("home"); setConfirmRest(false); setConfirmReport(false); onClose?.(); };

  const handleReport = async () => {
    haptic.selection();
    const ok = await ovApi.bumpStartDate({ logRest: false });
    if (ok) {
      toast.success(t("som.toast_reported"));
      onProgrammeMutated?.();
      close();
    } else {
      toast.error(t("som.toast_report_error"));
    }
  };

  const handleRest = async () => {
    haptic.selection();
    const ok = await ovApi.bumpStartDate({ logRest: true });
    if (ok) {
      toast.success(t("som.toast_rest_logged"));
      onProgrammeMutated?.();
      close();
    } else {
      toast.error(t("som.toast_rest_error"));
    }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={close} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={sheet}>
        {view === "home" && (
          <Home
            sessionName={sessionName}
            confirmReport={confirmReport} setConfirmReport={setConfirmReport}
            confirmRest={confirmRest} setConfirmRest={setConfirmRest}
            onReport={handleReport} onRest={handleRest}
            onReplace={() => setView("replace")}
            onReorder={() => setView("reorder")}
            onClose={close}
          />
        )}

        {view === "replace" && (
          <ReplaceView
            exercises={exercises}
            weekIndex={weekIndex} sessionIndex={sessionIndex}
            ovApi={ovApi}
            onBack={() => setView("home")}
            onDone={() => { close(); onProgrammeMutated?.(); }}
          />
        )}

        {view === "reorder" && (
          <ReorderView
            exercises={exercises}
            weekIndex={weekIndex} sessionIndex={sessionIndex}
            ovApi={ovApi}
            onBack={() => setView("home")}
            onDone={() => { close(); onProgrammeMutated?.(); }}
          />
        )}
      </div>
    </div>
  );
}

// ===== HOME (4 boutons) =====
function Home({ sessionName, confirmReport, setConfirmReport, confirmRest, setConfirmRest, onReport, onRest, onReplace, onReorder, onClose }) {
  const t = useT();
  return (
    <>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>{t("som.title")}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 18 }}>{sessionName || t("som.session_fallback")}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <ActionCard
          title={confirmReport ? t("som.btn_report_confirm") : t("som.btn_report")}
          sub={confirmReport ? t("som.btn_confirm_sub") : t("som.btn_report_sub")}
          accent={ORANGE}
          onClick={() => confirmReport ? onReport() : setConfirmReport(true)}
        />
        <ActionCard
          title={confirmRest ? t("som.btn_report_confirm") : t("som.btn_rest")}
          sub={confirmRest ? t("som.btn_confirm_sub") : t("som.btn_rest_sub")}
          accent={"#a78bfa"}
          onClick={() => confirmRest ? onRest() : setConfirmRest(true)}
        />
        <ActionCard
          title={t("som.btn_replace")}
          sub={t("som.btn_replace_sub")}
          accent={G}
          onClick={onReplace}
        />
        <ActionCard
          title={t("som.btn_reorder")}
          sub={t("som.btn_reorder_sub")}
          accent={"#fbbf24"}
          onClick={onReorder}
        />
      </div>

      <button onClick={onClose} style={ghostBtn}>{t("som.btn_cancel")}</button>
    </>
  );
}

function ActionCard({ title, sub, accent, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "16px 14px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderLeft: `3px solid ${accent}`,
      borderRadius: 14,
      cursor: "pointer", fontFamily: "inherit", color: "#fff", textAlign: "left",
      transition: "transform .15s, border-color .15s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: ".5px" }}>{sub}</div>
    </button>
  );
}

// ===== REPLACE VIEW =====
function ReplaceView({ exercises, weekIndex, sessionIndex, ovApi, onBack, onDone }) {
  const t = useT();
  const [step, setStep] = useState("pick"); // pick | edit
  const [pickedIdx, setPickedIdx] = useState(null);
  const [name, setName] = useState("");
  const [reps, setReps] = useState("");
  const [tempo, setTempo] = useState("");
  const [rest, setRest] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (idx) => {
    const ex = exercises[idx];
    setPickedIdx(idx);
    setName(ex?.name || "");
    setReps(ex?.rawReps || "");
    setTempo(ex?.tempo || "");
    setRest(ex?.rest || "");
    setStep("edit");
  };

  const save = async () => {
    if (pickedIdx === null) return;
    if (!name.trim()) { toast.error(t("som.toast_no_name")); return; }
    setSaving(true);
    const ok = await ovApi.substituteExercise({
      weekIndex, sessionIndex, originalIndex: pickedIdx,
      substitute: {
        name: name.trim(),
        rawReps: reps.trim() || null,
        tempo: tempo.trim() || null,
        rest: rest.trim() || null,
      },
    });
    setSaving(false);
    if (ok) {
      toast.success(t("som.toast_substituted"));
      onDone?.();
    } else toast.error(t("som.toast_substitute_error"));
  };

  const removeOverride = async () => {
    setSaving(true);
    const ok = await ovApi.substituteExercise({
      weekIndex, sessionIndex, originalIndex: pickedIdx, substitute: null,
    });
    setSaving(false);
    if (ok) { toast.success(t("som.toast_restored")); onDone?.(); }
  };

  return (
    <>
      <ViewHeader title={step === "pick" ? t("som.replace_pick_title") : t("som.replace_substitute_title")} onBack={step === "pick" ? onBack : () => setStep("pick")} />

      {step === "pick" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: "50vh", overflowY: "auto" }}>
          {exercises.map((ex, i) => (
            <button
              key={i}
              onClick={() => startEdit(i)}
              style={listItemStyle(ex._substituted)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ex.name || t("som.exercise_fallback")}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                  {[ex.rawReps, ex.tempo, ex.rest].filter(Boolean).join(" · ") || t("som.no_details")}
                </div>
              </div>
              {ex._substituted && (
                <span style={{ fontSize: 9, color: G, background: "rgba(2,209,186,0.1)", border: "1px solid rgba(2,209,186,0.25)", borderRadius: 100, padding: "3px 8px", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 700 }}>
                  {t("som.tag_modified")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {step === "edit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <FormField label={t("som.field_name")} value={name} onChange={setName} placeholder={t("som.field_name_placeholder")} />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><FormField label={t("som.field_reps")} value={reps} onChange={setReps} placeholder="4X8-10" /></div>
            <div style={{ flex: 1 }}><FormField label={t("som.field_tempo")} value={tempo} onChange={setTempo} placeholder="3010" /></div>
          </div>
          <FormField label={t("som.field_rest")} value={rest} onChange={setRest} placeholder={t("som.field_rest_placeholder")} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {exercises[pickedIdx]?._substituted && (
              <button onClick={removeOverride} disabled={saving} style={{ ...ghostBtn, color: RED, borderColor: "rgba(239,68,68,0.2)", flex: "0 0 auto" }}>
                {t("som.btn_restore")}
              </button>
            )}
            <button onClick={save} disabled={saving} style={primaryBtn}>
              {saving ? t("som.btn_saving") : t("som.btn_replace_save")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FormField({ label, value, onChange, placeholder, inputMode }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 6 }}>{label}</div>
      <input
        type="text" inputMode={inputMode}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
          fontFamily: "inherit", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ===== REORDER VIEW (drag-drop dnd-kit) =====
function ReorderView({ exercises, weekIndex, sessionIndex, ovApi, onBack, onDone }) {
  const t = useT();
  // On garde un mapping {originalIndex, ex}
  const [items, setItems] = useState(
    exercises.map((ex, i) => ({ id: `ex-${i}`, originalIndex: i, ex }))
  );
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id);
      const newIdx = prev.findIndex(i => i.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    haptic.selection();
  };

  const save = async () => {
    setSaving(true);
    const newOrder = items.map(it => it.originalIndex);
    const ok = await ovApi.reorderExercises({ weekIndex, sessionIndex, newOrder });
    setSaving(false);
    if (ok) { toast.success(t("som.toast_order_saved")); onDone?.(); }
    else toast.error(t("som.toast_order_error"));
  };

  const reset = async () => {
    setSaving(true);
    const ok = await ovApi.reorderExercises({ weekIndex, sessionIndex, newOrder: null });
    setSaving(false);
    if (ok) { toast.success(t("som.toast_default_restored")); onDone?.(); }
  };

  return (
    <>
      <ViewHeader title={t("som.reorder_title")} onBack={onBack} />

      <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 12, lineHeight: 1.5 }}>
        {t("som.reorder_hint")}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: "50vh", overflowY: "auto" }}>
            {items.map(it => (
              <SortableExerciseRow key={it.id} item={it} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={reset} disabled={saving} style={{ ...ghostBtn, flex: "0 0 auto" }}>
          {t("som.btn_default")}
        </button>
        <button onClick={save} disabled={saving} style={primaryBtn}>
          {saving ? t("som.btn_saving") : t("som.btn_save")}
        </button>
      </div>
    </>
  );
}

function SortableExerciseRow({ item }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${isDragging ? "rgba(2,209,186,0.3)" : "rgba(255,255,255,0.07)"}`,
    borderRadius: 12, padding: "12px 14px",
    display: "flex", alignItems: "center", gap: 10,
    color: "#fff", fontFamily: "inherit",
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
    boxShadow: isDragging ? "0 12px 28px rgba(0,0,0,0.4)" : "none",
    opacity: isDragging ? 0.92 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="3" r="1.4"/><circle cx="4" cy="8" r="1.4"/><circle cx="4" cy="13" r="1.4"/><circle cx="11" cy="3" r="1.4"/><circle cx="11" cy="8" r="1.4"/><circle cx="11" cy="13" r="1.4"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.ex.name || t("som.exercise_fallback")}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
          {[item.ex.rawReps, item.ex.tempo].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}

// ===== Helpers =====
function ViewHeader({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <button onClick={onBack} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 28, height: 28, color: "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "inherit", lineHeight: 1, fontSize: 14 }}>‹</button>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{title}</div>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, zIndex: 600,
  background: "rgba(0,0,0,0.78)", WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
};
const sheet = {
  width: "100%", maxWidth: 480,
  background: "#0a0c10",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px 24px 0 0",
  padding: "22px 20px calc(env(safe-area-inset-bottom,0px) + 22px)",
  fontFamily: "'Inter', -apple-system, sans-serif",
  color: "#fff",
  maxHeight: "82vh",
  overflowY: "auto",
};
const ghostBtn = {
  width: "100%", padding: "12px 16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12, color: "rgba(255,255,255,0.7)",
  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
const primaryBtn = {
  flex: 1, padding: "12px 16px",
  background: G, color: "#000",
  border: "none", borderRadius: 12,
  fontSize: 13, fontWeight: 800, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: "0.5px", textTransform: "uppercase",
};
function listItemStyle(modified) {
  return {
    width: "100%", textAlign: "left",
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${modified ? "rgba(2,209,186,0.25)" : "rgba(255,255,255,0.07)"}`,
    borderRadius: 12, padding: "12px 14px",
    display: "flex", alignItems: "center", gap: 10,
    color: "#fff", cursor: "pointer", fontFamily: "inherit",
  };
}
