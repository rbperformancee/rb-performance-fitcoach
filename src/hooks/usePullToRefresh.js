import { useEffect, useRef, useState } from "react";

/**
 * usePullToRefresh — gesture mobile : tirer vers le bas depuis le top pour rafraichir.
 * Retourne { pulling, progress (0..1), triggered } + ref a attacher au container.
 *
 * Usage :
 *   const { bind, progress, refreshing } = usePullToRefresh({ onRefresh: loadClients });
 *   <div {...bind}> ... </div>
 */
export default function usePullToRefresh({ onRefresh, threshold = 70, disabled = false } = {}) {
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    if (disabled) return undefined;
    const onTouchStart = (e) => {
      // Only trigger if we are at the top of the page
      if (window.scrollY > 2) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    };
    const onTouchMove = (e) => {
      if (!active.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPulling(false); setProgress(0); return; }
      // Resistance : divise par 2 pour donner un feeling elastique
      const adjusted = dy / 2;
      const p = Math.min(1, adjusted / threshold);
      setPulling(true);
      setProgress(p);
    };
    const onTouchEnd = async () => {
      if (!active.current) return;
      active.current = false;
      if (progress >= 1 && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh?.();
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPulling(false);
            setProgress(0);
          }, 300);
        }
      } else {
        setPulling(false);
        setProgress(0);
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, threshold, disabled, progress, refreshing]);

  return { pulling, progress, refreshing };
}
