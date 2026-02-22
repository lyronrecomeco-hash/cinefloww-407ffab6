import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LyneflixLogo from "@/components/LyneflixLogo";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "moderator"]);

      if (roleError || !roles?.length) {
        await supabase.auth.signOut();
        throw new Error("Acesso negado. Você não tem permissão de administrador.");
      }

      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Credenciais inválidas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <LyneflixLogo size="md" animate={false} className="mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary/70" />
            <span className="text-xs font-medium tracking-[0.15em] text-primary/70 uppercase">Painel Administrativo</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-strong rounded-2xl p-8">
          <h2 className="font-display text-xl font-bold text-center mb-1">Acesse sua conta</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Digite seus dados para entrar no painel.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>ENTRAR <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Dificuldades no acesso? Contatar o suporte
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
