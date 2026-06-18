// src/components/FunnelVideoPlayer.jsx
//
// Player vidéo réutilisable pour le funnel RB Perform.
// — Affiche un placeholder propre si la vidéo n'est pas encore uploadée
// — Utilise <video> natif (lecture iOS, contrôles standards)
// — Supports lazy loading (preload="metadata")
// — Style cohérent : fond noir, border-radius 14, accent cyan

import React, { useState } from "react";
import { FUNNEL_VIDEOS, isVideoAvailable } from "./funnelVideos";

const GREEN = "#02d1ba";

export default function FunnelVideoPlayer({ videoKey, stepLabel, stepTitle }) {
  const video = FUNNEL_VIDEOS[videoKey];
  const available = isVideoAvailable(videoKey);
  const [playing, setPlaying] = useState(false);

  if (!video) return null;

  return (
    <div style={{
      marginBottom: 32,
      maxWidth: 640,
      marginLeft: "auto",
      marginRight: "auto",
      textAlign: "left",
    }}>
      {/* Step label */}
      {stepLabel && (
        <div style={{
          fontSize: 10,
          letterSpacing: "4px",
          textTransform: "uppercase",
          color: GREEN,
          fontWeight: 800,
          marginBottom: 8,
        }}>
          {stepLabel}
        </div>
      )}

      {/* Step title */}
      {stepTitle && (
        <h3 style={{
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "-0.5px",
          color: "#fff",
          margin: "0 0 14px",
          lineHeight: 1.2,
        }}>
          {stepTitle}
        </h3>
      )}

      {/* Player */}
      <div style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        background: "#000",
        border: `1px solid ${available ? "rgba(2,209,186,0.25)" : "rgba(255,255,255,0.08)"}`,
        aspectRatio: "16/9",
      }}>
        {available ? (
          <video
            src={video.src}
            poster={video.poster || undefined}
            controls
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
            }}
          />
        ) : (
          // Placeholder propre : pas de "vidéo cassée"
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #050505 0%, #0e1f1c 100%)",
            padding: "24px",
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(2,209,186,0.15)",
              border: `1px solid rgba(2,209,186,0.35)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}>
              <svg viewBox="0 0 24 24" fill={GREEN} style={{ width: 22, height: 22, marginLeft: 3 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
              {video.title}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              Vidéo disponible bientôt · {video.duration}
            </div>
          </div>
        )}
      </div>

      {/* Footer durée si dispo */}
      {available && (
        <div style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.45)",
          marginTop: 10,
          letterSpacing: "0.3px",
        }}>
          Durée · {video.duration}
        </div>
      )}
    </div>
  );
}
