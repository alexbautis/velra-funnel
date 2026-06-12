"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { track } from "@/lib/tracking";
import { useFunnel } from "@/lib/funnel-state";
import { ASSETS } from "@/lib/assets";
import { preUnlockAll } from "@/lib/sfx";

/** ESCENA 1 — Landing mínima */
export default function LandingPage() {
  const router = useRouter();
  const { captureUtms, markSceneReached } = useFunnel();
  const [bgLoaded, setBgLoaded] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    captureUtms();
    if (!viewTracked.current) {
      viewTracked.current = true;
      track("landing_view");
    }
    // Fondo opcional: solo se muestra si el asset existe en Sirv
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.src = ASSETS.landing_bg;
  }, [captureUtms]);

  const handleEnter = () => {
    preUnlockAll(); // marca unlocked=true; cuando los SFX se creen en /llamada se pre-activan en iOS
    track("landing_enter");
    markSceneReached("llamada");
    router.push("/llamada");
  };

  const handleSkipToSales = () => {
    markSceneReached("velra");
    router.push("/velra");
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-ink px-6 py-10 text-center">
      {bgLoaded ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${ASSETS.landing_bg})` }}
          aria-hidden
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-ink"
        aria-hidden
      />

      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <span className="font-bebas text-xl tracking-[0.35em] text-white/70">
          VELRA
        </span>
      </motion.header>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="text-balance font-poppins text-[26px] font-semibold leading-snug text-white"
        >
          Lo que nadie te explicó sobre por qué la celulitis resiste todo lo
          que has intentado
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.6 }}
          className="font-dm text-sm text-white/60"
        >
          sube el volumen 🔊
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleEnter}
          className="w-full rounded-full bg-teal px-10 py-4 font-poppins text-lg font-semibold tracking-wide text-ink shadow-[0_0_40px_rgba(54,207,195,0.35)] transition-colors hover:bg-teal-dark"
        >
          ENTRAR
        </motion.button>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="relative z-10"
      >
        <button
          onClick={handleSkipToSales}
          className="font-dm text-xs text-white/35 underline underline-offset-4"
        >
          Ya pasé por la experiencia
        </button>
      </motion.footer>
    </main>
  );
}
