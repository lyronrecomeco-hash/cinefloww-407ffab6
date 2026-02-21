import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MousePointer, Power, PowerOff, Loader2, Save, TrendingUp, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ResponsiveContainer } from "recharts";

const AdsMetricaPage = () => {
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [smartlink, setSmartlink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clicks, setClicks] = useState<any[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [validatedClicks, setValidatedClicks] = useState(0);
  const [clicksByDay, setClicksByDay] = useState<{ day: string; clicks: number; validated: number }[]>([]);
  const [clicksByHour, setClicksByHour] = useState<{ hour: string; clicks: number }[]>([]);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["ads_enabled", "ads_smartlink"]);

    if (data) {
      for (const s of data) {
        if (s.key === "ads_enabled") {
          const v = s.value;
          setAdsEnabled(v === true || v === "true" || v === '"true"');
        }
        if (s.key === "ads_smartlink") {
          // Handle both raw string and JSON-encoded string
          let link = String(s.value || "");
          // Remove surrounding quotes if JSON-encoded
          if (link.startsWith('"') && link.endsWith('"')) {
            try { link = JSON.parse(link); } catch {}
          }
          setSmartlink(link);
        }
      }
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, count } = await supabase
      .from("ad_clicks")
      .select("*", { count: "exact" })
      .gte("clicked_at", sevenDaysAgo)
      .order("clicked_at", { ascending: false });

    if (data) {
      setClicks(data);
      setTotalClicks(count || data.length);
      setValidatedClicks(data.filter((c: any) => c.validated).length);

      // Group by day
      const dayMap: Record<string, { clicks: number; validated: number }> = {};
      const hourMap: Record<string, number> = {};
      for (const c of data) {
        const d = new Date(c.clicked_at);
        const dayKey = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (!dayMap[dayKey]) dayMap[dayKey] = { clicks: 0, validated: 0 };
        dayMap[dayKey].clicks++;
        if (c.validated) dayMap[dayKey].validated++;

        const hKey = `${d.getHours()}h`;
        hourMap[hKey] = (hourMap[hKey] || 0) + 1;
      }
      setClicksByDay(Object.entries(dayMap).map(([day, v]) => ({ day, ...v })).reverse());
      
      const hours = [];
      for (let i = 0; i < 24; i++) {
        const hk = `${i}h`;
        hours.push({ hour: hk, clicks: hourMap[hk] || 0 });
      }
      setClicksByHour(hours);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), loadMetrics()]).finally(() => setLoading(false));
  }, [loadSettings, loadMetrics]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("ads-clicks-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_clicks" }, () => loadMetrics())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMetrics]);

  const handleSave = async () => {
    setSaving(true);
    const entries: [string, any][] = [
      ["ads_enabled", adsEnabled],
      ["ads_smartlink", smartlink],
    ];
    for (const [key, value] of entries) {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      // Store as proper JSON value (boolean stays boolean, string stays string)
      const jsonValue = typeof value === "string" ? JSON.stringify(value) : value;

      if (existing) {
        await supabase.from("site_settings").update({ value: jsonValue }).eq("key", key);
      } else {
        await supabase.from("site_settings").insert({ key, value: jsonValue });
      }
    }
    toast.success("Configurações de ADS salvas!");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const conversionRate = totalClicks > 0 ? ((validatedClicks / totalClicks) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-3">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          ADS Métrica
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Configure e monitore seus anúncios</p>
      </div>

      {/* Config Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Power className="w-4 h-4 text-primary" />
          Configuração
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status dos ADS</p>
            <p className="text-xs text-muted-foreground">{adsEnabled ? "Ativado — anúncios estão sendo exibidos" : "Desativado — nenhum anúncio será exibido"}</p>
          </div>
          <button
            onClick={() => setAdsEnabled(!adsEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${adsEnabled ? "bg-primary" : "bg-white/10"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${adsEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Smartlink (Adsterra)</label>
          <input
            type="url"
            value={smartlink}
            onChange={(e) => setSmartlink(e.target.value)}
            placeholder="https://www.effectivegatecpm.com/..."
            className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configurações
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Cliques (7d)", value: totalClicks, icon: MousePointer, color: "text-blue-400" },
          { label: "Validados", value: validatedClicks, icon: Eye, color: "text-green-400" },
          { label: "Taxa Conversão", value: `${conversionRate}%`, icon: TrendingUp, color: "text-primary" },
          { label: "Status", value: adsEnabled ? "Ativo" : "Inativo", icon: adsEnabled ? Power : PowerOff, color: adsEnabled ? "text-green-400" : "text-red-400" },
        ].map((s, i) => (
          <div key={i} className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clicks by day */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="text-sm font-semibold mb-3">Cliques por Dia (7 dias)</h3>
          {clicksByDay.length > 0 ? (
            <ChartContainer config={{ clicks: { label: "Cliques", color: "hsl(var(--primary))" }, validated: { label: "Validados", color: "hsl(142 76% 36%)" } }} className="h-[200px] w-full">
              <BarChart data={clicksByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="validated" fill="var(--color-validated)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum dado ainda</p>
          )}
        </div>

        {/* Clicks by hour */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="text-sm font-semibold mb-3">Distribuição por Hora (hoje)</h3>
          {clicksByHour.some(h => h.clicks > 0) ? (
            <ChartContainer config={{ clicks: { label: "Cliques", color: "hsl(var(--primary))" } }} className="h-[200px] w-full">
              <AreaChart data={clicksByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="clicks" fill="var(--color-clicks)" fillOpacity={0.2} stroke="var(--color-clicks)" />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum dado ainda</p>
          )}
        </div>
      </div>

      {/* Recent clicks table */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
        <h3 className="text-sm font-semibold mb-3">Últimos Cliques</h3>
        {clicks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="text-left py-2 px-2">Data</th>
                  <th className="text-left py-2 px-2">Conteúdo</th>
                  <th className="text-left py-2 px-2">Visitante</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {clicks.slice(0, 20).map((c: any) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="py-2 px-2 text-muted-foreground">{new Date(c.clicked_at).toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-2">{c.content_title || "—"}</td>
                    <td className="py-2 px-2 text-muted-foreground">{c.visitor_id?.slice(0, 8)}...</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.validated ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {c.validated ? "Validado" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum clique registrado</p>
        )}
      </div>
    </div>
  );
};

export default AdsMetricaPage;
