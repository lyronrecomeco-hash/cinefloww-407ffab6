import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, Shield, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import lyneflixLogo from "@/assets/lyneflix-L-logo.png";

interface AdGateModalProps {
  open: boolean;
  onClose: () => void;
  onValidated: () => void;
  contentTitle?: string;
  tmdbId?: number;
}

const AdGateModal = ({ open, onClose, onValidated, contentTitle, tmdbId }: AdGateModalProps) => {
  const [phase, setPhase] = useState<"info" | "waiting" | "validated">("info");
  const [progress, setProgress] = useState(0);
  const [smartlink, setSmartlink] = useState("");

  // Load smartlink from settings
  useEffect(() => {
    if (!open) return;
    setPhase("info");
    setProgress(0);
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "ads_smartlink")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setSmartlink(String(data.value).replace(/"/g, ""));
      });
  }, [open]);

  const handleClick = useCallback(() => {
    if (!smartlink) {
      onValidated();
      return;
    }

    // Open smartlink
    window.open(smartlink, "_blank");

    // Track click
    const visitorId = localStorage.getItem("_cf_vid") || "unknown";
    supabase.from("ad_clicks").insert({
      visitor_id: visitorId,
      content_title: contentTitle || null,
      tmdb_id: tmdbId || null,
      validated: false,
    }).then(() => {});

    // Start validation progress
    setPhase("waiting");
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        // Mark as validated
        supabase.from("ad_clicks").insert({
          visitor_id: visitorId,
          content_title: contentTitle || null,
          tmdb_id: tmdbId || null,
          validated: true,
        }).then(() => {});
        setPhase("validated");
        setTimeout(() => onValidated(), 800);
      }
    }, 80); // ~4 seconds total

    return () => clearInterval(interval);
  }, [smartlink, contentTitle, tmdbId, onValidated]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-card/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with logo */}
        <div className="relative p-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={lyneflixLogo} alt="LyneFlix" className="w-8 h-8" />
            <div>
              <h2 className="font-display text-base font-bold">Quase lá!</h2>
              <p className="text-[10px] text-muted-foreground">Acesso rápido e gratuito</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {phase === "info" && (
            <>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Um passo rápido para assistir</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Clique no botão abaixo, aguarde alguns segundos e volte. 
                      É rápido, seguro e nos ajuda a manter o site gratuito. 😊
                    </p>
                  </div>
                </div>
              </div>

              {contentTitle && (
                <p className="text-xs text-center text-muted-foreground">
                  Preparando: <span className="text-foreground font-medium">{contentTitle}</span>
                </p>
              )}

              <button
                onClick={handleClick}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4" />
                Continuar para Assistir
              </button>

              <p className="text-[10px] text-center text-muted-foreground/60">
                100% seguro • Sem downloads • Apenas 1 clique
              </p>
            </>
          )}

          {phase === "waiting" && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-sm font-medium">Validando acesso...</p>
                <p className="text-xs text-muted-foreground mt-1">Aguarde, isso leva poucos segundos</p>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-center text-muted-foreground">{progress}%</p>
            </div>
          )}

          {phase === "validated" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3 animate-scale-in">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-sm font-semibold text-green-400">Acesso Liberado!</p>
              <p className="text-xs text-muted-foreground mt-1">Redirecionando para o player...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdGateModal;
