import { SceneGuard } from "@/components/scene-guard";
import { LlamadaScene } from "@/components/scenes/llamada-scene";

export default function LlamadaPage() {
  return (
    <SceneGuard scene="llamada">
      <LlamadaScene />
    </SceneGuard>
  );
}
