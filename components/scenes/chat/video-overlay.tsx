"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { DRA } from "@/content/chat-script";

/**
 * Reproductor fullscreen para TODOS los videos del chat (1 fascia, 2
 * mecanismo, 3 UGC…). El elemento <video> vive SIEMPRE montado: el tap en
 * la miniatura asigna src y llama a play() de forma síncrona en el mismo
 * handler (autoplay iOS). Sin controles nativos: solo el video y una barra
 * de progreso muy sutil estilo iOS pegada al borde inferior.
 */
export const VideoOverlay = forwardRef<
  HTMLVideoElement,
  {
    open: boolean;
    onClose: () => void;
    onEnded: () => void;
    onError: () => void;
  }
>(function VideoOverlay({ open, onClose, onEnded, onError }, ref) {
  const [progress, setProgress] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const endHoldRef = useRef<number | null>(null);

  // Reset entre videos: al abrir, progreso a 0 (la barra la enciende onPlay);
  // al cerrar, ocultar y limpiar.
  useEffect(() => {
    if (open) {
      setProgress(0);
    } else {
      setBarVisible(false);
      setProgress(0);
    }
    if (endHoldRef.current !== null) {
      window.clearTimeout(endHoldRef.current);
      endHoldRef.current = null;
    }
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

  const handleEnded = () => {
    // La barra se queda al 100% durante 0.5s y luego desaparece con fade.
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
        className="fixed inset-0 z-50 flex flex-col bg-black"
        style={{ pointerEvents: open ? "auto" : "none" }}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            aria-label="Cerrar video"
            className="rounded-full bg-white/10 p-2 text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <span className="font-dm text-sm text-white/70">{DRA.name}</span>
          <span className="w-10" />
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          {/* inline-flex => el wrapper se ajusta al tamaño real del video,
              así la barra queda pegada al borde inferior del contenido y no
              al del viewport. max-h evita que un video vertical desborde. */}
          <div className="relative inline-flex">
            <video
              ref={ref}
              className="block max-h-[calc(100dvh-72px)] w-auto max-w-full"
              playsInline
              onPlay={handlePlay}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onError={onError}
            />

            {/* Barra de progreso sutil estilo iOS */}
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
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
