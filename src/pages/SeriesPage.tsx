import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { getSeries } from "@/data/movies";
import { Tv } from "lucide-react";

const SeriesPage = () => {
  const allSeries = getSeries();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 lg:pt-28 px-4 sm:px-6 lg:px-12 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Tv className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Séries</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
          {allSeries.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeriesPage;
