import React, { useState } from "react";

/**
 * VoiceMessage — lecteur audio d'un message vocal du chat, avec affichage
 * de la durée. `preload="metadata"` permet au navigateur de connaître la
 * durée sans télécharger tout le fichier ; on l'affiche dès que dispo.
 */
export default function VoiceMessage({ src }) {
  const [dur, setDur] = useState(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <audio
        controls
        preload="metadata"
        src={src}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setDur(d);
        }}
        style={{ display: "block", width: 210, maxWidth: "100%", height: 38 }}
      />
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>
        {dur != null ? fmtDur(dur) : "··"}
      </span>
    </div>
  );
}

function fmtDur(s) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
