import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * HeroBackground — fond WebGL anime pour la hero landing.
 *
 * Scenes :
 *   1. Grille 3D de 1200 points qui "respire" (oscillation sin en Z)
 *   2. 80 particules teal flottantes (mouvement brownien + pulse)
 *   3. Lignes de connexion dynamiques entre particules proches (<120)
 *   4. Glow sprite central (texture radiale) en rotation lente
 *   + Parallax camera sur mouvement souris
 *
 * Optimisations :
 *   - IntersectionObserver : stop le RAF quand le canvas est hors viewport
 *   - devicePixelRatio clampe a 2 (eviter retina x3 qui tue les perfs)
 *   - Resize handler debounce par RAF
 *   - Nettoyage complet a l'unmount (geometry/material/texture dispose)
 */
const TEAL = 0x00c9a7;
const GRID_COUNT_X = 40;
const GRID_COUNT_Y = 30;
const GRID_SPACING = 0.6;
const PARTICLE_COUNT = 80;
const CONNECTION_DIST = 2.5;
const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;

function makeGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(0,201,167,0.6)");
  g.addColorStop(0.5, "rgba(0,201,167,0.15)");
  g.addColorStop(1, "rgba(0,201,167,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function HeroBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ============ RENDERER / SCENE / CAMERA ============
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 14;

    // ============ SCENE 1 : GRILLE DE POINTS ============
    const gridTotal = GRID_COUNT_X * GRID_COUNT_Y;
    const gridPositions = new Float32Array(gridTotal * 3);
    const gridBase = new Float32Array(gridTotal * 2); // (x, y) de base pour oscillation
    let idx = 0;
    for (let i = 0; i < GRID_COUNT_X; i++) {
      for (let j = 0; j < GRID_COUNT_Y; j++) {
        const x = (i - GRID_COUNT_X / 2) * GRID_SPACING;
        const y = (j - GRID_COUNT_Y / 2) * GRID_SPACING;
        gridPositions[idx * 3 + 0] = x;
        gridPositions[idx * 3 + 1] = y;
        gridPositions[idx * 3 + 2] = 0;
        gridBase[idx * 2 + 0] = x;
        gridBase[idx * 2 + 1] = y;
        idx++;
      }
    }
    const gridGeom = new THREE.BufferGeometry();
    gridGeom.setAttribute("position", new THREE.BufferAttribute(gridPositions, 3));
    const gridMat = new THREE.PointsMaterial({
      color: TEAL,
      size: 0.055,
      transparent: true,
      opacity: 0.15,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const gridPoints = new THREE.Points(gridGeom, gridMat);
    scene.add(gridPoints);

    // ============ SCENE 2 : PARTICULES FLOTTANTES ============
    const partPositions = new Float32Array(PARTICLE_COUNT * 3);
    const partVelocities = new Float32Array(PARTICLE_COUNT * 3);
    const partPhase = new Float32Array(PARTICLE_COUNT); // pour pulse
    const partPulsing = new Uint8Array(PARTICLE_COUNT); // 1 si particule pulse
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      partPositions[i * 3 + 0] = (Math.random() - 0.5) * 24;
      partPositions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      partPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      // Vitesses tres faibles (mouvement brownien lent)
      partVelocities[i * 3 + 0] = (Math.random() - 0.5) * 0.004;
      partVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.004;
      partVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      partPhase[i] = Math.random() * Math.PI * 2;
      partPulsing[i] = Math.random() < 0.35 ? 1 : 0;
    }
    const partGeom = new THREE.BufferGeometry();
    partGeom.setAttribute("position", new THREE.BufferAttribute(partPositions, 3));
    const partMat = new THREE.PointsMaterial({
      color: TEAL,
      size: 0.14,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(partGeom, partMat);
    scene.add(particles);

    // ============ SCENE 3 : LIGNES DE CONNEXION ============
    // Buffer suffisamment grand pour toutes les paires possibles
    const maxPairs = (PARTICLE_COUNT * (PARTICLE_COUNT - 1)) / 2;
    const linePositions = new Float32Array(maxPairs * 2 * 3); // 2 vertices par paire
    const lineColors = new Float32Array(maxPairs * 2 * 3);
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1, // l'alpha est porte par les couleurs
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const connections = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(connections);

    // ============ SCENE 4 : GLOW CENTRAL ============
    const glowTex = makeGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(22, 11, 1);
    glow.position.set(0, 3, -2);
    scene.add(glow);

    // ============ MOUSE PARALLAX ============
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMouseMove, { passive: true });

    // ============ RESIZE ============
    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
    };
    window.addEventListener("resize", onResize);

    // ============ INTERSECTION OBSERVER ============
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible = entry.isIntersecting;
          if (visible && !rafId) loop();
        });
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    // ============ RESPECT prefers-reduced-motion ============
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ============ ANIMATION LOOP ============
    let rafId = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      if (!visible) { rafId = 0; return; }
      const dt = clock.getDelta();
      const t = clock.elapsedTime;

      // Scene 1 : oscillation grille
      if (!reduceMotion) {
        const posAttr = gridGeom.attributes.position;
        const arr = posAttr.array;
        for (let i = 0; i < gridTotal; i++) {
          const bx = gridBase[i * 2 + 0];
          const by = gridBase[i * 2 + 1];
          // z = sin(time * 0.4 + x * 0.3 + y * 0.2) * 0.5  (echelle unite three)
          arr[i * 3 + 2] = Math.sin(t * 0.4 + bx * 0.3 + by * 0.2) * 0.5;
        }
        posAttr.needsUpdate = true;
      }

      // Scene 2 : brownien + pulse
      const pAttr = partGeom.attributes.position;
      const pArr = pAttr.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (!reduceMotion) {
          pArr[i * 3 + 0] += partVelocities[i * 3 + 0];
          pArr[i * 3 + 1] += partVelocities[i * 3 + 1];
          pArr[i * 3 + 2] += partVelocities[i * 3 + 2];
          // Rebond soft sur les bords
          if (pArr[i * 3 + 0] > 12 || pArr[i * 3 + 0] < -12) partVelocities[i * 3 + 0] *= -1;
          if (pArr[i * 3 + 1] > 8 || pArr[i * 3 + 1] < -8) partVelocities[i * 3 + 1] *= -1;
          if (pArr[i * 3 + 2] > 2 || pArr[i * 3 + 2] < -2) partVelocities[i * 3 + 2] *= -1;
        }
      }
      pAttr.needsUpdate = true;

      // Scene 3 : lignes de connexion
      let vIdx = 0;
      const lArr = linePositions;
      const cArr = lineColors;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ax = pArr[i * 3 + 0];
        const ay = pArr[i * 3 + 1];
        const az = pArr[i * 3 + 2];
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const bx = pArr[j * 3 + 0];
          const by = pArr[j * 3 + 1];
          const bz = pArr[j * 3 + 2];
          const dx = ax - bx;
          const dy = ay - by;
          const dz = az - bz;
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < CONNECTION_DIST_SQ) {
            // alpha = 0.25 au plus proche, 0 a la limite
            const d = Math.sqrt(dSq);
            const a = 0.25 * (1 - d / CONNECTION_DIST);
            lArr[vIdx * 3 + 0] = ax;
            lArr[vIdx * 3 + 1] = ay;
            lArr[vIdx * 3 + 2] = az;
            // Couleur teal x alpha (approx alpha via intensite RGB, blending additif)
            cArr[vIdx * 3 + 0] = 0 * a;
            cArr[vIdx * 3 + 1] = 0.788 * a; // 0xC9/255
            cArr[vIdx * 3 + 2] = 0.655 * a; // 0xA7/255
            vIdx++;
            lArr[vIdx * 3 + 0] = bx;
            lArr[vIdx * 3 + 1] = by;
            lArr[vIdx * 3 + 2] = bz;
            cArr[vIdx * 3 + 0] = 0 * a;
            cArr[vIdx * 3 + 1] = 0.788 * a;
            cArr[vIdx * 3 + 2] = 0.655 * a;
            vIdx++;
          }
        }
      }
      lineGeom.setDrawRange(0, vIdx);
      lineGeom.attributes.position.needsUpdate = true;
      lineGeom.attributes.color.needsUpdate = true;

      // Scene 4 : rotation lente glow
      if (!reduceMotion) {
        glow.material.rotation += 0.0003;
      }

      // Parallax souris
      if (!reduceMotion) {
        camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.03;
        camera.position.y += (mouse.y * 0.3 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    };
    loop();

    // ============ CLEANUP ============
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMouseMove);
      io.disconnect();
      gridGeom.dispose();
      gridMat.dispose();
      partGeom.dispose();
      partMat.dispose();
      lineGeom.dispose();
      lineMat.dispose();
      glowTex.dispose();
      glowMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.8,
        pointerEvents: "none",
      }}
    />
  );
}
