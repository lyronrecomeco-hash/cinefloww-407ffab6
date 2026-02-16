import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, Star, Clock, Calendar, Users, Clapperboard, Tv } from "lucide-react";
import Navbar from "@/components/Navbar";
import ContentRow from "@/components/ContentRow";
import { getMovieById, movies } from "@/data/movies";

const Details = () => {
  const { id } = useParams();
  const movie = getMovieById(Number(id));

  if (!movie) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Conteúdo não encontrado</h1>
          <Link to="/" className="text-primary hover:underline text-sm">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const related = movies.filter((m) => m.id !== movie.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Backdrop */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
        <img
          src={movie.backdrop}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-60 z-10 px-4 sm:px-6 lg:px-12 pb-20">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 max-w-7xl">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="w-[200px] sm:w-[240px] lg:w-[280px] rounded-2xl overflow-hidden shadow-2xl shadow-background/80 border border-white/10">
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 animate-fade-in">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>

            <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider border border-primary/30 mb-4">
              {movie.type === "series" ? "Série" : "Filme"}
            </span>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-1.5">
                <Star className="w-5 h-5 text-primary fill-primary" />
                <span className="text-foreground font-semibold text-lg">{movie.rating}</span>
                <span className="text-muted-foreground text-sm">/10</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                {movie.duration}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4" />
                {movie.year}
              </div>
              {movie.seasons && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Tv className="w-4 h-4" />
                  {movie.seasons} Temporadas
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {movie.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-secondary-foreground"
                >
                  {genre}
                </span>
              ))}
            </div>

            <p className="text-secondary-foreground/80 leading-relaxed mb-8 max-w-2xl">
              {movie.overview}
            </p>

            <div className="flex items-center gap-3 mb-10">
              <button className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25">
                <Play className="w-5 h-5 fill-current" />
                Assistir Agora
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="glass p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Clapperboard className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Diretor</span>
                </div>
                <p className="text-muted-foreground text-sm">{movie.director}</p>
              </div>
              <div className="glass p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Elenco</span>
                </div>
                <p className="text-muted-foreground text-sm">{movie.cast.join(", ")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <ContentRow title="Você também pode gostar" movies={related} />
        </div>
      </div>
    </div>
  );
};

export default Details;
