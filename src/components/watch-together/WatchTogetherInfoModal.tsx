import { X, Users, Play, MessageSquare, Share2, LogIn, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WatchTogetherInfoModalProps {
  isLoggedIn: boolean;
  onClose: () => void;
  onContinue: () => void; // proceed to create/join menu
}

const WatchTogetherInfoModal = ({ isLoggedIn, onClose, onContinue }: WatchTogetherInfoModalProps) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header gradient */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Assistir Junto</h2>
              <p className="text-xs text-primary font-medium">Novo recurso! 🎉</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Assista filmes e séries sincronizados com seus amigos em tempo real, mesmo à distância!
          </p>
        </div>

        {/* Features */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sincronização em tempo real</p>
              <p className="text-xs text-muted-foreground">Play, pause e seek sincronizados para todos na sala</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Chat integrado</p>
              <p className="text-xs text-muted-foreground">Converse com seus amigos enquanto assistem juntos</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Share2 className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Fácil de compartilhar</p>
              <p className="text-xs text-muted-foreground">Crie uma sala e envie o código para até 8 amigos</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 space-y-2.5">
          {isLoggedIn ? (
            <button
              onClick={onContinue}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Criar ou Entrar numa Sala
            </button>
          ) : (
            <button
              onClick={() => { onClose(); navigate("/conta"); }}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Fazer Login para Usar
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
};

export default WatchTogetherInfoModal;
