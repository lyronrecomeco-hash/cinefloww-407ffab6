import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle } from "lucide-react";

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
  onSend: (message: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const RoomChat = ({ messages, profileId, onSend, onClose, isOpen }: Props) => {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [messages.length, isOpen]);

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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Drawer from right */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[71] w-[340px] max-w-[85vw] flex flex-col bg-[#0d0d0d]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-[-8px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Chat da Sala</h4>
              <p className="text-[10px] text-white/30">{messages.length} mensagens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-white/15" />
              </div>
              <p className="text-sm text-white/25 font-medium">Nenhuma mensagem</p>
              <p className="text-xs text-white/15 mt-1">Diga oi para os participantes! 👋</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.profile_id === profileId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] group ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <p className="text-[10px] text-primary/60 font-semibold mb-1 ml-1">
                      {msg.profile_name || msg.profile_id.slice(0, 6)}
                    </p>
                  )}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    isMe
                      ? "bg-primary/20 text-primary rounded-br-md"
                      : "bg-white/[0.06] text-white/90 rounded-bl-md"
                  }`}>
                    <p className="break-words">{msg.message}</p>
                  </div>
                  <p className={`text-[9px] text-white/20 mt-1 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleSend(); } }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20 transition-all"
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              disabled={!text.trim()}
              className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors disabled:opacity-20 disabled:hover:bg-primary/20"
            >
              <Send className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomChat;
