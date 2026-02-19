import { useState } from "react";
import { X, Users, Loader2, ArrowRight } from "lucide-react";
import { joinRoom } from "@/lib/watchRoom";

interface Props {
  profileId: string;
  onClose: () => void;
  onJoined: (roomCode: string) => void;
}

const JoinRoomModal = ({ profileId, onClose, onJoined }: Props) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const room = await joinRoom(code.trim(), profileId);
      if (room) onJoined(room.room_code);
    } catch (e: any) {
      setError(e.message || "Erro ao entrar na sala");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card/95 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10">
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">🔗</span>
          </div>

          <h3 className="text-xl font-bold text-center text-foreground mb-1">Entrar numa Sala</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Cole o código que recebeu do seu amigo
          </p>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ROOM-XXXXXX"
                maxLength={12}
                className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 text-center text-xl font-mono font-bold tracking-[0.15em] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={loading || !code.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? "Entrando..." : "Entrar na Sala"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomModal;
