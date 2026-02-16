export interface Movie {
  id: number;
  title: string;
  poster: string;
  backdrop: string;
  year: number;
  rating: number;
  duration: string;
  genres: string[];
  overview: string;
  type: "movie" | "series";
  seasons?: number;
  cast: string[];
  director: string;
}

const POSTERS = {
  action1: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
  action2: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911kpUpFoagMKbD.jpg",
  scifi1: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
  scifi2: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  drama1: "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDhRkUoMOECpjay.jpg",
  drama2: "https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg",
  horror1: "https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDIkZiM.jpg",
  comedy1: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
};

const BACKDROPS = {
  dark: "https://image.tmdb.org/t/p/w1280/bQLrHIRNEVE21G0fRR3Kps01Pzb.jpg",
  city: "https://image.tmdb.org/t/p/w1280/k1KrbaCMACQiq7EA0Lesg6Kv1Gv.jpg",
  space: "https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
};

export const movies: Movie[] = [
  {
    id: 1,
    title: "Horizonte Negro",
    poster: POSTERS.scifi1,
    backdrop: BACKDROPS.space,
    year: 2025,
    rating: 8.7,
    duration: "2h 28min",
    genres: ["Ficção Científica", "Ação", "Thriller"],
    overview: "Em um futuro distante, uma tripulação é enviada para investigar um sinal misterioso vindo dos confins do espaço. O que encontram desafia tudo o que a humanidade pensava saber sobre o universo.",
    type: "movie",
    cast: ["Lucas Mendes", "Ana Vitória", "Carlos Eduardo", "Mariana Costa"],
    director: "Rafael Almeida",
  },
  {
    id: 2,
    title: "O Último Código",
    poster: POSTERS.action1,
    backdrop: BACKDROPS.city,
    year: 2025,
    rating: 8.2,
    duration: "2h 15min",
    genres: ["Ação", "Thriller", "Espionagem"],
    overview: "Um hacker brilhante descobre uma conspiração global que ameaça derrubar todos os sistemas financeiros do mundo. Com apenas 48 horas, ele precisa decodificar o último código antes que seja tarde demais.",
    type: "movie",
    cast: ["Pedro Santos", "Julia Ferreira", "Roberto Lima"],
    director: "Camila Rocha",
  },
  {
    id: 3,
    title: "Fragmentos",
    poster: POSTERS.drama1,
    backdrop: BACKDROPS.dark,
    year: 2024,
    rating: 9.1,
    duration: "5 Temporadas",
    genres: ["Drama", "Mistério", "Psicológico"],
    overview: "Uma psicóloga renomada começa a tratar um paciente cujas memórias fragmentadas revelam uma série de eventos perturbadores que conectam vários desaparecimentos na cidade.",
    type: "series",
    seasons: 5,
    cast: ["Isabela Torres", "Fernando Mello", "Beatriz Souza"],
    director: "Gustavo Henrique",
  },
  {
    id: 4,
    title: "Além da Tempestade",
    poster: POSTERS.action2,
    backdrop: BACKDROPS.city,
    year: 2025,
    rating: 7.8,
    duration: "1h 58min",
    genres: ["Ação", "Aventura", "Drama"],
    overview: "Após uma catástrofe natural devastadora, um grupo de sobreviventes precisa atravessar um país destruído em busca de um refúgio seguro, enfrentando perigos tanto naturais quanto humanos.",
    type: "movie",
    cast: ["Thiago Nogueira", "Amanda Reis", "Diego Costa"],
    director: "Patrícia Lopes",
  },
  {
    id: 5,
    title: "Sombras do Passado",
    poster: POSTERS.horror1,
    backdrop: BACKDROPS.dark,
    year: 2024,
    rating: 8.5,
    duration: "3 Temporadas",
    genres: ["Terror", "Suspense", "Sobrenatural"],
    overview: "Uma família se muda para uma mansão antiga no interior, onde eventos sobrenaturais começam a revelar os segredos sombrios dos antigos moradores e uma maldição que persegue gerações.",
    type: "series",
    seasons: 3,
    cast: ["Larissa Duarte", "Marcos Vinícius", "Camila Andrade"],
    director: "Bruno Nascimento",
  },
  {
    id: 6,
    title: "Conexão Perdida",
    poster: POSTERS.scifi2,
    backdrop: BACKDROPS.space,
    year: 2025,
    rating: 8.9,
    duration: "2h 35min",
    genres: ["Ficção Científica", "Drama", "Romance"],
    overview: "Em um mundo onde as memórias podem ser compartilhadas digitalmente, um técnico de memórias descobre um arquivo corrompido que contém a chave para resolver o mistério do desaparecimento de sua parceira.",
    type: "movie",
    cast: ["Rafael Oliveira", "Natália Monteiro", "André Barbosa"],
    director: "Sofia Cardoso",
  },
  {
    id: 7,
    title: "A Revolução Silenciosa",
    poster: POSTERS.drama2,
    backdrop: BACKDROPS.city,
    year: 2024,
    rating: 9.3,
    duration: "4 Temporadas",
    genres: ["Drama", "Político", "Thriller"],
    overview: "Em uma nação fictícia à beira do colapso, um grupo improvável de cidadãos comuns se une para derrubar um regime autoritário usando táticas não-violentas e tecnologia.",
    type: "series",
    seasons: 4,
    cast: ["Renata Azevedo", "Guilherme Prado", "Luana Martins"],
    director: "Eduardo Vasques",
  },
  {
    id: 8,
    title: "Risos no Escuro",
    poster: POSTERS.comedy1,
    backdrop: BACKDROPS.dark,
    year: 2025,
    rating: 7.5,
    duration: "1h 45min",
    genres: ["Comédia", "Drama", "Romance"],
    overview: "Um comediante em decadência recebe uma última chance de se apresentar em um grande show, mas precisa primeiro confrontar os fantasmas do seu passado e reconquistar a confiança dos que ama.",
    type: "movie",
    cast: ["Vinícius Alencar", "Fernanda Brito", "Lucas Cardoso"],
    director: "Mariana Figueiredo",
  },
];

export const getMovieById = (id: number) => movies.find((m) => m.id === id);
export const getMovies = () => movies.filter((m) => m.type === "movie");
export const getSeries = () => movies.filter((m) => m.type === "series");
export const getTrending = () => movies.filter((m) => m.rating >= 8.5);
export const getByGenre = (genre: string) => movies.filter((m) => m.genres.includes(genre));
