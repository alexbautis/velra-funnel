"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Phone } from "lucide-react";
import { track } from "@/lib/tracking";
import { useFunnel } from "@/lib/funnel-state";
import { ASSETS } from "@/lib/assets";
import { playSfx, unlockAudioSession } from "@/lib/sfx";
import { DraAvatar } from "@/components/dra-avatar";
import { DRA } from "@/content/chat-script";

type CallState = "intro" | "ringing" | "active" | "ended" | "transition";

const CALL_FALLBACK_MS = 60_000;
const INTRO_SAFETY_MS = 8_000;      // video intro ~5-8s
const TRANSITION_SAFETY_MS = 5_000; // video transición ~3s
const BAR_COUNT = 18;

function formatCallTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** ESCENA 2 — Video intro + llamada + video transición + notificación */
export function LlamadaScene() {
  const router = useRouter();
  const { markSceneReached } = useFunnel();

  const [state, setState] = useState<CallState>("intro");
  const [showNotification, setShowNotification] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(
    Array(BAR_COUNT).fill(2)
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const notifPlayed = useRef(false);
  const stateRef = useRef<CallState>("intro");
  stateRef.current = state;
  const notifShownRef = useRef(false);
  notifShownRef.current = showNotification;
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  // Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveRafRef = useRef<number | null>(null);

  useEffect(() => {
    track("exp2_view");
    return () => {
      if (waveRafRef.current !== null) cancelAnimationFrame(waveRafRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  const revealNotification = useCallback(() => {
    if (notifShownRef.current) return;
    setShowNotification(true);
    if (!notifPlayed.current) {
      notifPlayed.current = true;
      // Se instancia y suena AQUÍ, en el momento exacto (patrón iOS)
      playSfx(ASSETS.sfx_notif_whatsapp, { volume: 0.25 });
    }
  }, []);

  // ---- Estado A → B -------------------------------------------------------
  const goRinging = useCallback(() => {
    if (stateRef.current !== "intro") return;
    setState("ringing");
  }, []);

  // Tono de llamada: existe SOLO mientras el estado es "ringing".
  // Se instancia al entrar y se libera al salir (contestar o fallback).
  useEffect(() => {
    if (state !== "ringing") return;
    const ring = playSfx(ASSETS.sfx_tono_llamada, { loop: true, volume: 0.5 });
    return () => ring.stop();
  }, [state]);

  const handleIntroEnded = useCallback(() => {
    track("exp2_video_intro_end");
    goRinging();
  }, [goRinging]);

  const introWatchdogRef = useRef<number | null>(null);
  const armIntroWatchdog = useCallback(() => {
    if (introWatchdogRef.current !== null)
      window.clearTimeout(introWatchdogRef.current);
    introWatchdogRef.current = window.setTimeout(goRinging, INTRO_SAFETY_MS);
  }, [goRinging]);

  useEffect(() => {
    if (state !== "intro") return;
    armIntroWatchdog();
    return () => {
      if (introWatchdogRef.current !== null)
        window.clearTimeout(introWatchdogRef.current);
    };
  }, [state, armIntroWatchdog]);

  // Video intro CON sonido; fallback a muted si el navegador lo bloquea.
  useEffect(() => {
    const v = introVideoRef.current;
    if (!v) return;
    v.muted = false;
    const p = v.play();
    if (p)
      p.catch(() => {
        v.muted = true;
        const retry = v.play();
        if (retry) retry.catch(() => goRinging());
      });
  }, [goRinging]);

  // ---- Web Audio API waveform (se inicia dentro del tap handler) ----------
  const setupAnalyser = (audio: HTMLAudioElement) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (stateRef.current !== "active") return;
        if (ctx.state === "suspended") ctx.resume();
        analyser.getByteFrequencyData(dataArray);
        const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
          const idx = Math.floor((i / BAR_COUNT) * dataArray.length * 0.65);
          return Math.max(2, Math.round((dataArray[idx] / 255) * 28));
        });
        setWaveformBars(bars);
        waveRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Web Audio API no disponible; barras mantienen altura mínima
    }
  };

  // ---- Estado B → C (tap = desbloqueo de audio iOS) -----------------------
  const handleAnswer = () => {
    if (stateRef.current !== "ringing") return;
    track("exp2_answer"); // el tono se detiene solo: cleanup del effect de "ringing"
    setState("active");

    const audio = audioRef.current;
    if (audio) {
      setupAnalyser(audio); // dentro del handler del tap (política iOS)
      const p = audio.play();
      if (p) p.catch(() => scheduleAudioFailure());
    } else {
      scheduleAudioFailure();
    }

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

  useEffect(() => {
    if (state !== "active") return;
    const started = Date.now();
    const interval = window.setInterval(() => {
      setElapsed((Date.now() - started) / 1000);
    }, 250);
    return () => window.clearInterval(interval);
  }, [state]);

  // ---- Estado C → D → E --------------------------------------------------
  const endCall = () => {
    if (stateRef.current !== "active") return;
    if (waveRafRef.current !== null) cancelAnimationFrame(waveRafRef.current);
    setFinalDuration(elapsedRef.current);
    setState("ended");
    window.setTimeout(() => setState("transition"), 1_700);
  };

  const handleAudioEnded = () => {
    track("exp2_audio_complete");
    endCall();
  };

  const transitionWatchdogRef = useRef<number | null>(null);
  const armTransitionWatchdog = useCallback(() => {
    if (transitionWatchdogRef.current !== null)
      window.clearTimeout(transitionWatchdogRef.current);
    transitionWatchdogRef.current = window.setTimeout(
      revealNotification,
      TRANSITION_SAFETY_MS
    );
  }, [revealNotification]);

  useEffect(() => {
    if (state !== "transition") return;
    armTransitionWatchdog();
    return () => {
      if (transitionWatchdogRef.current !== null)
        window.clearTimeout(transitionWatchdogRef.current);
    };
  }, [state, armTransitionWatchdog]);

  const handleNotificationTap = () => {
    unlockAudioSession(); // re-bendice la sesión para los SFX del chat (iOS)
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
              ref={introVideoRef}
              src={ASSETS.video_intro_llamada}
              className="h-full w-full object-cover"
              playsInline
              onTimeUpdate={armIntroWatchdog}
              onEnded={handleIntroEnded}
              onError={goRinging}
            />
          </motion.div>
        )}

        {(state === "ringing" || state === "active" || state === "ended") && (
          <motion.div
            key="call"
            className="absolute inset-0 flex flex-col items-center justify-between px-8 py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Fondo: bg_llamada_entrante.jpg a pantalla completa */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.bg_llamada_entrante}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Overlay para profundidad y legibilidad */}
            <div className="absolute inset-0 bg-[rgba(10,10,10,0.45)]" />

            {/* Contenido — por encima del overlay */}
            <div
              className={`relative z-10 flex flex-col items-center gap-4 pt-6 ${
                state === "ringing" ? "animate-call-shake" : ""
              }`}
            >
              <p className="font-dm text-sm tracking-wide text-white/60">
                {state === "ringing" && (
                  <span className="animate-soft-blink">Llamada entrante…</span>
                )}
                {state === "ended" && "Llamada finalizada"}
              </p>

              {/* Avatar con anillo de progreso */}
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

              {/* Nombre y especialidad */}
              <div className="text-center">
                <h1 className="font-poppins text-2xl font-semibold text-white">
                  {DRA.name}
                </h1>
                <p className="mt-1 font-dm text-sm text-white/60">
                  {DRA.subtitle}
                </p>
                {state === "ended" && (
                  <p className="mt-3 font-dm text-sm text-white/40">
                    {formatCallTimer(finalDuration)}
                  </p>
                )}
              </div>

              {/* Waveform con Web Audio API + timer — solo estado activo */}
              {state === "active" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-8 items-end gap-[3px]">
                    {waveformBars.map((h, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-teal/90"
                        style={{
                          height: `${h}px`,
                          transition: "height 0.08s ease",
                        }}
                      />
                    ))}
                  </div>
                  <p className="font-dm text-base font-medium tabular-nums text-white/80">
                    {formatCallTimer(elapsed)}
                  </p>
                </div>
              )}
            </div>

            {/* Botón verde de contestar */}
            <div className="relative z-10 pb-6">
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
              onTimeUpdate={armTransitionWatchdog}
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
