import { SceneGuard } from "@/components/scene-guard";
import { SalesScene } from "@/components/scenes/sales-scene";

export default function VelraPage() {
  return (
    <SceneGuard scene="velra">
      <SalesScene />
    </SceneGuard>
  );
}
