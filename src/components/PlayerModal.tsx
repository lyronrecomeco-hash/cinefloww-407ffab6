import { useState, useEffect, useCallback, useRef } from "react";
import { X, Play, ExternalLink, RefreshCw, ChevronRight, Mic, Subtitles, Video, Globe, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CustomPlayer from "./CustomPlayer";

interface PlayerModalProps {
  tmdbId: number;
  imdbId?: string | null;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  audioTypes?: string[];
  onClose: () => void;
}

interface VideoSource {
  url: string;
  quality: string;
  provider: string;
  type: "mp4" | "m3u8";
}

const AUDIO_OPTIONS = [
  { key: "dublado", icon: Mic, label: "Dublado PT-BR", description: "Áudio em português brasileiro" },
  { key: "legendado", icon: Subtitles, label: "Legendado", description: "Áudio original com legendas" },
  { key: "cam", icon: Video, label: "CAM", description: "Gravação de câmera" },
];

type Phase = "audio-select" | "extracting" | "custom" | "embed";

const PlayerModal = ({ tmdbId, imdbId, type, season, episode, title, audioTypes = [], onClose }: PlayerModalProps) => {
  const needsAudioSelect = audioTypes.length > 1;
  const [phase, setPhase] = useState<Phase>(needsAudioSelect ? "audio-select" : "extracting");
  const [selectedAudio, setSelectedAudio] = useState(audioTypes[0] || "legendado");
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [statusText, setStatusText] = useState("Extraindo vídeo...");
  const tried = useRef(false);

  // Build vidsrc.cc URL
  const vidsrcUrl = (() => {
    const id = imdbId || String(tmdbId);
    return type === "movie"
      ? `https://vidsrc.cc/v2/embed/movie/${id}`
      : `https://vidsrc.cc/v2/embed/tv/${id}/${season ?? 1}/${episode ?? 1}`;
  })();

  // Extraction logic
  useEffect(() => {
    if (phase !== "extracting" || tried.current) return;
    tried.current = true;

    (async () => {
      try {
        setStatusText("Buscando fontes diretas...");
        const { data, error } = await supabase.functions.invoke("extract-video", {
          body: { tmdb_id: tmdbId, imdb_id: imdbId, type, season, episode },
        });
        if (!error && data?.success && data.sources?.length > 0) {
          setSources(data.sources);
          setPhase("custom");
          return;
        }
      } catch (e) {
        console.error("Extraction failed:", e);
      }
      // Fallback to embed
      setStatusText("Carregando player...");
      setTimeout(() => setPhase("embed"), 600);
    })();
  }, [phase, tmdbId, imdbId, type, season, episode]);

  // Start extraction if no audio select needed
  useEffect(() => {
    if (!needsAudioSelect && phase === "audio-select") setPhase("extracting");
  }, []);

  // Escape + popup blocker
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    const orig = window.open;
    window.open = (() => null) as typeof window.open;
    return () => { window.removeEventListener("keydown", h); window.open = orig; };
  }, [onClose]);

  const handleAudioSelect = (key: string) => {
    setSelectedAudio(key);
    tried.current = false;
    setPhase("extracting");
  };

  const retryExtraction = () => {
    tried.current = false;
    setSources([]);
    setPhase("extracting");
  };

  const openExternal = () => {
    const orig = window.open;
    window.open = Window.prototype.open;
    window.open(vidsrcUrl, "_blank", "noopener,noreferrer");
    window.open = orig;
  };

  // ===== AUDIO SELECT =====
  if (phase === "audio-select") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
        <div className="relative w-full max-w-md glass-strong overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">Escolha o tipo de áudio</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {AUDIO_OPTIONS.filter(o => audioTypes.includes(o.key)).map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleAudioSelect(opt.key)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl glass glass-hover transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => { tried.current = false; setPhase("extracting"); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground hover:bg-white/10 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Pular seleção e assistir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== EXTRACTING =====
  if (phase === "extracting") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
        <div className="relative w-full max-w-sm glass-strong overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
          <div className="p-8 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h2 className="font-display text-lg font-bold mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== CUSTOM PLAYER (extracted sources) =====
  if (phase === "custom" && sources.length > 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black animate-fade-in">
        <CustomPlayer
          sources={sources}
          title={title}
          subtitle={type === "tv" && season && episode ? `T${season} • E${episode}` : undefined}
          onClose={onClose}
          onError={() => setPhase("embed")}
        />
      </div>
    );
  }

  // ===== EMBED PLAYER (vidsrc.cc iframe) =====
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
      <div className="relative w-full max-w-5xl max-h-[95vh] glass-strong overflow-hidden animate-scale-in flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-primary fill-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold truncate">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {type === "tv" && season && episode && (
                  <span className="text-[10px] text-muted-foreground">T{season} • E{episode}</span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 rounded-md border font-semibold bg-white/5 text-muted-foreground border-white/10">
                  VidSrc.cc
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button onClick={retryExtraction} className="h-8 px-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-1.5 hover:bg-primary/20 transition-colors text-[11px] font-medium text-primary" title="Tentar extrair vídeo direto">
              <Zap className="w-3 h-3" /> Extrair
            </button>
            <button onClick={openExternal} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors" title="Abrir em nova aba">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Iframe */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {/* Ad protection borders */}
          <div className="absolute top-0 left-0 right-0 h-[3px] z-20 bg-card" />
          <div className="absolute bottom-0 left-0 right-0 h-[3px] z-20 bg-card" />
          <div className="absolute top-0 left-0 w-[3px] h-full z-20 bg-card" />
          <div className="absolute top-0 right-0 w-[3px] h-full z-20 bg-card" />

          <iframe
            src={vidsrcUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            style={{ border: 0 }}
            title={title}
          />
        </div>

        {/* Bottom bar */}
        {audioTypes.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">Áudio:</span>
            {audioTypes.map(at => (
              <span key={at} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground font-medium capitalize whitespace-nowrap">
                {at}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerModal;
