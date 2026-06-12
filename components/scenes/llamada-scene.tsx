"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BatteryFull,
  Camera,
  Flashlight,
  Lock,
  Phone,
  Signal,
  Wifi,
} from "lucide-react";
import { track } from "@/lib/tracking";
import { useFunnel } from "@/lib/funnel-state";
import { ASSETS } from "@/lib/assets";
import { playSfx, unlockAudioSession } from "@/lib/sfx";
import { DraAvatar } from "@/components/dra-avatar";
import { DRA } from "@/content/chat-script";

type CallState =
  | "intro"
  | "ringing"
  | "active"
  | "ended"
  | "transition"
  | "lockscreen";

const CALL_FALLBACK_MS = 60_000;
const INTRO_SAFETY_MS = 8_000;      // video intro ~5-8s
const TRANSITION_SAFETY_MS = 5_000; // video transición ~3s
const LOCKSCREEN_NOTIF_DELAY_MS = 1_500;
const BAR_COUNT = 18;

function formatCallTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Hora real del dispositivo en el formato del locale (12h/24h), sin
// sufijo AM/PM — como el reloj del lockscreen de iOS.
function deviceClock(d: Date): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${h}:${m}`;
}

function deviceDate(d: Date): string {
  const s = d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ESCENA 2 — Video intro + llamada + video transición + notificación */
export function LlamadaScene() {
  const router = useRouter();
  const { markSceneReached } = useFunnel();

  const [state, setState] = useState<CallState>("intro");
  const [showNotification, setShowNotification] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
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

  // ---- Estado E → lockscreen ----------------------------------------------
  const goLockscreen = useCallback(() => {
    if (stateRef.current === "lockscreen") return;
    setState("lockscreen");
  }, []);

  // Lockscreen: reloj real del dispositivo + notificación tras 1.5s
  useEffect(() => {
    if (state !== "lockscreen") return;
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 5_000);
    const notif = window.setTimeout(
      revealNotification,
      LOCKSCREEN_NOTIF_DELAY_MS
    );
    return () => {
      window.clearInterval(clock);
      window.clearTimeout(notif);
    };
  }, [state, revealNotification]);

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
    // Último gesto antes de la notificación: re-resume del AudioContext y
    // asegurar que notif + mensaje están decodificados en memoria (iOS)
    unlockAudioSession([ASSETS.sfx_notif_whatsapp, ASSETS.sfx_mensaje_whatsapp]);
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
      // Si el audio se colgó, empujar a transition; la cadena
      // transition → lockscreen → notificación sigue sola (watchdogs)
      if (stateRef.current === "active" || stateRef.current === "ended") {
        setState("transition");
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
      goLockscreen,
      TRANSITION_SAFETY_MS
    );
  }, [goLockscreen]);

  useEffect(() => {
    if (state !== "transition") return;
    armTransitionWatchdog();
    return () => {
      if (transitionWatchdogRef.current !== null)
        window.clearTimeout(transitionWatchdogRef.current);
    };
  }, [state, armTransitionWatchdog]);

  const handleNotificationTap = () => {
    // Re-resume del contexto justo antes del chat (iOS)
    unlockAudioSession([ASSETS.sfx_mensaje_whatsapp]);
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
              onEnded={goLockscreen}
              onError={goLockscreen}
            />
          </motion.div>
        )}

        {state === "lockscreen" && (
          <motion.div
            key="lockscreen"
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Fondo: misma imagen de la consulta + overlay 50% */}
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
            <div className="absolute inset-0 bg-black/50" />

            <div className="relative z-10 flex h-full flex-col">
              {/* Status bar */}
              <div className="flex items-center justify-between px-6 pt-[max(0.75rem,env(safe-area-inset-top))] text-white/80">
                <span
                  className="text-[15px] font-semibold"
                  style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                >
                  {now ? deviceClock(now) : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <Signal className="h-4 w-4" strokeWidth={2.5} />
                  <Wifi className="h-4 w-4" strokeWidth={2.5} />
                  <BatteryFull className="h-5 w-5" strokeWidth={2} />
                </span>
              </div>

              {/* Candado */}
              <div className="mt-3 flex justify-center">
                <Lock className="h-5 w-5 text-white/60" />
              </div>

              {/* Reloj grande + fecha */}
              <div className="mt-6 text-center">
                <p
                  className="leading-none text-white"
                  style={{
                    fontSize: "86px",
                    fontWeight: 200,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {now ? deviceClock(now) : ""}
                </p>
                <p
                  className="mt-2 text-[17px] font-normal text-white/80"
                  style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                >
                  {now ? deviceDate(now) : ""}
                </p>
              </div>

              {/* Notificación de WhatsApp (aparece a los 1.5s) */}
              <div className="mt-10 flex justify-center px-4">
                <AnimatePresence>
                  {showNotification && (
                    <motion.button
                      initial={{ opacity: 0, y: -16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 26,
                      }}
                      onClick={handleNotificationTap}
                      className="w-[90%] rounded-[18px] bg-white/85 p-3 text-left shadow-2xl"
                      style={{
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 shrink-0 fill-[#25D366]"
                          aria-hidden
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        <span className="flex-1 text-[12px] text-gray-500">
                          WhatsApp
                        </span>
                        <span className="text-[12px] text-gray-500">ahora</span>
                      </div>
                      <p className="mt-1 text-[15px] font-semibold leading-snug text-black">
                        {DRA.name}
                      </p>
                      <p className="truncate text-[14px] leading-snug text-gray-700">
                        {DRA.notificationPreview}
                      </p>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Linterna y cámara */}
              <div className="mt-auto flex items-center justify-between px-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur"
                  aria-hidden
                >
                  <Flashlight className="h-5 w-5 text-white" />
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur"
                  aria-hidden
                >
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
