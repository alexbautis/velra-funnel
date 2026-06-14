"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Mic } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { DraAvatar } from "@/components/dra-avatar";

function BubbleShell({
  children,
  className,
  first,
}: {
  children: React.ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative max-w-[80%] rounded-2xl bg-wa-bubble shadow-sm",
        first && "wa-tail-in rounded-tl-none",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function TimeStamp({ time, light }: { time: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "float-right ml-2 mt-1 select-none text-[11px] leading-none",
        light ? "text-white/80" : "text-gray-400"
      )}
    >
      {time}
    </span>
  );
}

// ---------------------------------------------------------------------------

export function TextBubble({
  text,
  time,
  first,
}: {
  text: string;
  time: string;
  first?: boolean;
}) {
  return (
    <BubbleShell first={first} className="px-3 py-2">
      <p className="inline font-dm text-[15px] leading-snug text-text-dark">
        {text}
      </p>
      <TimeStamp time={time} />
    </BubbleShell>
  );
}

// ---------------------------------------------------------------------------

/**
 * Video compartido de WhatsApp: miniatura (primer frame real del video) con
 * icono de play encima. Sin tarjetas de enlace ni títulos sobre la miniatura.
 */
export function VideoBubble({
  src,
  durationLabel,
  time,
  onOpen,
  first,
  consumed = false,
}: {
  src: string;
  durationLabel: string;
  time: string;
  onOpen: () => void;
  first?: boolean;
  /** Video ya visto: sin botón de play, no se puede reabrir. */
  consumed?: boolean;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [thumbReady, setThumbReady] = useState(false);

  // Solo clicable cuando el primer frame está listo y no se ha visto aún:
  // evita doble tap antes de que cargue y la reapertura tras consumirse.
  const clickable = !consumed && thumbReady;

  return (
    <BubbleShell first={first} className="w-[80%] p-[3px]">
      <button
        onClick={(e) => {
          if (!clickable) {
            e.preventDefault();
            return;
          }
          onOpen();
        }}
        disabled={!clickable}
        aria-label={consumed ? "Video visto" : "Reproducir video"}
        className="relative block w-full overflow-hidden rounded-xl"
        style={{
          cursor: clickable ? "pointer" : "default",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        {thumbFailed ? (
          <div className="aspect-[4/5] w-full bg-gradient-to-br from-[#2b3942] to-[#10181d]" />
        ) : (
          <video
            src={src}
            className="aspect-[4/5] w-full bg-black object-cover"
            preload="metadata"
            muted
            playsInline
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onLoadedData={() => setThumbReady(true)}
            onCanPlay={() => setThumbReady(true)}
            onError={() => {
              setThumbFailed(true);
              setThumbReady(true);
            }}
          />
        )}

        {/* Botón de play (solo cuando se puede reproducir) */}
        {clickable && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
              <Play className="ml-1 h-7 w-7 text-white" fill="currentColor" />
            </span>
          </div>
        )}

        {/* Spinner mientras carga el primer frame del thumbnail */}
        {!consumed && !thumbReady && !thumbFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
          </div>
        )}

        <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
          <span className="rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
            ▶ {durationLabel}
          </span>
        </div>
        <div className="absolute bottom-1.5 right-2">
          <TimeStamp time={time} light />
        </div>
      </button>
    </BubbleShell>
  );
}

// ---------------------------------------------------------------------------

/**
 * Nota de voz de WhatsApp: play, forma de onda con progreso y duración.
 * El audio SOLO arranca con el tap del play (política de autoplay iOS).
 */
export function VoiceBubble({
  src,
  durationLabel,
  time,
  onFirstPlay,
  onEnded,
  first,
}: {
  src: string;
  durationLabel: string;
  time: string;
  onFirstPlay: () => void;
  onEnded: () => void;
  first?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState(0);
  const firedPlay = useRef(false);
  const firedEnd = useRef(false);

  // Alturas de onda deterministas (sin Math.random para evitar mismatch SSR)
  const bars = Array.from({ length: 30 }, (_, i) => 6 + ((i * 13 + 7) % 17));

  const finish = () => {
    setPlaying(false);
    setProgress(1);
    if (!firedEnd.current) {
      firedEnd.current = true;
      onEnded();
    }
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (!firedPlay.current) {
      firedPlay.current = true;
      onFirstPlay();
    }
    // play() dentro del handler del tap
    const p = audio.play();
    if (p)
      p.then(() => setPlaying(true)).catch(() => {
        // Asset ausente: no bloquear el chat, dar por escuchada la nota
        finish();
      });
  };

  return (
    <BubbleShell first={first} className="w-[78%] px-2 py-2">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setPosition(a.currentTime);
          if (Number.isFinite(a.duration) && a.duration > 0) {
            setProgress(a.currentTime / a.duration);
          }
        }}
        onEnded={finish}
        onError={() => {
          if (firedPlay.current) finish();
        }}
      />
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <DraAvatar size={40} />
          <Mic className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white p-0.5 text-wa-green" />
        </div>
        <button
          onClick={toggle}
          aria-label={playing ? "Pausar nota de voz" : "Reproducir nota de voz"}
          className="shrink-0 text-[#7a8a93]"
        >
          {playing ? (
            <Pause className="h-8 w-8" fill="currentColor" />
          ) : (
            <Play className="h-8 w-8" fill="currentColor" />
          )}
        </button>
        <div className="flex h-8 flex-1 items-center gap-[2px]">
          {bars.map((h, i) => {
            const active = i / bars.length <= progress;
            return (
              <span
                key={i}
                className={cn(
                  "w-[2.5px] rounded-full",
                  active ? "bg-teal-dark" : "bg-[#c5cdd3]"
                )}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between pl-12 pr-1 pt-0.5">
        <span className="text-[11px] text-gray-400">
          {position > 0 ? formatTime(position) : durationLabel}
        </span>
        <TimeStamp time={time} />
      </div>
    </BubbleShell>
  );
}

// ---------------------------------------------------------------------------

/** Tarjeta de enlace estilo WhatsApp hacia la Sales Page. */
export function LinkBubble({
  title,
  domain,
  image,
  time,
  onTap,
  first,
}: {
  title: string;
  domain: string;
  image: string;
  time: string;
  onTap: () => void;
  first?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <BubbleShell first={first} className="w-[80%] p-[3px]">
      <button
        onClick={onTap}
        aria-label={`Abrir ${title}`}
        className="block w-full overflow-hidden rounded-xl text-left"
      >
        {imgFailed ? (
          <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-teal/30 to-blush/40">
            <span className="font-bebas text-4xl tracking-[0.3em] text-ink/60">
              velra
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="aspect-square w-full bg-white object-cover"
            onError={() => setImgFailed(true)}
          />
        )}
        <div className="flex items-end justify-between gap-2 bg-wa-bubble px-3 py-2">
          <div className="min-w-0">
            <p className="font-dm text-[15px] font-semibold leading-tight text-text-dark">
              {title}
            </p>
            <p className="mt-0.5 text-[12px] text-gray-500">{domain}</p>
          </div>
          <span className="shrink-0 select-none text-[11px] text-gray-400">
            {time}
          </span>
        </div>
      </button>
    </BubbleShell>
  );
}

// ---------------------------------------------------------------------------

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="wa-tail-in relative w-fit rounded-2xl rounded-tl-none bg-wa-bubble px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-gray-400"
            style={{
              animation: `typing-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
