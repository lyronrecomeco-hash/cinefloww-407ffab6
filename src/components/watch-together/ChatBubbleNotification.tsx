import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";

interface Message {
  id: string;
  profile_id: string;
  profile_name?: string;
  message: string;
  created_at: string;
}

interface Props {
  messages: Message[];
  profileId: string;
  onOpenChat: () => void;
}

const ChatBubbleNotification = ({ messages, profileId, onOpenChat }: Props) => {
  const [visibleBubbles, setVisibleBubbles] = useState<Message[]>([]);
  const [lastSeenCount, setLastSeenCount] = useState(messages.length);

  useEffect(() => {
    if (messages.length > lastSeenCount) {
      const newMsgs = messages.slice(lastSeenCount).filter(m => m.profile_id !== profileId);
      if (newMsgs.length > 0) {
        setVisibleBubbles(prev => [...prev, ...newMsgs].slice(-3));
        // Auto-dismiss after 5s
        newMsgs.forEach(msg => {
          setTimeout(() => {
            setVisibleBubbles(prev => prev.filter(b => b.id !== msg.id));
          }, 5000);
        });
      }
      setLastSeenCount(messages.length);
    }
  }, [messages.length, lastSeenCount, profileId]);

  if (visibleBubbles.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-[55] flex flex-col gap-2 max-w-xs pointer-events-none">
      {visibleBubbles.map((msg, i) => (
        <div
          key={msg.id}
          onClick={(e) => { e.stopPropagation(); onOpenChat(); }}
          className="pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl cursor-pointer hover:bg-black/80 transition-all animate-fade-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="w-7 h-7 rounded-full bg-primary/25 flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-primary/80 font-semibold truncate">
              {msg.profile_name || msg.profile_id.slice(0, 6)}
            </p>
            <p className="text-xs text-white/90 break-words line-clamp-2 leading-relaxed">{msg.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatBubbleNotification;
