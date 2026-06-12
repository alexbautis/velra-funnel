import { SceneGuard } from "@/components/scene-guard";
import { ChatScene } from "@/components/scenes/chat/chat-scene";

export default function ChatPage() {
  return (
    <SceneGuard scene="chat">
      <ChatScene />
    </SceneGuard>
  );
}
