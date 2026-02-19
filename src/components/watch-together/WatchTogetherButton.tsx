import { useState } from "react";
import { Users } from "lucide-react";
import CreateRoomModal from "./CreateRoomModal";
import JoinRoomModal from "./JoinRoomModal";
import WatchTogetherInfoModal from "./WatchTogetherInfoModal";

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
  const [showInfo, setShowInfo] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isLoggedIn = !!profileId;

  // Step 1: Always show info modal first
  const handleButtonClick = () => {
    setShowInfo(true);
  };

  // Step 2: After info modal, show create/join menu (only if logged in)
  const handleContinue = () => {
    setShowInfo(false);
    setShowMenu(true);
  };

  return (
    <>
      {/* Always visible button */}
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-medium hover:bg-white/20 hover:border-primary/30 transition-all duration-200 group"
      >
        <Users className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">Assistir Junto</span>
      </button>

      {/* Create/Join dropdown menu */}
      {showMenu && (
        <div className="fixed inset-0 z-[9998]">
          <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-[9999] w-56 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl"
            style={{
              bottom: "auto",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <p className="text-xs text-muted-foreground px-4 pt-2 pb-1 font-medium">O que deseja fazer?</p>
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
        </div>
      )}

      {/* Step 1: Info/explanation modal */}
      {showInfo && (
        <WatchTogetherInfoModal
          isLoggedIn={isLoggedIn}
          onClose={() => setShowInfo(false)}
          onContinue={handleContinue}
        />
      )}

      {/* Step 3a: Create room modal */}
      {showCreate && profileId && (
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

      {/* Step 3b: Join room modal */}
      {showJoin && profileId && (
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
