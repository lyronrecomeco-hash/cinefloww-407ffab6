import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Search, Ban, CheckCircle, Shield, Clock, Eye, X, Loader2, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  ip_hash: string | null;
  last_login_at: string | null;
  login_count: number;
  banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  event: string;
  ip_hash: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const UsersPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [userLogs, setUserLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [stats, setStats] = useState({ total: 0, banned: 0, today: 0 });
  const { toast } = useToast();

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const p = (data as Profile[]) || [];
    setProfiles(p);

    const today = new Date().toISOString().split("T")[0];
    setStats({
      total: p.length,
      banned: p.filter((u) => u.banned).length,
      today: p.filter((u) => u.created_at.startsWith(today)).length,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();

    // Realtime
    const channel = supabase
      .channel("admin-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchProfiles();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProfiles]);

  const openDetail = async (profile: Profile) => {
    setSelected(profile);
    setLogsLoading(true);
    setBanReason(profile.ban_reason || "");

    const { data } = await supabase
      .from("auth_audit_log")
      .select("*")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    setUserLogs((data as AuditLog[]) || []);
    setLogsLoading(false);
  };

  const toggleBan = async (profile: Profile) => {
    const newBanned = !profile.banned;
    await supabase
      .from("profiles")
      .update({
        banned: newBanned,
        ban_reason: newBanned ? banReason || "Violação dos termos de uso" : null,
        banned_at: newBanned ? new Date().toISOString() : null,
      })
      .eq("user_id", profile.user_id);

    // Log the action
    await supabase.from("auth_audit_log").insert({
      user_id: profile.user_id,
      event: newBanned ? "admin_ban" : "admin_unban",
      metadata: { reason: banReason, admin: true },
    });

    toast({
      title: newBanned ? "Usuário banido" : "Usuário desbanido",
      description: `${profile.email} foi ${newBanned ? "banido" : "desbanido"}.`,
    });

    setSelected(null);
    fetchProfiles();
  };

  const filtered = profiles.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.ip_hash || "").includes(search)
  );

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de contas e segurança</p>
        </div>
        <button
          onClick={fetchProfiles}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.today}</p>
          <p className="text-xs text-muted-foreground">Hoje</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{stats.banned}</p>
          <p className="text-xs text-muted-foreground">Banidos</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email, nome ou IP..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Users list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhum usuário encontrado</p>
        ) : (
          filtered.map((profile) => (
            <button
              key={profile.id}
              onClick={() => openDetail(profile)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(profile.display_name || profile.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.display_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {profile.banned && (
                  <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-medium">
                    BANIDO
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground hidden sm:block">
                  {formatDate(profile.created_at)}
                </span>
                <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass-strong rounded-3xl p-6 animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>

            {/* User header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {(selected.display_name || selected.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">{selected.display_name || "Sem nome"}</h3>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Criado em</p>
                <p className="text-xs font-medium">{formatDate(selected.created_at)}</p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Último login</p>
                <p className="text-xs font-medium">{formatDate(selected.last_login_at)}</p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Logins</p>
                <p className="text-xs font-medium">{selected.login_count}</p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">IP Hash</p>
                <p className="text-xs font-mono">{selected.ip_hash || "—"}</p>
              </div>
            </div>

            {/* Ban section */}
            <div className="glass rounded-xl p-4 mb-6">
              <p className="text-xs font-medium mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {selected.banned ? "Usuário banido" : "Ações de segurança"}
              </p>
              {selected.banned && (
                <p className="text-xs text-destructive mb-2">Motivo: {selected.ban_reason || "Não especificado"}</p>
              )}
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Motivo do banimento..."
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-xs mb-3 focus:outline-none focus:border-primary/50"
                maxLength={200}
              />
              <button
                onClick={() => toggleBan(selected)}
                className={`w-full h-10 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  selected.banned
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                }`}
              >
                {selected.banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                {selected.banned ? "Desbanir" : "Banir usuário"}
              </button>
            </div>

            {/* Audit logs */}
            <div>
              <p className="text-xs font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Histórico de atividade
              </p>
              {logsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : userLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem registros</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {userLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] text-xs">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        log.event.includes("fail") || log.event.includes("ban") ? "bg-destructive" :
                        log.event.includes("success") || log.event.includes("signup") ? "bg-emerald-400" :
                        "bg-muted-foreground"
                      }`} />
                      <span className="font-mono text-muted-foreground">{log.event}</span>
                      <span className="ml-auto text-muted-foreground/60">{formatDate(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
