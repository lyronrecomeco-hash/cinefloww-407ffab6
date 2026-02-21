import { useState } from "react";
import {
  Users, X, MessageCircle, Phone, ArrowLeft, ArrowRight,
  Copy, Check, Loader2, LogIn, Zap, Share2, Play, Tv, Shield, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { createRoom, joinRoom } from "@/lib/watchRoom";

interface WatchTogetherButtonProps {
  profileId: string | null;
  tmdbId: number;
  contentType: string;
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  onRoomJoined: (roomCode: string, roomMode?: "chat" | "call") => void;
}

type Step = "intro" | "choose" | "create" | "join" | "created";

const INTRO_KEY = "lyneflix_wt_intro_seen";

const WatchTogetherButton = ({
  profileId, tmdbId, contentType, title, posterPath, season, episode, onRoomJoined,
}: WatchTogetherButtonProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<"chat" | "call">("chat");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const isLoggedIn = !!profileId;

  const handleOpen = () => {
    const seen = localStorage.getItem(INTRO_KEY);
    setOpen(true);
    setStep(seen ? "choose" : "intro");
    setError(null);
    setRoomCode(null);
    setJoinCode("");
    setCopied(false);
  };

  const handleClose = () => {
    setOpen(false);
    setStep("intro");
    setError(null);
    setLoading(false);
  };

  const handleIntroNext = () => {
    localStorage.setItem(INTRO_KEY, "1");
    setStep("choose");
  };

  const handleCreate = async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const room = await createRoom({
        hostProfileId: profileId,
        tmdbId, contentType, title, posterPath, season, episode,
        roomMode: mode,
      });
      if (room) {
        setRoomCode(room.room_code);
        setStep("created");
      }
    } catch (e: any) {
      setError(e.message || "Erro ao criar sala");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!profileId || !joinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const room = await joinRoom(joinCode.trim(), profileId);
      if (room) {
        const m = (room as any).room_mode === "call" ? "call" : "chat";
        handleClose();
        onRoomJoined(room.room_code, m as "chat" | "call");
      }
    } catch (e: any) {
      setError(e.message || "Erro ao entrar na sala");
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

  const stepTitle: Record<Step, string> = {
    intro: "Assistir Junto",
    choose: "Assistir Junto",
    create: "Criar Sala",
    join: "Entrar numa Sala",
    created: "Sala Criada!",
  };

  const canGoBack = step === "create" || step === "join";

  // Step indicator
  const getStepIndex = () => {
    if (step === "intro") return 0;
    if (step === "choose") return 1;
    if (step === "create" || step === "join") return 2;
    if (step === "created") return 3;
    return 0;
  };
  const totalSteps = step === "intro" ? 0 : (step === "created" ? 3 : step === "choose" ? 1 : 2);

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-[420px] bg-[hsl(220,25%,10%)] backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            {canGoBack && (
              <button
                onClick={() => { setStep("choose"); setError(null); }}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{stepTitle[step]}</h3>
              {step !== "intro" && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                  {step === "created" ? roomCode : title}
                  {season && episode ? ` • T${season}E${episode}` : ""}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "intro" && (
          <div className="flex gap-1 px-4 sm:px-5 pb-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors ${
                i <= getStepIndex() ? "bg-primary" : "bg-white/10"
              }`} />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          {/* STEP: Intro (first time) */}
          {step === "intro" && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Tv className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-base font-bold text-foreground mb-1">Assista com seus amigos!</h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[300px] mx-auto">
                  Crie uma sala e convide até 5 amigos para assistir ao mesmo tempo, com tudo sincronizado.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: Zap, color: "text-primary", label: "Player sincronizado em tempo real" },
                  { icon: MessageCircle, color: "text-blue-400", label: "Chat integrado com emojis" },
                  { icon: Phone, color: "text-green-400", label: "Chamada de voz criptografada" },
                  { icon: Shield, color: "text-amber-400", label: "Host controla a reprodução" },
                  { icon: Clock, color: "text-purple-400", label: "Sala ativa por até 6 horas" },
                ].map(({ icon: Icon, color, label }) => (
                  <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                    <span className="text-xs text-foreground/80">{label}</span>
                  </div>
                ))}
              </div>

              {isLoggedIn ? (
                <button
                  onClick={handleIntroNext}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                >
                  Prosseguir
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground text-center">Você precisa estar logado para usar.</p>
                  <button
                    onClick={() => { handleClose(); navigate("/conta"); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Fazer Login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP: Choose */}
          {step === "choose" && (
            <div className="space-y-3">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => setStep("create")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-foreground">Criar Sala</p>
                      <p className="text-[10px] text-muted-foreground">Convide amigos para assistir junto</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary/60 transition-colors" />
                  </button>

                  <button
                    onClick={() => setStep("join")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                      <span className="text-base">🔗</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-foreground">Entrar numa Sala</p>
                      <p className="text-[10px] text-muted-foreground">Cole o código do amigo</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary/60 transition-colors" />
                  </button>
                </>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <p className="text-sm text-foreground font-medium">Faça login para usar</p>
                  <p className="text-xs text-muted-foreground">Você precisa estar logado para criar ou entrar numa sala.</p>
                  <button
                    onClick={() => { handleClose(); navigate("/conta"); }}
                    className="w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Fazer Login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP: Create */}
          {step === "create" && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Modo da sala</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("chat")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      mode === "chat"
                        ? "border-primary/30 bg-primary/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <MessageCircle className={`w-5 h-5 ${mode === "chat" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${mode === "chat" ? "text-primary" : "text-foreground"}`}>Chat</p>
                      <p className="text-[9px] text-muted-foreground">Mensagens de texto</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("call")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      mode === "call"
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <Phone className={`w-5 h-5 ${mode === "call" ? "text-green-400" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${mode === "call" ? "text-green-400" : "text-foreground"}`}>Chamada</p>
                      <p className="text-[9px] text-muted-foreground">Voz em tempo real</p>
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 text-xs text-destructive text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                  mode === "call"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {loading ? "Criando..." : "Criar Sala"}
              </button>
            </div>
          )}

          {/* STEP: Join */}
          {step === "join" && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Código da sala</p>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM-XXXXXX"
                  maxLength={12}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-[0.12em] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/20 transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 text-xs text-destructive text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handleJoin}
                disabled={loading || !joinCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? "Entrando..." : "Entrar na Sala"}
              </button>
            </div>
          )}

          {/* STEP: Created (show code) */}
          {step === "created" && roomCode && (
            <div className="space-y-3">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Código da Sala</p>
                <p className="text-2xl font-mono font-bold text-primary tracking-[0.15em]">{roomCode}</p>
                {mode === "call" && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Phone className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] text-green-400 font-medium">Chamada de Voz</span>
                  </div>
                )}
              </div>

              <button
                onClick={copyCode}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.06] text-foreground text-xs font-medium hover:bg-white/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado!" : "Copiar Código"}
              </button>

              <button
                onClick={() => {
                  handleClose();
                  onRoomJoined(roomCode, mode);
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  mode === "call"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                Entrar na Sala
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-medium hover:bg-white/20 hover:border-primary/30 transition-all duration-200 group"
      >
        <Users className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">Assistir Junto</span>
      </button>

      {modal}
    </>
  );
};

export default WatchTogetherButton;
