import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Loader2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ImportListPage = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleImport = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    const activeProfile = localStorage.getItem("lyneflix_active_profile");
    if (!activeProfile) {
      toast({ title: "Erro", description: "Selecione um perfil primeiro", variant: "destructive" });
      return;
    }
    const myProfileId = JSON.parse(activeProfile).id;

    setLoading(true);
    try {
      // Find the profile by share code
      const { data: sourceProfile } = await supabase
        .from("user_profiles")
        .select("id, name")
        .eq("share_code", trimmed)
        .single();

      if (!sourceProfile) {
        toast({ title: "Código não encontrado", description: "Verifique o código e tente novamente", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Get their list
      const { data: sourceList } = await supabase
        .from("my_list")
        .select("tmdb_id, content_type, title, poster_path")
        .eq("profile_id", sourceProfile.id);

      if (!sourceList?.length) {
        toast({ title: "Lista vazia", description: "Este perfil não tem itens na lista" });
        setLoading(false);
        return;
      }

      // Merge into my list (upsert)
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

      setImported(count);
      toast({
        title: "Lista importada!",
        description: `${count} itens de ${sourceProfile.name} adicionados à sua lista`,
      });
    } catch {
      toast({ title: "Erro", description: "Não foi possível importar", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <h1 className="font-display text-2xl font-bold mb-2">Importar Lista</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Cole o código de compartilhamento de um amigo para adicionar os itens da lista dele à sua.
        </p>

        <div className="glass-strong rounded-2xl p-6">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Código de compartilhamento
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="LYNE-XXXXXX"
            className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-center uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-colors mb-4"
            maxLength={12}
          />

          <button
            onClick={handleImport}
            disabled={loading || !code.trim()}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : imported > 0 ? (
              <>
                <Check className="w-4 h-4" />
                {imported} itens importados
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Importar Lista
              </>
            )}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ImportListPage;
