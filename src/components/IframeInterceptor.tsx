import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

interface IframeInterceptorProps {
  proxyUrl: string;
  onVideoFound: (url: string, type: "mp4" | "m3u8") => void;
  onError: () => void;
  onClose: () => void;
  title: string;
}

const IframeInterceptor = ({ proxyUrl, onVideoFound, onError, onClose, title }: IframeInterceptorProps) => {
  const [status, setStatus] = useState<"loading" | "intercepting" | "found">("loading");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const foundRef = useRef(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (foundRef.current) return;
    const data = event.data;
    if (data?.type === "__VIDEO_SOURCE__" && data.url) {
      const url = data.url as string;
      if (url.includes(".m3u8") || url.includes(".mp4") || url.includes("/master") || url.includes("/playlist")) {
        foundRef.current = true;
        setStatus("found");
        const vType: "mp4" | "m3u8" = url.includes(".mp4") ? "mp4" : "m3u8";
        // Small delay to ensure the video is ready
        setTimeout(() => onVideoFound(url, vType), 500);
      }
    }
  }, [onVideoFound]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    
    // Timeout: if no video found in 30s, give up
    timeoutRef.current = setTimeout(() => {
      if (!foundRef.current) {
        onError();
      }
    }, 30000);

    return () => {
      window.removeEventListener("message", handleMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleMessage, onError]);

  return (
    <div className="relative w-full h-full">
      {/* The proxy iframe - loads the player which triggers video interception */}
      <iframe
        src={proxyUrl}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups"
        onLoad={() => setStatus("intercepting")}
      />

      {/* Overlay while intercepting */}
      {status !== "found" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 pointer-events-none">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">
            {status === "loading" ? "Carregando player..." : "Detectando fonte de vídeo..."}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">{title}</p>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 text-white text-sm hover:bg-black/80 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );
};

export default IframeInterceptor;
