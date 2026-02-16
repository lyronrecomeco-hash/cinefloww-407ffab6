import { useEffect } from "react";
import { X, Play } from "lucide-react";

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

function buildPlayerUrl(tmdbId: number, imdbId: string | null | undefined, type: "movie" | "tv", season?: number, episode?: number): string {
  if (type === "movie") {
    // Filmes: aceita IMDB (tt...) ou TMDB numérico
    const id = imdbId || String(tmdbId);
    return `${BASE}/filme/${id}`;
  }
  // Séries: usa TMDB ID
  let url = `${BASE}/serie/${tmdbId}`;
  if (season != null && episode != null) {
    url += `/${season}/${episode}`;
  }
  // Customizações: ocultar lista de eps e link externo
  url += "#noLink";
  return url;
}

const PlayerModal = ({ tmdbId, imdbId, type, season, episode, title, onClose }: PlayerModalProps) => {
  const playerUrl = buildPlayerUrl(tmdbId, imdbId, type, season, episode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player iframe */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={playerUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            title={title}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;
