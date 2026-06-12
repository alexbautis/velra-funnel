"use client";

import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { DRA } from "@/content/chat-script";

/**
 * Reproductor fullscreen para los videos del chat.
 * El elemento <video> vive SIEMPRE montado: el tap en la miniatura asigna
 * src y llama a play() de forma síncrona en el mismo handler (autoplay iOS).
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
        <div className="flex flex-1 items-center justify-center">
          <video
            ref={ref}
            className="max-h-full w-full"
            playsInline
            controls
            controlsList="nodownload noplaybackrate"
            onEnded={onEnded}
            onError={onError}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
