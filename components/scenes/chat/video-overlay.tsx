"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Reproductor "atrapado" para TODOS los videos del chat (1 fascia, 2
 * mecanismo, 3 UGC…). Una vez que arranca, NO hay controles, pausa, mute,
 * fullscreen, skip ni salida: el usuario solo puede mirar hasta el final.
 *
 * El <video> vive SIEMPRE montado: el tap en la miniatura asigna src y llama
 * a play() de forma síncrona en el mismo handler (autoplay iOS). Sin barra de
 * scrubbing: la barra inferior es SOLO visual.
 */
export const VideoOverlay = forwardRef<
  HTMLVideoElement,
  {
    open: boolean;
    onEnded: () => void;
    onError: () => void;
    onPlaying?: () => void;
  }
>(function VideoOverlay({ open, onEnded, onError, onPlaying }, ref) {
  const innerRef = useRef<HTMLVideoElement | null>(null);
  const setRefs = (el: HTMLVideoElement | null) => {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref)
      (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  };

  const [progress, setProgress] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const endHoldRef = useRef<number | null>(null);

  // Reset entre videos.
  useEffect(() => {
    if (open) {
      setProgress(0);
      setBuffering(true);
    } else {
      setBarVisible(false);
      setProgress(0);
      setBuffering(false);
    }
    if (endHoldRef.current !== null) {
      window.clearTimeout(endHoldRef.current);
      endHoldRef.current = null;
    }
  }, [open]);

  // Bloqueo de teclado mientras el reproductor está abierto: espacio,
  // flechas, M (mute), F (fullscreen), K (play/pause).
  useEffect(() => {
    if (!open) return;
    const blocked = new Set([
      " ",
      "Spacebar",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "m",
      "M",
      "f",
      "F",
      "k",
      "K",
    ]);
    const onKey = (e: KeyboardEvent) => {
      if (blocked.has(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Si el navegador pausa el video (cambio de tab/foco), reanudar al volver.
  useEffect(() => {
    if (!open) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const v = innerRef.current;
      if (v && v.paused && !v.ended) {
        const p = v.play();
        if (p) p.catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [open]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (Number.isFinite(v.duration) && v.duration > 0) {
      setProgress(Math.min(100, (v.currentTime / v.duration) * 100));
    }
  };
  const handlePlay = () => {
    if (endHoldRef.current !== null) {
      window.clearTimeout(endHoldRef.current);
      endHoldRef.current = null;
    }
    setBarVisible(true);
  };
  const handlePlaying = () => {
    setBuffering(false);
    onPlaying?.();
  };
  const handleWaiting = () => setBuffering(true);
  const handleEnded = () => {
    setProgress(100);
    setBarVisible(true);
    if (endHoldRef.current !== null) window.clearTimeout(endHoldRef.current);
    endHoldRef.current = window.setTimeout(() => setBarVisible(false), 500);
    onEnded();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        style={{ pointerEvents: open ? "auto" : "none", touchAction: "none" }}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* inline-flex => el wrapper se ajusta al video real, así la barra
            queda pegada a su borde inferior y no al del viewport. */}
        <div className="relative inline-flex">
          <video
            ref={setRefs}
            className="block max-h-[90dvh] w-auto max-w-full select-none"
            playsInline
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
            onPlay={handlePlay}
            onPlaying={handlePlaying}
            onWaiting={handleWaiting}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={onError}
            style={{
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
              touchAction: "none",
            }}
          />

          {/* Barra de progreso sutil estilo iOS (SOLO visual) */}
          <AnimatePresence>
            {barVisible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="pointer-events-none absolute bottom-[5px] left-1/2 w-[92%] -translate-x-1/2"
                aria-hidden
              >
                <div
                  className="h-[2.5px] w-full overflow-hidden rounded-[2px]"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                >
                  <div
                    className="h-full rounded-[2px]"
                    style={{
                      width: `${progress}%`,
                      background: "rgba(255,255,255,0.85)",
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spinner mientras el video carga/buffera */}
          {open && buffering && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
