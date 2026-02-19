import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Bookmark, Trash2, ClipboardPaste, X, Loader2, Check, UserCheck } from "lucide-react";
import { getMyList, removeFromMyList, MyListItem } from "@/lib/myList";
import { toSlug } from "@/lib/slugify";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const IMG_BASE = "https://image.tmdb.org/t/p/w342";

const MyListPage = () => {
  const [items, setItems] = useState<MyListItem[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Import flow state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [sourceProfile, setSourceProfile] = useState<{ id: string; name: string; itemCount: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setItems(getMyList());
  }, []);

  const handleRemove = (item: MyListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromMyList(item.tmdb_id, item.content_type);
    setItems(getMyList());
  };

  const handleClick = (item: MyListItem) => {
    const route = item.content_type === "movie" ? "filme" : "serie";
    navigate(`/${route}/${toSlug(item.title, item.tmdb_id)}`);
  };

  const handleSearchCode = async () => {
    const trimmed = importCode.trim().toUpperCase();
    if (!trimmed) return;

    setSearching(true);
    setSourceProfile(null);

    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, name")
        .eq("share_code", trimmed)
        .single();

      if (!profile) {
        toast({ title: "Código não encontrado", description: "Verifique o código e tente novamente", variant: "destructive" });
        setSearching(false);
        return;
      }

      // Count their items
      const { count } = await supabase
        .from("my_list")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id);

      setSourceProfile({ id: profile.id, name: profile.name, itemCount: count || 0 });

      if ((count || 0) === 0) {
        toast({ title: "Lista vazia", description: "Este perfil não tem itens na lista" });
      } else {
        setShowConfirmModal(true);
        setShowImportModal(false);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível buscar", variant: "destructive" });
    }
    setSearching(false);
  };

  const handleConfirmImport = async () => {
    if (!sourceProfile) return;

    const activeProfile = localStorage.getItem("lyneflix_active_profile");
    if (!activeProfile) {
      toast({ title: "Erro", description: "Selecione um perfil primeiro", variant: "destructive" });
      return;
    }
    const myProfileId = JSON.parse(activeProfile).id;

    setImporting(true);
    try {
      const { data: sourceList } = await supabase
        .from("my_list")
        .select("tmdb_id, content_type, title, poster_path")
        .eq("profile_id", sourceProfile.id);

      if (!sourceList?.length) {
        toast({ title: "Lista vazia", description: "Nenhum item encontrado" });
        setImporting(false);
        return;
      }

      let count = 0;
      for (const item of sourceList) {
        const { error } = await supabase.from("my_list").upsert(
          {
            profile_id: myProfileId,
            tmdb_id: item.tmdb_id,
            content_type: item.content_type,
            title: item.title,
            poster_path: item.poster_path,
          },
          { onConflict: "profile_id,tmdb_id,content_type" }
        );
        if (!error) count++;
      }

      toast({
        title: "Lista importada!",
        description: `${count} itens de ${sourceProfile.name} adicionados à sua lista`,
      });

      setShowConfirmModal(false);
      setSourceProfile(null);
      setImportCode("");
    } catch {
      toast({ title: "Erro", description: "Não foi possível importar", variant: "destructive" });
    }
    setImporting(false);
  };

  const resetImport = () => {
    setShowImportModal(false);
    setShowConfirmModal(false);
    setSourceProfile(null);
    setImportCode("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 sm:pt-24 lg:pt-28 px-3 sm:px-6 lg:px-12 pb-20">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">Minha Lista</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {items.length > 0 ? `${items.length} título${items.length > 1 ? "s" : ""} salvo${items.length > 1 ? "s" : ""}` : "Nenhum título salvo"}
            </p>
          </div>
          {/* Import button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span className="hidden sm:inline">Importar Lista</span>
            <span className="sm:hidden">Importar</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Sua lista está vazia</p>
            <p className="text-sm mt-1">Adicione filmes e séries para assistir depois!</p>
            <button
              onClick={() => setShowImportModal(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <ClipboardPaste className="w-4 h-4" />
              Importar lista de um amigo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 sm:gap-4 lg:gap-5">
            {items.map((item) => (
              <button
                key={`${item.tmdb_id}-${item.content_type}`}
                onClick={() => handleClick(item)}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card/50 border border-white/5 hover:border-primary/30 transition-all duration-300 hover:scale-[1.03] text-left"
              >
                <div className="aspect-[2/3] relative overflow-hidden">
                  {item.poster_path ? (
                    <img
                      src={`${IMG_BASE}${item.poster_path}`}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Bookmark className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    onClick={(e) => handleRemove(item, e)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/70 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                    title="Remover da lista"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-primary/80 text-[9px] font-bold text-primary-foreground uppercase">
                    {item.content_type === "movie" ? "Filme" : item.content_type === "dorama" ? "Dorama" : "Série"}
                  </div>
                </div>
                <div className="p-2 sm:p-2.5">
                  <p className="text-[11px] sm:text-xs font-medium text-foreground truncate">{item.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Import Code Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={resetImport}>
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold">Importar Lista</h2>
              <button onClick={resetImport} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Cole o código de compartilhamento de um colega para importar a lista dele.
              </p>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Código de compartilhamento
                </label>
                <input
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="LYNE-XXXXXX"
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-center uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-colors"
                  maxLength={12}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSearchCode()}
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={resetImport}
                className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSearchCode} disabled={searching || !importCode.trim()}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
                {searching ? "Buscando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Import Modal */}
      {showConfirmModal && sourceProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={resetImport}>
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold">Confirmar importação</h2>
              <button onClick={resetImport} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <UserCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Você está importando a lista de</p>
                <p className="text-lg font-bold mt-1">{sourceProfile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {sourceProfile.itemCount} título{sourceProfile.itemCount > 1 ? "s" : ""} serão adicionados à sua lista
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                Código: <span className="font-mono">{importCode.trim().toUpperCase()}</span>
              </p>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={resetImport}
                className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmImport} disabled={importing}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Importando...</>
                ) : (
                  <><Check className="w-4 h-4" />Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MyListPage;
