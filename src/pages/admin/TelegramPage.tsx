import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Search, RefreshCw, Film, Tv, Trash2, Check, Clock, Package, ChevronLeft, ChevronRight, Settings, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Ingestion {
  id: string;
  title: string;
  synopsis: string | null;
  content_type: string;
  season: number | null;
  episode: number | null;
  episode_title: string | null;
  telegram_file_id: string;
  telegram_unique_id: string;
  file_size: number | null;
  duration: number | null;
  resolution: string | null;
  file_name: string | null;
  mime_type: string | null;
  status: string;
  telegram_user_id: number;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-400", icon: Clock },
  confirmed: { label: "Confirmado", color: "text-blue-400", icon: Check },
  processed: { label: "Processado", color: "text-green-400", icon: Package },
};

const TelegramPage = () => {
  const [items, setItems] = useState<Ingestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [webhookActive, setWebhookActive] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [authorizedId, setAuthorizedId] = useState("");
  const [authorizedIds, setAuthorizedIds] = useState<number[]>([]);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, processed: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Count
    let countQ = supabase.from("telegram_ingestions").select("id", { count: "exact", head: true });
    if (statusFilter !== "all") countQ = countQ.eq("status", statusFilter);
    if (filter) countQ = countQ.ilike("title", `%${filter}%`);
    const { count } = await countQ;
    setTotalCount(count || 0);

    // Fetch
    const from = (page - 1) * ITEMS_PER_PAGE;
    let q = supabase.from("telegram_ingestions").select("*").order("created_at", { ascending: false }).range(from, from + ITEMS_PER_PAGE - 1);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (filter) q = q.ilike("title", `%${filter}%`);
    const { data } = await q;
    setItems((data as Ingestion[]) || []);

    // Stats
    const [{ count: p }, { count: c }, { count: pr }] = await Promise.all([
      supabase.from("telegram_ingestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("telegram_ingestions").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("telegram_ingestions").select("id", { count: "exact", head: true }).eq("status", "processed"),
    ]);
    setStats({ pending: p || 0, confirmed: c || 0, processed: pr || 0 });

    setLoading(false);
  }, [page, statusFilter, filter]);

  const fetchAuthorizedIds = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "telegram_authorized_ids")
      .maybeSingle();
    if (data?.value) {
      setAuthorizedIds((data.value as any)?.ids || []);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAuthorizedIds();
  }, [fetchData, fetchAuthorizedIds]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("telegram_ingestions_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "telegram_ingestions" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const setupWebhook = async () => {
    setSettingUp(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/telegram-bot?setup=true`);
      const data = await res.json();
      if (data.webhook?.ok) {
        setWebhookActive(true);
        toast({ title: "Webhook ativado!", description: "Bot Telegram conectado." });
      } else {
        toast({ title: "Erro", description: JSON.stringify(data), variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro", description: String(e), variant: "destructive" });
    }
    setSettingUp(false);
  };

  const addAuthorizedId = async () => {
    const id = parseInt(authorizedId);
    if (!id) return;
    const newIds = [...authorizedIds, id];
    await supabase.from("site_settings").upsert(
      { key: "telegram_authorized_ids", value: { ids: newIds } as any },
      { onConflict: "key" }
    );
    setAuthorizedIds(newIds);
    setAuthorizedId("");
    toast({ title: "ID autorizado adicionado!" });
  };

  const removeAuthorizedId = async (id: number) => {
    const newIds = authorizedIds.filter(i => i !== id);
    await supabase.from("site_settings").upsert(
      { key: "telegram_authorized_ids", value: { ids: newIds } as any },
      { onConflict: "key" }
    );
    setAuthorizedIds(newIds);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("telegram_ingestions").update({ status }).eq("id", id);
    toast({ title: `Status atualizado para ${STATUS_MAP[status]?.label || status}` });
  };

  const deleteItem = async (id: string) => {
    await supabase.from("telegram_ingestions").delete().eq("id", id);
    toast({ title: "Item removido." });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  };

  const formatDuration = (secs: number | null) => {
    if (!secs) return "N/A";
    return `${Math.floor(secs / 60)}min`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Bot Telegram</h1>
            <p className="text-xs text-muted-foreground">Ingestão de mídia via Telegram</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={setupWebhook}
            disabled={settingUp}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm hover:bg-primary/30"
          >
            {settingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : webhookActive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {webhookActive ? "Webhook Ativo" : "Ativar Webhook"}
          </button>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border text-sm hover:bg-muted">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-yellow-400" },
          { label: "Confirmados", value: stats.confirmed, icon: Check, color: "text-blue-400" },
          { label: "Processados", value: stats.processed, icon: Package, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Authorized IDs */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">IDs Autorizados (Telegram)</span>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            value={authorizedId}
            onChange={e => setAuthorizedId(e.target.value)}
            placeholder="ID do Telegram..."
            className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
          />
          <button onClick={addAuthorizedId} className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm">Adicionar</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {authorizedIds.map(id => (
            <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs">
              {id}
              <button onClick={() => removeAuthorizedId(id)} className="text-destructive hover:text-destructive/80">×</button>
            </span>
          ))}
          {authorizedIds.length === 0 && <span className="text-xs text-muted-foreground">Nenhum ID autorizado. Adicione seu ID do Telegram.</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}
            placeholder="Buscar..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/30 border border-border text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        {["all", "pending", "confirmed", "processed"].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              statusFilter === s ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_MAP[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const st = STATUS_MAP[item.status] || STATUS_MAP.pending;
            const StIcon = st.icon;
            return (
              <div key={item.id} className="p-4 rounded-xl bg-muted/10 border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {item.content_type === "movie" ? <Film className="w-4 h-4 text-primary" /> : <Tv className="w-4 h-4 text-primary" />}
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className={`flex items-center gap-1 text-xs ${st.color}`}>
                        <StIcon className="w-3 h-3" /> {st.label}
                      </span>
                    </div>
                    {item.synopsis && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.synopsis}</p>}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {item.season != null && <span className="px-2 py-0.5 rounded bg-muted">T{item.season}E{item.episode}</span>}
                      <span className="px-2 py-0.5 rounded bg-muted">{formatSize(item.file_size)}</span>
                      <span className="px-2 py-0.5 rounded bg-muted">{formatDuration(item.duration)}</span>
                      {item.resolution && <span className="px-2 py-0.5 rounded bg-muted">{item.resolution}</span>}
                      <span className="px-2 py-0.5 rounded bg-muted font-mono">{item.id.slice(0, 8)}</span>
                      <span className="px-2 py-0.5 rounded bg-muted">{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    {item.status === "pending" && (
                      <button onClick={() => updateStatus(item.id, "confirmed")} className="p-2 rounded-lg hover:bg-muted text-blue-400" title="Confirmar">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {item.status === "confirmed" && (
                      <button onClick={() => updateStatus(item.id, "processed")} className="p-2 rounded-lg hover:bg-muted text-green-400" title="Marcar processado">
                        <Package className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteItem(item.id)} className="p-2 rounded-lg hover:bg-muted text-destructive" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="text-center text-muted-foreground py-10">Nenhuma ingestão encontrada.</p>}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-muted/30 border border-border disabled:opacity-30 hover:bg-muted/50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-muted/30 border border-border disabled:opacity-30 hover:bg-muted/50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TelegramPage;
