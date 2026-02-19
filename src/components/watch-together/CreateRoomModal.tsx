import { useState } from "react";
import { X, Copy, Check, Users, Loader2 } from "lucide-react";
import { createRoom } from "@/lib/watchRoom";

interface Props {
  profileId: string;
  tmdbId: number;
  contentType: string;
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  onClose: () => void;
  onCreated: (roomCode: string) => void;
}

const CreateRoomModal = ({ profileId, tmdbId, contentType, title, posterPath, season, episode, onClose, onCreated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const room = await createRoom({
        hostProfileId: profileId,
        tmdbId,
        contentType,
        title,
        posterPath,
        season,
        episode,
      });
      if (room) {
        setRoomCode(room.room_code);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao criar sala");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card/95 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10">
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7 text-primary" />
          </div>

          <h3 className="text-xl font-bold text-center text-foreground mb-1">Assistir Junto</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {title}{season && episode ? ` • T${season}E${episode}` : ""}
          </p>

          {!roomCode ? (
            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Você será o host e controlará a reprodução</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Até 8 participantes por sala</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> Chat em tempo real incluído</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> A sala expira em 6 horas</li>
                </ul>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                {loading ? "Criando..." : "Criar Sala"}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Código da Sala</p>
                <p className="text-3xl font-mono font-bold text-primary tracking-[0.2em]">{roomCode}</p>
              </div>

              <button
                onClick={copyCode}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-foreground text-sm font-medium hover:bg-white/20 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado!" : "Copiar Código"}
              </button>

              <button
                onClick={() => onCreated(roomCode)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
              >
                Entrar na Sala
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;
