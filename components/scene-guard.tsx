"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel, type Scene } from "@/lib/funnel-state";

/**
 * Guard secuencial: si la clienta no alcanzó esta escena, vuelve a `/`.
 * En dev (o con NEXT_PUBLIC_DISABLE_GUARD=true) deja pasar siempre.
 * No renderiza la escena hasta resolver, para evitar flash de contenido.
 */
export function SceneGuard({
  scene,
  children,
}: {
  scene: Scene;
  children: React.ReactNode;
}) {
  const { ready, canAccess, markSceneReached } = useFunnel();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (canAccess(scene)) {
      // Refresh → vuelve a la escena alcanzada (persistimos también esta)
      markSceneReached(scene);
      setAllowed(true);
    } else {
      router.replace("/");
    }
  }, [ready, scene, canAccess, markSceneReached, router]);

  if (!allowed) return <div className="min-h-dvh bg-ink" aria-hidden />;
  return <>{children}</>;
}
