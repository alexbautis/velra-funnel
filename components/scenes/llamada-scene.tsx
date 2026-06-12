"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Phone } from "lucide-react";
import { track } from "@/lib/tracking";
import { useFunnel } from "@/lib/funnel-state";
import { ASSETS } from "@/lib/assets";
import { createSfx, disposeSfx, type Sfx } from "@/lib/sfx";
import { formatTime } from "@/lib/utils";
import { DraAvatar } from "@/components/dra-avatar";
import { DRA } from "@/content/chat-script";

type CallState = "intro" | "ringing" | "active" | "ended" | "transition";

const CALL_FALLBACK_MS = 60_000; // si el audio falla, mostrar la notificación igual
const INTRO_SAFETY_MS = 12_000;
const TRANSITION_SAFETY_MS = 8_000;

/** ESCENA 2 — Video intro + llamada + video transición + notificación */
export function LlamadaScene() {
  const router = useRouter();
  const { markSceneReached } = useFunnel();

  const [state, setState] = useState<CallState>("intro");
  const [showNotification, setShowNotification] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringRef = useRef<Sfx | null>(null);
  const notifSfxRef = useRef<Sfx | null>(null);
  const notifPlayed = useRef(false);
  const stateRef = useRef<CallState>("intro");
  stateRef.current = state;
  const notifShownRef = useRef(false);
  notifShownRef.current = showNotification;

  useEffect(() => {
    track("exp2_view");
    ringRef.current = createSfx(ASSETS.sfx_tono_llamada, {
      loop: true,
      volume: 0.5,
    });
    notifSfxRef.current = createSfx(ASSETS.sfx_notif_whatsapp, {
      volume: 0.25,
    });
    return () => {
      if (ringRef.current) disposeSfx(ringRef.current);
      if (notifSfxRef.current) disposeSfx(notifSfxRef.current);
    };
  }, []);

  const revealNotification = useCallback(() => {
    if (notifShownRef.current) return;
    setShowNotification(true);
    if (!notifPlayed.current) {
      notifPlayed.current = true;
      notifSfxRef.current?.play();
    }
  }, []);

  // ---- Estado A → B -------------------------------------------------------
  const goRinging = useCallback(() => {
    if (stateRef.current !== "intro") return;
    setState("ringing");
    // Tono de llamada en loop. En iOS sin gesto previo en esta página el
    // play() puede ser rechazado: catch silencioso (lib/sfx).
    ringRef.current?.play();
  }, []);

  const handleIntroEnded = useCallback(() => {
    track("exp2_video_intro_end");
    goRinging();
  }, [goRinging]);

  useEffect(() => {
    if (state !== "intro") return;
    const t = setTimeout(goRinging, INTRO_SAFETY_MS);
    return () => clearTimeout(t);
  }, [state, goRinging]);

  // ---- Estado B → C (tap de contestar = desbloqueo de audio iOS) ----------
  const handleAnswer = () => {
    if (stateRef.current !== "ringing") return;
    ringRef.current?.stop();
    track("exp2_answer");
    setState("active");

    const audio = audioRef.current;
    if (audio) {
      // SIEMPRE dentro del handler del tap (política de autoplay iOS)
      const p = audio.play();
      if (p) p.catch(() => scheduleAudioFailure());
    } else {
      scheduleAudioFailure();
    }

    // Fallback duro: nunca dejar la escena sin salida
    window.setTimeout(() => {
      if (!notifShownRef.current && stateRef.current !== "transition") {
        setState("transition");
        revealNotification();
      }
    }, CALL_FALLBACK_MS);
  };

  const failureTimer = useRef<number | null>(null);
  const scheduleAudioFailure = () => {
    if (failureTimer.current !== null) return;
    failureTimer.current = window.setTimeout(() => {
      if (stateRef.current === "active") endCall();
    }, 2_500);
  };

  // Timer de la llamada
  useEffect(() => {
    if (state !== "active") return;
    const started = Date.now();
    const interval = window.setInterval(() => {
      setElapsed((Date.now() - started) / 1000);
    }, 250);
    return () => window.clearInterval(interval);
  }, [state]);

  // ---- Estado C → D → E ----------------------------------------------------
  const endCall = () => {
    if (stateRef.current !== "active") return;
    setFinalDuration(elapsedRef.current);
    setState("ended");
    window.setTimeout(() => setState("transition"), 1_700);
  };

  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  const handleAudioEnded = () => {
    track("exp2_audio_complete");
    endCall();
  };

  // ---- Estado E: video transición → notificación --------------------------
  useEffect(() => {
    if (state !== "transition") return;
    const t = setTimeout(revealNotification, TRANSITION_SAFETY_MS);
    return () => clearTimeout(t);
  }, [state, revealNotification]);

  const handleNotificationTap = () => {
    track("exp2_notification_tap");
    markSceneReached("chat");
    router.push("/chat");
  };

  const audioDuration =
    audioRef.current && Number.isFinite(audioRef.current.duration)
      ? audioRef.current.duration
      : 45;
  const progress = Math.min(1, elapsed / audioDuration);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink">
      {/* Audio de la llamada: solo arranca con el tap de Contestar */}
      <audio
        ref={audioRef}
        src={ASSETS.audio_llamada}
        preload="auto"
        onEnded={handleAudioEnded}
        onError={() => {
          if (stateRef.current === "active") scheduleAudioFailure();
        }}
      />

      <AnimatePresence mode="wait">
        {state === "intro" && (
          <motion.div
            key="intro"
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <video
              src={ASSETS.video_intro_llamada}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={handleIntroEnded}
              onError={goRinging}
            />
          </motion.div>
        )}

        {(state === "ringing" || state === "active" || state === "ended") && (
          <motion.div
            key="call"
            className="absolute inset-0 flex flex-col items-center justify-between bg-gradient-to-b from-ink-soft via-ink to-ink px-8 py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className={`flex flex-col items-center gap-4 pt-6 ${
                state === "ringing" ? "animate-call-shake" : ""
              }`}
            >
              <p className="font-dm text-sm tracking-wide text-white/50">
                {state === "ringing" && (
                  <span className="animate-soft-blink">Llamada entrante…</span>
                )}
                {state === "active" && formatTime(elapsed)}
                {state === "ended" && "Llamada finalizada"}
              </p>

              {/* Foto con anillo de progreso */}
              <div className="relative">
                <svg
                  width="168"
                  height="168"
                  viewBox="0 0 168 168"
                  className="-rotate-90"
                  aria-hidden
                >
                  <circle
                    cx="84"
                    cy="84"
                    r="78"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="4"
                  />
                  {state !== "ringing" && (
                    <circle
                      cx="84"
                      cy="84"
                      r="78"
                      fill="none"
                      stroke="#36CFC3"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 78}
                      strokeDashoffset={(1 - progress) * 2 * Math.PI * 78}
                      style={{ transition: "stroke-dashoffset 0.3s linear" }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <DraAvatar size={140} />
                </div>
              </div>

              <div className="text-center">
                <h1 className="font-poppins text-2xl font-semibold text-white">
                  {DRA.name}
                </h1>
                <p className="mt-1 font-dm text-sm text-white/60">
                  {DRA.subtitle}
                </p>
                {state === "ended" && (
                  <p className="mt-3 font-dm text-sm text-white/40">
                    {formatTime(finalDuration)}
                  </p>
                )}
              </div>

              {/* Ondas reaccionando al audio */}
              {state === "active" && (
                <div className="mt-2 flex h-8 items-center gap-[3px]">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-teal/80"
                      style={{
                        height: `${8 + ((i * 7) % 20)}px`,
                        animation: `wave 0.9s ease-in-out ${(i % 6) * 0.12}s infinite`,
                        transformOrigin: "center",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Botón verde de contestar (pulsante) */}
            <div className="pb-6">
              {state === "ringing" && (
                <motion.button
                  onClick={handleAnswer}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Contestar"
                  className="flex h-20 w-20 animate-pulse-ring items-center justify-center rounded-full bg-wa-green shadow-lg"
                >
                  <Phone className="h-9 w-9 text-white" fill="currentColor" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {state === "transition" && (
          <motion.div
            key="transition"
            className="absolute inset-0 bg-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <video
              src={ASSETS.video_transicion_teclea}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={revealNotification}
              onError={revealNotification}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notificación de WhatsApp: estática, requiere tap */}
      <AnimatePresence>
        {showNotification && (
          <motion.button
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={handleNotificationTap}
            className="absolute left-3 right-3 top-4 z-50 flex items-center gap-3 rounded-2xl bg-[#1F1F1F]/95 p-3 text-left shadow-2xl backdrop-blur"
          >
            <DraAvatar size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-poppins text-sm font-semibold text-white">
                  {DRA.name}
                </p>
                <span className="shrink-0 font-dm text-[11px] text-white/40">
                  ahora
                </span>
              </div>
              <p className="truncate font-dm text-[13px] text-white/70">
                {DRA.notificationPreview}
              </p>
              <p className="font-dm text-[11px] text-wa-green">WhatsApp</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
