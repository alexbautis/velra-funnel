"use client";

import { useState } from "react";
import { ASSETS } from "@/lib/assets";
import { cn } from "@/lib/utils";

/**
 * Foto de la Dra. con fallback (iniciales sobre teal suave) mientras el
 * asset real no exista en Sirv. Mismo componente en llamada, chat y sales.
 */
export function DraAvatar({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-teal/20",
        className
      )}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span
          className="flex h-full w-full items-center justify-center font-poppins font-semibold text-teal"
          style={{ fontSize: size * 0.36 }}
        >
          SR
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ASSETS.foto_dra_perfil}
          alt="Dra. Sofía Reyes"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
