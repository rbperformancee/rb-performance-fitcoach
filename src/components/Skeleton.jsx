import React from "react";

/**
 * Skeleton — placeholder animee pour les etats de chargement.
 * Remplace les spinners par des formes grises animees qui donnent
 * l'illusion que le contenu est deja la.
 */

const shimmer = `
  @keyframes skShimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

const baseStyle = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)",
  backgroundSize: "800px 100%",
  animation: "skShimmer 1.4s linear infinite",
  borderRadius: 8,
};

/**
 * Bloc rectangulaire basique.
 * Props : width, height, radius, style
 */
export function SkeletonBox({ width = "100%", height = 20, radius = 8, style = {} }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ ...baseStyle, width, height, borderRadius: radius, ...style }} />
    </>
  );
}

/**
 * Cercle (avatar placeholder).
 */
export function SkeletonCircle({ size = 40, style = {} }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ ...baseStyle, width: size, height: size, borderRadius: "50%", ...style }} />
    </>
  );
}

/**
 * Ligne de texte (avec largeur variable aleatoire pour look naturel).
 */
export function SkeletonText({ lines = 1, width, lastWidth = "70%", style = {} }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...baseStyle,
              width: i === lines - 1 ? lastWidth : width || "100%",
              height: 12,
              borderRadius: 6,
            }}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Card complete (avatar + 2 lignes + petit badge).
 * Utile pour les listes de clients, feeds, etc.
 */
export function SkeletonCard({ height }) {
  return (
    <>
      <style>{shimmer}</style>
      <div
        style={{
          padding: 16,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: height || "auto",
        }}
      >
        <SkeletonCircle size={44} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ ...baseStyle, width: "60%", height: 14, borderRadius: 6 }} />
          <div style={{ ...baseStyle, width: "85%", height: 10, borderRadius: 5 }} />
        </div>
        <div style={{ ...baseStyle, width: 50, height: 22, borderRadius: 100 }} />
      </div>
    </>
  );
}

/**
 * Liste de cards skeleton (n copies).
 */
export function SkeletonList({ count = 5, gap = 10 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
