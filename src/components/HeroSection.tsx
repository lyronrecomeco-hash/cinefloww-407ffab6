import { Play, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Movie } from "@/data/movies";
import heroBanner from "@/assets/hero-banner.jpg";

interface HeroSectionProps {
  movie: Movie;
}

const HeroSection = ({ movie }: HeroSectionProps) => {
  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBanner}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-end pb-20 lg:pb-28 px-4 sm:px-6 lg:px-12">
        <div className="max-w-2xl animate-fade-in">
          {/* Badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider border border-primary/30">
              Em destaque
            </span>
            <span className="text-muted-foreground text-sm">{movie.year}</span>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold mb-4 leading-tight">
            {movie.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="text-primary font-semibold text-base">★ {movie.rating}</span>
            </span>
            <span>{movie.duration}</span>
            <span className="hidden sm:inline">
              {movie.genres.slice(0, 3).join(" • ")}
            </span>
          </div>

          {/* Overview */}
          <p className="text-secondary-foreground/80 text-sm sm:text-base leading-relaxed mb-8 line-clamp-3 max-w-xl">
            {movie.overview}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25">
              <Play className="w-5 h-5 fill-current" />
              Assistir
            </button>
            <Link
              to={`/detalhes/${movie.id}`}
              className="flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 rounded-2xl glass glass-hover font-semibold text-sm sm:text-base"
            >
              <Info className="w-5 h-5" />
              Detalhes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
