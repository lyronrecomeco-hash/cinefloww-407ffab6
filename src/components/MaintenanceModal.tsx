import { useState, useEffect } from "react";
import { X, Database, Clock } from "lucide-react";
import LyneflixLogo from "@/components/LyneflixLogo";

const STORAGE_KEY = "lyneflix_maintenance_v2";
const INTERVAL_HOURS = 2; // show again every 2 hours

const MaintenanceModal = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last) {
      const elapsed = Date.now() - parseInt(last, 10);
      if (elapsed < INTERVAL_HOURS * 3600000) return;
    }
    // Small delay to not block initial render
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismiss} />

      <div className="relative w-full max-w-md glass rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-4 text-center">
          <LyneflixLogo size="lg" animate className="py-2" />

          <div className="flex items-center justify-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">
              🔧 Atualização em Andamento
            </h2>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-3">
            <p className="text-sm text-foreground/90 leading-relaxed">
              A <strong>LyneFlix</strong> está passando por uma <strong>atualização massiva do banco de dados</strong> para melhorar sua experiência.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-primary text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Previsão: até 24 horas</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Durante esse período, algumas funcionalidades podem ficar lentas ou indisponíveis temporariamente. 
            O conteúdo voltará ao normal em breve!
          </p>

          <div className="space-y-2 text-left text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">O que pode acontecer:</p>
            <ul className="space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">⚠️</span>
                <span>Login pode demorar mais que o normal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">⚠️</span>
                <span>Alguns filmes/séries podem não carregar o player</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">⚠️</span>
                <span>Páginas podem carregar mais lentamente</span>
              </li>
            </ul>
          </div>

          <button
            onClick={dismiss}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Entendi, continuar navegando
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;
