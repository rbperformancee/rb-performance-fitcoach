// Brouillon / planifié / en cours / archivé — dérivés de (is_active, published_at)

export function getProgrammeStatus(p) {
  if (!p) return "none";
  if (!p.is_active) return p.published_at ? "archived" : "draft";
  if (!p.published_at) return "draft";
  return new Date(p.published_at) <= new Date() ? "live" : "scheduled";
}

export const isProgrammeDraft = (p) => getProgrammeStatus(p) === "draft";
export const isProgrammeScheduled = (p) => getProgrammeStatus(p) === "scheduled";
export const isProgrammeLive = (p) => getProgrammeStatus(p) === "live";

export function formatScheduledDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
