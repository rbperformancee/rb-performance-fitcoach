import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

/**
 * CoachReferralSection — système de parrainage coach→coach (migration 065).
 *
 * Le coach a un referral_code unique. Il le partage. Quand un autre coach
 * s'inscrit avec ce code (param ?ref=CODE sur /signup ou /landing), une row
 * coach_referrals est créée. Reward : 1 mois offert pour les 2 (granted
 * après 30j actif via cron — TODO post-launch).
 *
 * UI :
 *   - Big card avec code (généré lazy)
 *   - Bouton "Copier le lien"
 *   - Liste des parrainages réussis (referred coach name + status)
 */
export default function CoachReferralSection({ coachData, isDemo = false }) {
  const [code, setCode] = useState(coachData?.referral_code || "");
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!coachData?.id) return;
    let cancelled = false;
    (async () => {
      // Charge parrainages où ce coach est referrer
      const { data } = await supabase
        .from("coach_referrals")
        .select("id, referred_coach_id, status, created_at, granted_at")
        .eq("referrer_coach_id", coachData.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setReferrals(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [coachData?.id]);

  async function generateCode() {
    if (isDemo) { toast.info("Indispo en démo"); return; }
    haptic.medium();
    setGenerating(true);
    // Code = prefix nom + 4 chars random base36 (ex "RAYAN-K3F2")
    const firstName = (coachData?.full_name || "RB").split(" ")[0].toUpperCase().slice(0, 8).replace(/[^A-Z]/g, "");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const newCode = `${firstName || "RB"}-${rand}`;
    try {
      const { error } = await supabase
        .from("coaches")
        .update({ referral_code: newCode })
        .eq("id", coachData.id);
      if (error) throw error;
      setCode(newCode);
      toast.success("Code de parrainage généré");
    } catch (e) {
      // Code collision — retry once
      if (String(e.message || "").includes("unique")) {
        const rand2 = Math.random().toString(36).slice(2, 6).toUpperCase();
        const fallbackCode = `${firstName || "RB"}-${rand2}`;
        await supabase.from("coaches").update({ referral_code: fallbackCode }).eq("id", coachData.id);
        setCode(fallbackCode);
        toast.success("Code généré");
      } else {
        toast.error("Erreur génération code");
      }
    }
    setGenerating(false);
  }

  async function copyLink() {
    if (!code) return;
    const link = `https://rbperform.app/?ref=${encodeURIComponent(code)}`;
    haptic.light();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier");
    }
  }

  const grantedCount = referrals.filter((r) => r.status === "granted").length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: G, marginBottom: 6 }}>
          Parrainage coach
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
          Tu connais un coach qui galère sur Trainerize ? Partage ton lien — vous obtenez chacun <strong style={{ color: "#fff" }}>1 mois offert</strong> dès qu'il complète son onboarding.
        </div>
      </div>

      {/* Big card code */}
      <div style={{
        padding: "22px 24px",
        background: `linear-gradient(135deg, ${G}10, transparent 70%)`,
        border: `1px solid ${G}30`,
        borderRadius: 18,
        marginBottom: 20,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, background: `radial-gradient(circle, ${G}15 0%, transparent 70%)`, pointerEvents: "none" }} />
        {code ? (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
              Ton code
            </div>
            <div style={{
              fontSize: 28, fontWeight: 900, color: "#fff",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "1px", lineHeight: 1,
              marginBottom: 14,
            }}>
              {code}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={copyLink}
                style={{
                  padding: "10px 16px",
                  background: copied ? "#34d399" : G, color: "#000",
                  border: "none", borderRadius: 10,
                  fontSize: 11, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: ".05em", textTransform: "uppercase",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                {copied ? "✓ Copié" : "Copier le lien"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Salut, j'utilise RB Perform pour coacher mes clients à distance — bien plus simple que Trainerize. Tu peux essayer avec mon code : https://rbperform.app/?ref=${code}`)}`}
                target="_blank" rel="noreferrer"
                style={{
                  padding: "10px 16px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11, fontWeight: 700,
                  fontFamily: "inherit", textDecoration: "none",
                  letterSpacing: ".05em", textTransform: "uppercase",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                Partager WhatsApp
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 14 }}>
              Génère ton code unique pour commencer à parrainer.
            </div>
            <button
              type="button"
              onClick={generateCode}
              disabled={generating}
              style={{
                padding: "12px 20px",
                background: G, color: "#000",
                border: "none", borderRadius: 10,
                fontSize: 12, fontWeight: 800,
                cursor: generating ? "wait" : "pointer",
                fontFamily: "inherit",
                letterSpacing: ".05em", textTransform: "uppercase",
              }}
            >
              {generating ? "Génération…" : "Générer mon code"}
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      {referrals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 200, color: "#34d399", letterSpacing: "-1px", lineHeight: 1 }}>{grantedCount}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 6, fontWeight: 700 }}>Mois offerts</div>
          </div>
          <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 200, color: "#fbbf24", letterSpacing: "-1px", lineHeight: 1 }}>{pendingCount}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 6, fontWeight: 700 }}>En attente</div>
          </div>
        </div>
      )}

      {/* Comment ça marche */}
      <div style={{ padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
          Comment ça marche
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
          <li>Tu partages ton lien à un coach qui pourrait être intéressé</li>
          <li>Il s'inscrit via ton lien (le code est tracké dans l'URL)</li>
          <li>Dès qu'il termine son onboarding, vous recevez chacun 1 mois offert</li>
        </ol>
      </div>
    </div>
  );
}
