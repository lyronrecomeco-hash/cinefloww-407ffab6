import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, Check, X, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MDFiOWNkYjllNDQ0NjkxMDJiODk5YjQ0YjU2MWQ5ZCIsIm5iZiI6MTc3MTIzMDg1My43NjYsInN1YiI6IjY5OTJkNjg1NzZjODAxNTdmMjFhZjMxMSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.c47JvphccOz_oyaUuQWCHQ1mXAsSH01OB14vKE2uenw";

const CategoriesManager = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const slugify = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      slug: slugify(newName.trim()),
      description: newDesc.trim() || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Categoria criada!" });
      setNewName(""); setNewDesc("");
      fetchCategories();
    }
    setAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("categories").update({
      name: editName.trim(),
      slug: slugify(editName.trim()),
      description: editDesc.trim() || null,
    }).eq("id", id);
    if (!error) { setEditId(null); fetchCategories(); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover categoria "${name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) fetchCategories();
  };

  const handleSyncTMDB = async () => {
    setSyncing(true);
    try {
      const movieRes = await fetch("https://api.themoviedb.org/3/genre/movie/list?language=pt-BR", {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
      });
      const tvRes = await fetch("https://api.themoviedb.org/3/genre/tv/list?language=pt-BR", {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
      });
      const movieData = await movieRes.json();
      const tvData = await tvRes.json();

      // Merge unique genres
      const allGenres = new Map<string, string>();
      [...(movieData.genres || []), ...(tvData.genres || [])].forEach((g: { id: number; name: string }) => {
        allGenres.set(g.name, slugify(g.name));
      });

      // Get existing category slugs
      const { data: existing } = await supabase.from("categories").select("slug");
      const existingSlugs = new Set((existing || []).map((c: any) => c.slug));

      // Insert only new ones
      const toInsert = Array.from(allGenres.entries())
        .filter(([, slug]) => !existingSlugs.has(slug))
        .map(([name, slug]) => ({ name, slug }));

      if (toInsert.length > 0) {
        await supabase.from("categories").insert(toInsert);
        toast({ title: `${toInsert.length} categorias importadas do TMDB!` });
      } else {
        toast({ title: "Tudo sincronizado!", description: "Nenhuma nova categoria encontrada." });
      }
      fetchCategories();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">Categorias</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{categories.length} categorias</p>
        </div>
        <button
          onClick={handleSyncTMDB}
          disabled={syncing}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-primary/15 border border-primary/20 text-primary text-xs sm:text-sm font-medium hover:bg-primary/25 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar TMDB
        </button>
      </div>

      {/* Add form */}
      <div className="glass p-4 sm:p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Nova Categoria</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da categoria"
            className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="glass p-8 sm:p-12 text-center">
          <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-xs sm:text-sm">Nenhuma categoria criada</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="glass p-3 rounded-xl">
                {editId === cat.id ? (
                  <div className="space-y-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-sm" placeholder="Descrição" />
                    <div className="flex gap-1.5">
                      <button onClick={() => handleUpdate(cat.id)} className="flex-1 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs gap-1"><Check className="w-3 h-3" />Salvar</button>
                      <button onClick={() => setEditId(null)} className="flex-1 h-8 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center text-xs gap-1"><X className="w-3 h-3" />Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.slug} {cat.description ? `• ${cat.description}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditDesc(cat.description || ""); }} className="w-7 h-7 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(cat.id, cat.name)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block glass overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Nome</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Slug</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Descrição</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      {editId === cat.id ? (
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-sm w-full" />
                      ) : (
                        <span className="text-sm font-medium">{cat.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{cat.slug}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {editId === cat.id ? (
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-sm w-full" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{cat.description || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {editId === cat.id ? (
                          <>
                            <button onClick={() => handleUpdate(cat.id)} className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditId(null)} className="w-7 h-7 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditDesc(cat.description || ""); }} className="w-7 h-7 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center hover:bg-white/10"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(cat.id, cat.name)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoriesManager;
