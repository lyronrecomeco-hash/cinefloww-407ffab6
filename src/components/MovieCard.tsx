import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Movie } from "@/data/movies";

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  return (
    <Link
      to={`/detalhes/${movie.id}`}
      className="group flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px]"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 card-shine">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-background/60 backdrop-blur-md text-xs font-semibold border border-white/10">
          <Star className="w-3 h-3 text-primary fill-primary" />
          {movie.rating}
        </div>

        {/* Type badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-primary/20 backdrop-blur-md text-primary text-[10px] font-semibold uppercase tracking-wider border border-primary/30">
          {movie.type === "series" ? "Série" : "Filme"}
        </div>
      </div>

      {/* Info */}
      <h3 className="font-display font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
        {movie.title}
      </h3>
      <p className="text-muted-foreground text-xs mt-1">
        {movie.year} • {movie.genres[0]}
      </p>
    </Link>
  );
};

export default MovieCard;
