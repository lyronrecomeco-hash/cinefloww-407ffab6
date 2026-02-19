import { useState } from "react";
import { Users, Copy, Check, X, Crown, LogOut, MessageCircle } from "lucide-react";
import RoomChat from "./RoomChat";

interface Participant {
  id: string;
  profile_id: string;
  role: string;
}

interface Props {
  roomCode: string;
  isHost: boolean;
  participants: Participant[];
  messages: { id: string; profile_id: string; message: string; created_at: string }[];
  profileId: string;
  onLeave: () => void;
  onSendMessage: (msg: string) => void;
  showControls: boolean;
}

const RoomOverlay = ({ roomCode, isHost, participants, messages, profileId, onLeave, onSendMessage, showControls }: Props) => {
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unreadCount = 0; // Could track with state

  return (
    <>
      {/* Room badge - top right */}
      <div className={`absolute top-4 right-16 z-20 flex items-center gap-2 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button
          onClick={() => setShowChat(!showChat)}
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-medium hover:bg-black/80 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chat</span>
        </button>

        <button
          onClick={() => setShowPanel(!showPanel)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-xs font-bold hover:bg-primary/30 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          <span>{participants.length}</span>
          {isHost && <Crown className="w-3 h-3 text-yellow-400" />}
        </button>
      </div>

      {/* Participants panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowPanel(false)} />
          <div className="absolute top-16 right-16 z-[61] w-72 bg-card/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-foreground">Sala Watch Together</h4>
                <button onClick={() => setShowPanel(false)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
              <button onClick={copyCode} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-mono font-bold text-primary">{roomCode}</span>
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="p-3 max-h-48 overflow-y-auto">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Participantes ({participants.length})</p>
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {p.profile_id.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-foreground flex-1 truncate">
                    {p.profile_id === profileId ? "Você" : `Perfil ${p.profile_id.slice(0, 6)}`}
                  </span>
                  {p.role === "host" && <Crown className="w-3 h-3 text-yellow-400" />}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-white/10">
              <button
                onClick={onLeave}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isHost ? "Encerrar Sala" : "Sair da Sala"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Chat panel */}
      {showChat && (
        <RoomChat
          messages={messages}
          profileId={profileId}
          onSend={onSendMessage}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
};

export default RoomOverlay;
