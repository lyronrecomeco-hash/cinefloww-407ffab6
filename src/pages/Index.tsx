import { Flame, Film, Tv, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ContentRow from "@/components/ContentRow";
import { movies, getTrending, getMovies, getSeries } from "@/data/movies";

const Index = () => {
  const featured = movies[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection movie={featured} />

      <div className="-mt-20 relative z-10 pb-20">
        <ContentRow
          title="Em Alta"
          movies={getTrending()}
          icon={<Flame className="w-4 h-4" />}
        />
        <ContentRow
          title="Filmes"
          movies={getMovies()}
          icon={<Film className="w-4 h-4" />}
        />
        <ContentRow
          title="Séries"
          movies={getSeries()}
          icon={<Tv className="w-4 h-4" />}
        />
        <ContentRow
          title="Recomendados"
          movies={[...movies].reverse()}
          icon={<Sparkles className="w-4 h-4" />}
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display font-bold text-lg">
            Cine<span className="text-gradient">flow</span>
          </span>
          <p className="text-muted-foreground text-xs">
            © 2025 Cineflow. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
