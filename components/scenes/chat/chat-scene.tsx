"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  const nextIndexRef = useRef(0);
  const gateWaitingRef = useRef<number | null>(null);
  const gateDoneRef = useRef<Set<number>>(new Set());
  const gateTimersRef = useRef<Map<number, number>>(new Map());
  const firedEventsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoRef = useRef<{ index: number; id: string } | null>(null);

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll al fondo con cada burbuja nueva
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [revealed.length, typing]);

  // ---- Videos: reproductor fullscreen --------------------------------------
  const openVideo = (index: number, id: string, src: string) => {
    trackOnce(`chat_${id}_play`);
    const v = videoRef.current;
    if (!v) {
      completeGate(index);
      return;
    }
    activeVideoRef.current = { index, id };
    v.src = src;
    v.currentTime = 0;
    // play() síncrono dentro del tap (autoplay iOS)
    const p = v.play();
    if (p)
      p.catch(() => {
        // Asset ausente: cerrar y no bloquear la conversación
        closeVideo();
      });
    setOverlayOpen(true);
  };

  const closeVideo = () => {
    const v = videoRef.current;
    if (v) v.pause();
    setOverlayOpen(false);
    const active = activeVideoRef.current;
    if (active) {
      activeVideoRef.current = null;
      completeGate(active.index);
    }
  };

  const handleVideoEnded = () => {
    const active = activeVideoRef.current;
    if (active) trackOnce(`chat_${active.id}_complete`);
    closeVideo();
  };

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
      <div className="flex items-center gap-4 bg-[#F6F6F6] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <Plus className="h-7 w-7 shrink-0 text-black" strokeWidth={1.8} />
        <div className="flex flex-1 items-center rounded-full border border-[#D1D1D6] bg-white py-2 pl-4 pr-2.5">
          <span className="flex-1 font-dm text-[16px]">&nbsp;</span>
          <Sticker className="h-6 w-6 shrink-0 text-[#8E8E93]" />
        </div>
        <Camera className="h-[26px] w-[26px] shrink-0 text-black" strokeWidth={1.8} />
        <Mic className="h-6 w-6 shrink-0 text-black" strokeWidth={1.8} />
      </div>

      <VideoOverlay
        ref={videoRef}
        open={overlayOpen}
        onClose={closeVideo}
        onEnded={handleVideoEnded}
        onError={closeVideo}
      />
    </main>
  );
}
