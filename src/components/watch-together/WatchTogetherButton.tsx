import { useState } from "react";
import { Users } from "lucide-react";
import CreateRoomModal from "./CreateRoomModal";
import JoinRoomModal from "./JoinRoomModal";

interface WatchTogetherButtonProps {
  profileId: string | null;
  tmdbId: number;
  contentType: string;
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  onRoomJoined: (roomCode: string) => void;
}

const WatchTogetherButton = ({
  profileId, tmdbId, contentType, title, posterPath, season, episode, onRoomJoined,
}: WatchTogetherButtonProps) => {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!profileId) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-medium hover:bg-white/20 hover:border-primary/30 transition-all duration-200 group"
        >
          <Users className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Assistir Junto</span>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute bottom-full right-0 mb-2 w-56 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 z-50 shadow-2xl">
              <button
                onClick={() => { setShowMenu(false); setShowCreate(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foreground hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Criar Sala</p>
                  <p className="text-xs text-muted-foreground">Convide amigos</p>
                </div>
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowJoin(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foreground hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <span className="text-sm">🔗</span>
                </div>
                <div className="text-left">
                  <p className="font-medium">Entrar numa Sala</p>
                  <p className="text-xs text-muted-foreground">Cole o código</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateRoomModal
          profileId={profileId}
          tmdbId={tmdbId}
          contentType={contentType}
          title={title}
          posterPath={posterPath}
          season={season}
          episode={episode}
          onClose={() => setShowCreate(false)}
          onCreated={(code) => { setShowCreate(false); onRoomJoined(code); }}
        />
      )}

      {showJoin && (
        <JoinRoomModal
          profileId={profileId}
          onClose={() => setShowJoin(false)}
          onJoined={(code) => { setShowJoin(false); onRoomJoined(code); }}
        />
      )}
    </>
  );
};

export default WatchTogetherButton;
