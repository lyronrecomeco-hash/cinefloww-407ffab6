import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

interface Message {
  id: string;
  profile_id: string;
  message: string;
  created_at: string;
}

interface Props {
  messages: Message[];
  profileId: string;
  onSend: (message: string) => void;
  onClose: () => void;
}

const RoomChat = ({ messages, profileId, onSend, onClose }: Props) => {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="absolute top-16 right-4 bottom-24 w-80 z-[61] flex flex-col bg-card/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h4 className="text-sm font-bold text-foreground">Chat da Sala</h4>
        <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <X className="w-3 h-3 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Diga oi! 👋</p>
        )}
        {messages.map(msg => {
          const isMe = msg.profile_id === profileId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                isMe 
                  ? "bg-primary/20 text-primary rounded-br-sm" 
                  : "bg-white/[0.05] text-foreground rounded-bl-sm"
              }`}>
                {!isMe && (
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">
                    {msg.profile_id.slice(0, 6)}
                  </p>
                )}
                <p className="break-words">{msg.message}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5 text-right">{formatTime(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomChat;
