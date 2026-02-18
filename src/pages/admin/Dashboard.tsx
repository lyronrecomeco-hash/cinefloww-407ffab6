import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Film, Tv, Sparkles, Drama, Eye, TrendingUp, BarChart3, PieChart as PieChartIcon, Users, Globe, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LineChart, Line } from "recharts";

interface Stats {
  totalMovies: number;
  totalSeries: number;
  totalDoramas: number;
  totalAnimes: number;
  totalViews: number;
  recentContent: any[];
  viewsByType: { name: string; value: number }[];
  viewsByDay: { date: string; views: number }[];
}

interface VisitorStats {
  totalVisitors: number;
  uniqueVisitors: number;
  todayVisitors: number;
  visitorsPerDay: { date: string; total: number; unique: number }[];
  topHostnames: { hostname: string; count: number }[];
  currentHostname: string;
  blockedRequests: number;
}

const COLORS = ["hsl(217, 91%, 60%)", "hsl(250, 80%, 60%)", "hsl(160, 60%, 50%)", "hsl(340, 70%, 55%)"];

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalMovies: 0, totalSeries: 0, totalDoramas: 0, totalAnimes: 0,
    totalViews: 0, recentContent: [], viewsByType: [], viewsByDay: [],
  });
  const [visitorStats, setVisitorStats] = useState<VisitorStats>({
    totalVisitors: 0, uniqueVisitors: 0, todayVisitors: 0,
    visitorsPerDay: [], topHostnames: [], currentHostname: "", blockedRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [movies, series, doramas, animes, views, recent, viewsData] = await Promise.all([
          supabase.from("content").select("id", { count: "exact", head: true }).eq("content_type", "movie"),
          supabase.from("content").select("id", { count: "exact", head: true }).eq("content_type", "series"),
          supabase.from("content").select("id", { count: "exact", head: true }).eq("content_type", "dorama"),
          supabase.from("content").select("id", { count: "exact", head: true }).eq("content_type", "anime"),
          supabase.from("content_views").select("id", { count: "exact", head: true }),
          supabase.from("content").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("content_views").select("content_type, viewed_at"),
        ]);

        // Calculate views by type
        const typeMap: Record<string, number> = {};
        viewsData.data?.forEach((v: any) => {
          const t = v.content_type || "outro";
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const viewsByType = Object.entries(typeMap).map(([name, value]) => ({ 
          name: name === "movie" ? "Filmes" : name === "series" ? "Séries" : name === "dorama" ? "Doramas" : name === "anime" ? "Animes" : name, 
          value 
        }));

        // Calculate views by day (last 7 days)
        const dayMap: Record<string, number> = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dayMap[d.toISOString().split("T")[0]] = 0;
        }
        viewsData.data?.forEach((v: any) => {
          const day = v.viewed_at?.split("T")[0];
          if (day && dayMap[day] !== undefined) dayMap[day]++;
        });
        const viewsByDay = Object.entries(dayMap).map(([date, views]) => ({
          date: new Date(date).toLocaleDateString("pt-BR", { weekday: "short" }),
          views,
        }));

        setStats({
          totalMovies: movies.count || 0,
          totalSeries: series.count || 0,
          totalDoramas: doramas.count || 0,
          totalAnimes: animes.count || 0,
          totalViews: views.count || 0,
          recentContent: recent.data || [],
          viewsByType: viewsByType.length ? viewsByType : [{ name: "Sem dados", value: 0 }],
          viewsByDay,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    const fetchVisitorStats = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [allVisitors, todayVisitors, blockedLogs] = await Promise.all([
          supabase.from("site_visitors").select("visitor_id, hostname, visited_at").gte("visited_at", sevenDaysAgo).order("visited_at", { ascending: true }),
          supabase.from("site_visitors").select("visitor_id", { count: "exact", head: true }).gte("visited_at", todayStart),
          supabase.from("api_access_log").select("id", { count: "exact", head: true }).eq("blocked", true),
        ]);

        const visitors = allVisitors.data || [];
        const uniqueIds = new Set(visitors.map(v => v.visitor_id));

        // Visitors per day (last 7 days)
        const dayData: Record<string, { total: number; uniqueSet: Set<string> }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dayData[d.toISOString().split("T")[0]] = { total: 0, uniqueSet: new Set() };
        }
        visitors.forEach((v) => {
          const day = v.visited_at?.split("T")[0];
          if (day && dayData[day]) {
            dayData[day].total++;
            dayData[day].uniqueSet.add(v.visitor_id);
          }
        });
        const visitorsPerDay = Object.entries(dayData).map(([date, d]) => ({
          date: new Date(date).toLocaleDateString("pt-BR", { weekday: "short" }),
          total: d.total,
          unique: d.uniqueSet.size,
        }));

        // Top hostnames
        const hostMap: Record<string, number> = {};
        visitors.forEach((v) => {
          const h = v.hostname || "desconhecido";
          hostMap[h] = (hostMap[h] || 0) + 1;
        });
        const topHostnames = Object.entries(hostMap)
          .map(([hostname, count]) => ({ hostname, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Current hostname (most recent)
        const latest = visitors[visitors.length - 1];
        
        setVisitorStats({
          totalVisitors: visitors.length,
          uniqueVisitors: uniqueIds.size,
          todayVisitors: todayVisitors.count || 0,
          visitorsPerDay,
          topHostnames,
          currentHostname: latest?.hostname || window.location.hostname,
          blockedRequests: blockedLogs.count || 0,
        });
      } catch (err) {
        console.error("Error fetching visitor stats:", err);
      }
    };

    Promise.all([fetchStats(), fetchVisitorStats()]).finally(() => setLoading(false));

    // Realtime subscription for live visitor updates
    const channel = supabase
      .channel("visitors-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "site_visitors" }, () => {
        fetchVisitorStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { label: "Filmes", value: stats.totalMovies, icon: Film, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Séries", value: stats.totalSeries, icon: Tv, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Doramas", value: stats.totalDoramas, icon: Drama, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Animes", value: stats.totalAnimes, icon: Sparkles, color: "text-pink-400", bg: "bg-pink-400/10" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do seu catálogo</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Views + Visitors + Security cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display">{stats.totalViews}</p>
            <p className="text-xs text-muted-foreground">Visualizações</p>
          </div>
        </div>
        <div className="glass p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display">{visitorStats.uniqueVisitors}</p>
            <p className="text-xs text-muted-foreground">Visitantes Únicos (7d)</p>
          </div>
        </div>
        <div className="glass p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-400/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display">{visitorStats.todayVisitors}</p>
            <p className="text-xs text-muted-foreground">Acessos Hoje</p>
          </div>
        </div>
        <div className="glass p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-400/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display">{visitorStats.blockedRequests}</p>
            <p className="text-xs text-muted-foreground">Acessos Bloqueados</p>
          </div>
        </div>
      </div>

      {/* Current hostname info */}
      {visitorStats.currentHostname && (
        <div className="glass p-4 flex items-center gap-3">
          <Globe className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Hospedagem detectada:</span>
          <span className="text-sm font-semibold text-foreground">{visitorStats.currentHostname}</span>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visitors per day (REAL) */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-semibold text-sm">Visitantes Reais (7 dias)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={visitorStats.visitorsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(220, 25%, 13%)", border: "1px solid hsl(220, 20%, 18%)", borderRadius: "12px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(210, 40%, 98%)" }}
              />
              <Line type="monotone" dataKey="total" stroke="hsl(190, 80%, 55%)" strokeWidth={2} name="Total" dot={{ r: 3, fill: "hsl(190, 80%, 55%)" }} />
              <Line type="monotone" dataKey="unique" stroke="hsl(280, 70%, 60%)" strokeWidth={2} name="Únicos" dot={{ r: 3, fill: "hsl(280, 70%, 60%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Views per day */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Visualizações (7 dias)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.viewsByDay}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(220, 25%, 13%)", border: "1px solid hsl(220, 20%, 18%)", borderRadius: "12px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(210, 40%, 98%)" }}
              />
              <Area type="monotone" dataKey="views" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top hostnames */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-green-400" />
            <h3 className="font-display font-semibold text-sm">Links de Hospedagem</h3>
          </div>
          {visitorStats.topHostnames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Ainda sem dados de visitantes</p>
          ) : (
            <div className="space-y-3">
              {visitorStats.topHostnames.map((h, i) => (
                <div key={h.hostname} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                  <div className="w-7 h-7 rounded-lg bg-green-400/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-green-400">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.hostname}</p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">{h.count} acessos</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content by type */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Conteúdo por Tipo</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { name: "Filmes", value: stats.totalMovies },
              { name: "Séries", value: stats.totalSeries },
              { name: "Doramas", value: stats.totalDoramas },
              { name: "Animes", value: stats.totalAnimes },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(220, 25%, 13%)", border: "1px solid hsl(220, 20%, 18%)", borderRadius: "12px", fontSize: "12px" }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {[0, 1, 2, 3].map((i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Visualizações por Tipo</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.viewsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {stats.viewsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(220, 25%, 13%)", border: "1px solid hsl(220, 20%, 18%)", borderRadius: "12px", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent content */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Adicionados Recentemente</h3>
          </div>
          <div className="space-y-3">
            {stats.recentContent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum conteúdo adicionado ainda</p>
            ) : (
              stats.recentContent.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  {item.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt={item.title} className="w-8 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-12 rounded-lg bg-white/5 flex items-center justify-center"><Film className="w-3 h-3 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{item.content_type}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {item.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
