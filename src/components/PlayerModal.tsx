import { useState, useEffect, useCallback } from "react";
import { X, Play, ExternalLink, RefreshCw } from "lucide-react";

interface PlayerModalProps {
  tmdbId: number;
  imdbId?: string | null;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  onClose: () => void;
}

const BASE = "https://superflixapi.one";

function buildPlayerUrl(
  tmdbId: number,
  imdbId: string | null | undefined,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): string {
  const apiType = type === "movie" ? "filme" : "serie";
  const id = type === "movie" ? (imdbId || String(tmdbId)) : String(tmdbId);
  const s = type === "movie" ? "" : String(season ?? "");
  const e = type === "movie" ? "" : String(episode ?? "");
  let url = `${BASE}/${apiType}/${id}/${s}/${e}`;
  url = url.replace(/([^:])(\/\/{1,})/g, "$1/");
  url = url.replace(/\/$/, "");
  return url;
}

const PlayerModal = ({ tmdbId, imdbId, type, season, episode, title, onClose }: PlayerModalProps) => {
  const playerUrl = buildPlayerUrl(tmdbId, imdbId, type, season, episode);
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Show fallback after timeout (iframe may silently fail due to domain restrictions)
  useEffect(() => {
    const timer = setTimeout(() => setIframeError(true), 6000);
    return () => clearTimeout(timer);
  }, [iframeKey]);

  const openExternal = useCallback(() => {
    window.open(playerUrl, "_blank", "noopener,noreferrer");
  }, [playerUrl]);

  const retryIframe = useCallback(() => {
    setIframeError(false);
    setIframeKey(k => k + 1);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
      <div
        className="relative w-full max-w-5xl max-h-[90vh] glass-strong overflow-hidden animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary fill-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold truncate">{title}</h2>
              {type === "tv" && season && episode && (
                <p className="text-xs text-muted-foreground mt-0.5">T{season} • E{episode}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button
              onClick={retryIframe}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Tentar novamente"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openExternal}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player iframe */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            key={iframeKey}
            src={playerUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            style={{ border: 0 }}
            scrolling="no"
            title={title}
          />

          {/* Overlay when iframe likely blocked */}
          {iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-10">
              <div className="text-center p-6 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-primary fill-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Player com acesso restrito</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  O SuperFlix restringe embed para domínios autorizados. Abra em nova aba para assistir:
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                  <button
                    onClick={openExternal}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Player
                  </button>
                  <button
                    onClick={retryIframe}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl glass glass-hover font-semibold text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Embed
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  URL: <code className="text-primary/70 break-all">{playerUrl}</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;
