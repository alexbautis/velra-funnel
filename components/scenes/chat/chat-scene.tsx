"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  Mic,
  Phone,
  Plus,
  Sticker,
} from "lucide-react";
import { track } from "@/lib/tracking";
import { useFunnel } from "@/lib/funnel-state";
import { ASSETS } from "@/lib/assets";
import { playSfx } from "@/lib/sfx";
import { nowTimeLabel } from "@/lib/utils";
import { DraAvatar } from "@/components/dra-avatar";
import { CHAT_SCRIPT, DRA, type ChatStep } from "@/content/chat-script";
import {
  LinkBubble,
  TextBubble,
  TypingIndicator,
  VideoBubble,
  VoiceBubble,
} from "./bubbles";
import { VideoOverlay } from "./video-overlay";

const GATE_FALLBACK_MS = 90_000; // nunca bloquear el avance si un asset falla
const TYPING_MIN_MS = 1_500;
const TYPING_MAX_MS = 2_500;

interface RevealedMsg {
  step: ChatStep;
  index: number;
  time: string;
}

/** ESCENA 3 — WhatsApp con la Dra. */
export function ChatScene() {
  const router = useRouter();
  const { markSceneReached } = useFunnel();

  const [revealed, setRevealed] = useState<RevealedMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  // Videos ya reproducidos hasta el final: su burbuja queda "vista" y no
  // vuelve a abrirse.
  const [consumed, setConsumed] = useState<Set<string>>(() => new Set());

  const nextIndexRef = useRef(0);
  const gateWaitingRef = useRef<number | null>(null);
  const gateDoneRef = useRef<Set<number>>(new Set());
  const gateTimersRef = useRef<Map<number, number>>(new Map());
  const firedEventsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoRef = useRef<{ index: number; id: string } | null>(null);
  // "Atrapado": true desde el tap hasta que el video termina/falla.
  const videoBusyRef = useRef(false);
  // Watchdog de arranque: si el video nunca empieza a reproducir, avanzar.
  const startWatchdogRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const trackOnce = useCallback((event: string) => {
    if (firedEventsRef.current.has(event)) return;
    firedEventsRef.current.add(event);
    track(event);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  // ---- Motor de la conversación -------------------------------------------
  const scheduleNext = useCallback(() => {
    if (nextIndexRef.current >= CHAT_SCRIPT.length) return;
    if (gateWaitingRef.current !== null) return;

    setTyping(true);
    const typingMs =
      TYPING_MIN_MS + Math.random() * (TYPING_MAX_MS - TYPING_MIN_MS);

    later(() => {
      const index = nextIndexRef.current;
      if (index >= CHAT_SCRIPT.length) return;
      nextIndexRef.current = index + 1;
      const step = CHAT_SCRIPT[index];

      setTyping(false);
      setRevealed((prev) => [...prev, { step, index, time: nowTimeLabel() }]);
      // Instancia nueva por burbuja, en el momento exacto (patrón iOS)
      playSfx(ASSETS.sfx_mensaje_whatsapp, { volume: 0.2 });

      if ("gate" in step && step.gate) {
        gateWaitingRef.current = index;
        const fallback = window.setTimeout(
          () => completeGate(index),
          GATE_FALLBACK_MS
        );
        gateTimersRef.current.set(index, fallback);
      } else {
        later(scheduleNext, 500);
      }
    }, typingMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [later]);

  const completeGate = useCallback(
    (index: number) => {
      if (gateDoneRef.current.has(index)) return;
      gateDoneRef.current.add(index);
      const fallback = gateTimersRef.current.get(index);
      if (fallback !== undefined) window.clearTimeout(fallback);
      if (gateWaitingRef.current === index) {
        gateWaitingRef.current = null;
        later(scheduleNext, 700);
      }
    },
    [later, scheduleNext]
  );

  useEffect(() => {
    track("chat_view");
    later(scheduleNext, 800);
    const timers = timersRef.current;
    const gateTimers = gateTimersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      gateTimers.forEach((id) => window.clearTimeout(id));
      if (startWatchdogRef.current !== null)
        window.clearTimeout(startWatchdogRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll al fondo con cada burbuja nueva
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [revealed.length, typing]);

  // ---- Videos: reproductor "atrapado" --------------------------------------
  // Cierra el reproductor y avanza la conversación. `consume` marca el video
  // como visto (su burbuja ya no se puede reabrir).
  const finishVideo = (consume: boolean) => {
    const v = videoRef.current;
    if (v) v.pause();
    if (startWatchdogRef.current !== null) {
      window.clearTimeout(startWatchdogRef.current);
      startWatchdogRef.current = null;
    }
    setOverlayOpen(false);
    videoBusyRef.current = false;
    const active = activeVideoRef.current;
    if (active) {
      activeVideoRef.current = null;
      if (consume)
        setConsumed((prev) => {
          const next = new Set(prev);
          next.add(active.id);
          return next;
        });
      completeGate(active.index);
    }
  };

  const openVideo = (index: number, id: string, src: string) => {
    // Solo se abre una vez: ni si ya está en curso ni si ya se vio.
    if (videoBusyRef.current || consumed.has(id)) return;
    const v = videoRef.current;
    if (!v) {
      completeGate(index);
      return;
    }
    videoBusyRef.current = true;
    trackOnce(`chat_${id}_play`);
    activeVideoRef.current = { index, id };
    // flushSync: pinta el overlay VISIBLE de forma síncrona ANTES del play().
    // Si el video no está visible al hacer play(), el navegador lo trata como
    // "media en segundo plano" y lo pausa (Chromium rechaza, iOS se cuelga
    // con spinner). Con el overlay ya visible, el play() arranca.
    flushSync(() => setOverlayOpen(true));
    v.src = src;
    v.muted = false;
    v.volume = 1;
    // play() síncrono dentro del tap (autoplay iOS), con el video ya visible
    const p = v.play();
    if (p) p.catch(() => finishVideo(true));
    // Si nunca llega a reproducir (red colgada), avanzar para no atrapar.
    startWatchdogRef.current = window.setTimeout(() => finishVideo(true), 20_000);
  };

  // El video empezó a reproducir: cancelar el watchdog de arranque.
  const handleVideoPlaying = () => {
    if (startWatchdogRef.current !== null) {
      window.clearTimeout(startWatchdogRef.current);
      startWatchdogRef.current = null;
    }
  };

  const handleVideoEnded = () => {
    const active = activeVideoRef.current;
    if (active) trackOnce(`chat_${active.id}_complete`);
    finishVideo(true);
  };

  const handleVideoError = () => finishVideo(true);

  // ---- Salida a la Sales Page ----------------------------------------------
  const handleLinkTap = () => {
    track("chat_link_tap");
    markSceneReached("velra");
    router.push("/velra");
  };

  return (
    <main className="wa-chat-bg flex h-dvh flex-col overflow-hidden">
      {/* Header WhatsApp iOS: gris claro, chevron, llamada en píldora */}
      <header className="z-10 flex items-center gap-1.5 border-b border-black/10 bg-[#F6F6F6] px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-black">
        <ChevronLeft className="h-7 w-7 shrink-0" strokeWidth={2.5} />
        <DraAvatar size={40} />
        <div className="min-w-0 flex-1 pl-1.5">
          <p className="truncate font-dm text-[17px] font-semibold leading-tight">
            {DRA.name}
          </p>
          <p className="truncate font-dm text-[12px] leading-tight text-[#8E8E93]">
            en línea
          </p>
        </div>
        <div className="mr-1 flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 shadow-sm">
          <Phone className="h-5 w-5" />
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </header>

      {/* Conversación */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-md flex-col gap-1.5">
          {/* Píldora de fecha */}
          <div className="mx-auto mb-2 w-fit rounded-lg bg-white/90 px-3.5 py-1 shadow-sm">
            <p className="text-[13px] font-medium text-[#3C3C43]">Hoy</p>
          </div>

          {/* Aviso de cifrado (iOS) */}
          <div className="mx-auto mb-2 max-w-[88%] rounded-xl bg-[#FFF5C4] px-4 py-2.5 text-center shadow-sm">
            <p className="text-[13px] leading-snug text-[#1C1C1E]">
              🔒 Los mensajes y las llamadas están cifrados de extremo a
              extremo. Solo las personas en este chat pueden leerlos,
              escucharlos o compartirlos.{" "}
              <span className="font-semibold">Más información</span>
            </p>
          </div>

          {revealed.map(({ step, index, time }, i) => {
            const first = i === 0 || revealed[i - 1]?.step.kind !== step.kind;
            switch (step.kind) {
              case "text":
                return (
                  <TextBubble
                    key={index}
                    text={step.text}
                    time={time}
                    first={first}
                  />
                );
              case "video":
                return (
                  <VideoBubble
                    key={index}
                    src={step.src}
                    durationLabel={step.durationLabel}
                    time={time}
                    first={first}
                    consumed={consumed.has(step.id)}
                    onOpen={() => openVideo(index, step.id, step.src)}
                  />
                );
              case "voice":
                return (
                  <VoiceBubble
                    key={index}
                    src={step.src}
                    durationLabel={step.durationLabel}
                    time={time}
                    first={first}
                    onFirstPlay={() => trackOnce(`chat_${step.id}_play`)}
                    onEnded={() => completeGate(index)}
                  />
                );
              case "link":
                return (
                  <LinkBubble
                    key={index}
                    title={step.title}
                    domain={step.domain}
                    image={step.image}
                    time={time}
                    first={first}
                    onTap={handleLinkTap}
                  />
                );
            }
          })}

          <AnimatePresence>{typing && <TypingIndicator />}</AnimatePresence>
        </div>
      </div>

      {/* Barra de entrada iOS (decorativa: la clienta nunca escribe):
          "+", campo vacío con icono de sticker, cámara y micrófono fuera */}
      <div className="flex items-center gap-[18px] bg-[#F6F6F6] px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5">
        <Plus className="h-8 w-8 shrink-0 text-black" strokeWidth={2} />
        <div className="flex min-h-[42px] flex-1 items-center rounded-full border border-[#E0E0E2] bg-white py-1.5 pl-4 pr-3 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
          <span className="flex-1 font-dm text-[16px]">&nbsp;</span>
          <Sticker className="h-[26px] w-[26px] shrink-0 text-[#5F6368]" strokeWidth={1.7} />
        </div>
        <Camera className="h-7 w-7 shrink-0 text-black" strokeWidth={2} />
        <Mic className="h-[26px] w-[26px] shrink-0 text-black" strokeWidth={2} />
      </div>

      <VideoOverlay
        ref={videoRef}
        open={overlayOpen}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        onPlaying={handleVideoPlaying}
      />
    </main>
  );
}
