// src/components/FunnelVideoPlayerCompact.jsx
//
// Variante COMPACTE du FunnelVideoPlayer — pour la grid des piliers
// (équivalent breakout videos Jonas). Cadrage 16:9 mais plus petit,
// titre inline sous la vidéo, design dense.

import React from "react";
import { FUNNEL_VIDEOS, isVideoAvailable } from "./funnelVideos";

const GREEN = "#02d1ba";

export default function FunnelVideoPlayerCompact({ videoKey, num, title }) {
  const video = FUNNEL_VIDEOS[videoKey];
  const available = isVideoAvailable(videoKey);

  if (!video) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      overflow: "hidden",
      textAlign: "left",
      transition: "transform 0.2s ease, border-color 0.2s ease",
    }}
    onMouseOver={(e) => { e.currentTarget.style.borderColor = "rgba(2,209,186,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = ""; }}
    >
      {/* Vidéo / placeholder */}
      <div style={{
        position: "relative",
        aspectRatio: "16/9",
        background: "#000",
        overflow: "hidden",
      }}>
        {available ? (
          <video
            src={video.src}
            poster={video.poster || undefined}
            controls
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #050505 0%, #0e1f1c 100%)",
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(2,209,186,0.12)",
              border: `1px solid rgba(2,209,186,0.3)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" fill={GREEN} style={{ width: 16, height: 16, marginLeft: 2 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Footer titre */}
      <div style={{ padding: "10px 12px" }}>
        {num && (
          <div style={{
            fontSize: 10,
            letterSpacing: "2px",
            color: GREEN,
            fontWeight: 800,
            marginBottom: 4,
          }}>
            PILIER {num} · {video.duration}
          </div>
        )}
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          lineHeight: 1.3,
        }}>
          {title || video.title}
        </div>
      </div>
    </div>
  );
}
