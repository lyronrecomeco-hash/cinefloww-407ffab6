import { useState, useEffect, useCallback, useRef } from "react";
import { X, Play, ExternalLink, RefreshCw, ChevronRight, Shield, ChevronDown, Mic, Subtitles, Video } from "lucide-react";

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

interface Provider {
  name: string;
  tag: string;
  buildUrl: (tmdbId: number, imdbId: string | null | undefined, type: "movie" | "tv", season?: number, episode?: number) => string;
  externalOnly?: boolean;
}

const PROVIDERS: Provider[] = [
  {
    name: "Embed.su",
    tag: "Multi-server",
    buildUrl: (tmdbId, _imdbId, type, season, episode) =>
      type === "movie" ? `https://embed.su/embed/movie/${tmdbId}` : `https://embed.su/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`,
  },
  {
    name: "VidSrc",
    tag: "Rápido",
    buildUrl: (tmdbId, _imdbId, type, season, episode) =>
      type === "movie" ? `https://vidsrc.net/embed/movie/${tmdbId}` : `https://vidsrc.net/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`,
  },
  {
    name: "VidSrc.icu",
    tag: "Alternativo",
    buildUrl: (tmdbId, _imdbId, type, season, episode) =>
      type === "movie" ? `https://vidsrc.icu/embed/movie/${tmdbId}` : `https://vidsrc.icu/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`,
  },
  {
    name: "SuperFlix",
    tag: "PT-BR",
    externalOnly: true,
    buildUrl: (tmdbId, imdbId, type, season, episode) => {
      const apiType = type === "movie" ? "filme" : "serie";
      const id = type === "movie" ? (imdbId || String(tmdbId)) : String(tmdbId);
      let url = type === "movie" ? `https://superflixapi.one/${apiType}/${id}` : `https://superflixapi.one/${apiType}/${id}/${season ?? 1}/${episode ?? 1}`;
      return url.replace(/\/$/, "");
    },
  },
];

const AUDIO_BADGES: Record<string, { icon: typeof Mic; label: string; className: string }> = {
  dublado: { icon: Mic, label: "Dublado PT-BR", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  legendado: { icon: Subtitles, label: "Legendado", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  cam: { icon: Video, label: "CAM", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

const PlayerModal = ({ tmdbId, imdbId, type, season, episode, title, audioTypes = [], onClose }: PlayerModalProps) => {
  const [currentProviderIdx, setCurrentProviderIdx] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showProviders, setShowProviders] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const provider = PROVIDERS[currentProviderIdx];
  const rawUrl = provider.buildUrl(tmdbId, imdbId, type, season, episode);
  const iframeSrc = provider.externalOnly ? null : rawUrl;

  useEffect(() => {
    setIframeError(false);
    const timer = setTimeout(() => setIframeError(true), 12000);
    return () => clearTimeout(timer);
  }, [iframeKey, currentProviderIdx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const nextProvider = useCallback(() => {
    setIframeError(false);
    setCurrentProviderIdx((i) => (i + 1) % PROVIDERS.length);
    setIframeKey((k) => k + 1);
  }, []);

  const selectProvider = useCallback((idx: number) => {
    setIframeError(false);
    setCurrentProviderIdx(idx);
    setIframeKey((k) => k + 1);
    setShowProviders(false);
  }, []);

  const retryIframe = useCallback(() => { setIframeError(false); setIframeKey((k) => k + 1); }, []);
  const openExternal = useCallback(() => { window.open(rawUrl, "_blank", "noopener,noreferrer"); }, [rawUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
      <div className="relative w-full max-w-5xl max-h-[95vh] glass-strong overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-primary fill-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold truncate">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {type === "tv" && season && episode && <span className="text-[10px] text-muted-foreground">T{season} • E{episode}</span>}
                
                {/* Audio badges */}
                {audioTypes.map((at) => {
                  const badge = AUDIO_BADGES[at];
                  if (!badge) return null;
                  const Icon = badge.icon;
                  return (
                    <span key={at} className={`text-[9px] px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${badge.className}`}>
                      <Icon className="w-2.5 h-2.5" />{badge.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            {/* Provider selector */}
            <div className="relative">
              <button onClick={() => setShowProviders(!showProviders)}
                className="h-8 px-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 hover:bg-white/10 transition-colors text-[11px] font-medium">
                {provider.name}
                <ChevronDown className={`w-3 h-3 transition-transform ${showProviders ? "rotate-180" : ""}`} />
              </button>
              {showProviders && (
                <div className="absolute top-full mt-1 right-0 w-48 glass-strong z-50 p-1.5">
                  {PROVIDERS.map((p, i) => (
                    <button key={p.name} onClick={() => selectProvider(i)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        i === currentProviderIdx ? "bg-primary/15 text-primary" : "hover:bg-white/5 text-foreground"
                      }`}>
                      <span className="font-medium">{p.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                        p.externalOnly ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-muted-foreground"
                      }`}>{p.externalOnly ? "Nova aba" : p.tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={nextProvider} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors" title="Próximo">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={retryIframe} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors" title="Recarregar">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={openExternal} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors" title="Nova aba">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {/* Anti-ads overlay */}
          <div className="absolute top-0 left-0 right-0 h-[3px] z-20 pointer-events-auto bg-background" />
          <div className="absolute bottom-0 left-0 right-0 h-[3px] z-20 pointer-events-auto bg-background" />

          {iframeSrc ? (
            <iframe key={iframeKey} ref={iframeRef} src={iframeSrc}
              className="absolute inset-0 w-full h-full" allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              style={{ border: 0 }} scrolling="no" title={title} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center p-6 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{provider.name}</h3>
                <p className="text-sm text-muted-foreground mb-5">Este provedor abre em nova aba para melhor experiência.</p>
                <button onClick={openExternal}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all mx-auto">
                  <ExternalLink className="w-4 h-4" />Abrir {provider.name}
                </button>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {iframeError && iframeSrc && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-30">
              <div className="text-center p-6 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{provider.name} com acesso restrito</h3>
                <p className="text-sm text-muted-foreground mb-5">Tente outro provedor ou abra em nova aba.</p>
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                  <button onClick={nextProvider} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90">
                    <ChevronRight className="w-4 h-4" />Próximo
                  </button>
                  <button onClick={openExternal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass glass-hover font-semibold text-sm">
                    <ExternalLink className="w-4 h-4" />Nova Aba
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {PROVIDERS.map((p, i) => (
                    <button key={p.name} onClick={() => selectProvider(i)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                        i === currentProviderIdx ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                      }`}>{p.name}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar with audio info */}
        {audioTypes.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/10 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] text-muted-foreground flex-shrink-0">Disponível em:</span>
            {audioTypes.map((at) => {
              const badge = AUDIO_BADGES[at];
              if (!badge) return null;
              const Icon = badge.icon;
              return (
                <span key={at} className={`text-[10px] px-2 py-1 rounded-lg border font-medium flex items-center gap-1.5 flex-shrink-0 ${badge.className}`}>
                  <Icon className="w-3 h-3" />{badge.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerModal;
