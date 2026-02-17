import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MDFiOWNkYjllNDQ0NjkxMDJiODk5YjQ0YjU2MWQ5ZCIsIm5iZiI6MTc3MTIzMDg1My43NjYsInN1YiI6IjY5OTJkNjg1NzZjODAxNTdmMjFhZjMxMSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.c47JvphccOz_oyaUuQWCHQ1mXAsSH01OB14vKE2uenw";
const TMDB_BASE = "https://api.themoviedb.org/3";
const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

// ── Scrape CineVeo category page ──────────────────────────────────────
async function scrapeCineveoPage(
  type: "movie" | "tv",
  page: number,
): Promise<{ tmdbId: number; title: string; posterPath: string | null }[]> {
  const url = `https://cineveo.site/category.php?type=${type}&page=${page}`;
  console.log(`[scrape] Fetching: ${url}`);

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,*/*" },
  });
  if (!res.ok) {
    console.log(`[scrape] Page ${page} returned ${res.status}`);
    return [];
  }

  const html = await res.text();

  // Extract all data-tmdb IDs from poster-action-btn elements
  const items: { tmdbId: number; title: string; posterPath: string | null }[] =
    [];
  const cardRegex =
    /class="media-card-item[^"]*"[^>]*>[\s\S]*?alt="([^"]*)"[\s\S]*?data-tmdb="(\d+)"/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    items.push({
      tmdbId: parseInt(match[2]),
      title: match[1] || "Sem título",
      posterPath: null, // will be enriched from TMDB
    });
  }

  // Fallback: just extract data-tmdb if the combined regex fails
  if (items.length === 0) {
    const simpleRegex = /data-tmdb="(\d+)"/g;
    let m;
    while ((m = simpleRegex.exec(html)) !== null) {
      const id = parseInt(m[1]);
      if (!items.some((i) => i.tmdbId === id)) {
        items.push({ tmdbId: id, title: "Sem título", posterPath: null });
      }
    }
  }

  // Also extract poster paths from TMDB image URLs in the same page
  const posterRegex =
    /data-tmdb="(\d+)"[\s\S]*?src="https:\/\/image\.tmdb\.org\/t\/p\/w342([^"]+)"/g;
  // Alternative: find poster before data-tmdb
  const posterRegex2 =
    /src="https:\/\/image\.tmdb\.org\/t\/p\/w342([^"]+)"[\s\S]*?data-tmdb="(\d+)"/g;

  let pm;
  while ((pm = posterRegex2.exec(html)) !== null) {
    const posterPath = pm[1];
    const tmdbId = parseInt(pm[2]);
    const item = items.find((i) => i.tmdbId === tmdbId);
    if (item) item.posterPath = posterPath;
  }

  console.log(`[scrape] Page ${page}: found ${items.length} items`);
  return items;
}

// ── Get total pages from CineVeo ──────────────────────────────────────
async function getTotalPages(type: "movie" | "tv"): Promise<number> {
  const url = `https://cineveo.site/category.php?type=${type}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,*/*" },
  });
  if (!res.ok) return 1;
  const html = await res.text();

  // Find last page number in pagination: ...>534</button>
  const pageMatches = [
    ...html.matchAll(
      /class="pagination-btn[^"]*">(\d+)<\/button>/g,
    ),
  ];
  let maxPage = 1;
  for (const m of pageMatches) {
    const p = parseInt(m[1]);
    if (p > maxPage) maxPage = p;
  }
  return maxPage;
}

// ── Fetch TMDB details in batch ──────────────────────────────────────
async function fetchTMDBDetails(
  tmdbId: number,
  type: "movie" | "tv",
): Promise<any | null> {
  try {
    const url = `${TMDB_BASE}/${type}/${tmdbId}?language=pt-BR&append_to_response=external_ids`;
    const res = await fetch(url, { headers: tmdbHeaders });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin role
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles?.length) throw new Error("Not admin");

    const body = await req.json();
    const contentType: string = body.content_type || "movie";
    const maxPages: number = body.max_pages || 10;
    const startPage: number = body.start_page || 1;
    const enrichWithTmdb: boolean = body.enrich !== false;

    // Map content_type to cineveo type
    const cineveoType: "movie" | "tv" =
      contentType === "movie" ? "movie" : "tv";
    const dbContentType = contentType; // movie, series, dorama, anime

    // Get total pages available
    const totalAvailable = await getTotalPages(cineveoType);
    const endPage = Math.min(startPage + maxPages - 1, totalAvailable);
    console.log(
      `[import] Scraping CineVeo ${cineveoType} pages ${startPage}-${endPage} (total available: ${totalAvailable})`,
    );

    // Scrape all pages
    const allItems: {
      tmdbId: number;
      title: string;
      posterPath: string | null;
    }[] = [];
    const seenIds = new Set<number>();

    for (let p = startPage; p <= endPage; p++) {
      const items = await scrapeCineveoPage(cineveoType, p);
      for (const item of items) {
        if (!seenIds.has(item.tmdbId)) {
          seenIds.add(item.tmdbId);
          allItems.push(item);
        }
      }
      // Small delay to avoid rate limiting
      if (p < endPage) await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`[import] Total unique items scraped: ${allItems.length}`);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches
    const BATCH_SIZE = 25;
    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      const batch = allItems.slice(i, i + BATCH_SIZE);

      // Optionally enrich with TMDB data
      const rows = [];
      for (const item of batch) {
        let detail: any = null;
        if (enrichWithTmdb) {
          detail = await fetchTMDBDetails(item.tmdbId, cineveoType);
        }

        if (detail) {
          rows.push({
            tmdb_id: item.tmdbId,
            imdb_id:
              detail.imdb_id || detail.external_ids?.imdb_id || null,
            content_type: dbContentType,
            title: detail.title || detail.name || item.title,
            original_title:
              detail.original_title || detail.original_name || null,
            overview: detail.overview || "",
            poster_path: detail.poster_path || item.posterPath,
            backdrop_path: detail.backdrop_path || null,
            release_date:
              detail.release_date || detail.first_air_date || null,
            vote_average: detail.vote_average || 0,
            runtime: detail.runtime || null,
            number_of_seasons: detail.number_of_seasons || null,
            number_of_episodes: detail.number_of_episodes || null,
            status: "published",
            featured: false,
            audio_type: ["legendado"],
            created_by: user.id,
          });
        } else {
          // Basic insert without TMDB enrichment
          rows.push({
            tmdb_id: item.tmdbId,
            content_type: dbContentType,
            title: item.title,
            poster_path: item.posterPath,
            status: "published",
            featured: false,
            audio_type: ["legendado"],
            created_by: user.id,
          });
        }
      }

      const { error } = await adminClient.from("content").upsert(rows, {
        onConflict: "tmdb_id,content_type",
        ignoreDuplicates: true,
      });

      if (error) {
        errors.push(`Batch ${i}: ${error.message}`);
        console.log(`[import] Batch error: ${error.message}`);
      } else {
        imported += rows.length;
      }

      // Rate limit TMDB calls
      if (enrichWithTmdb && i + BATCH_SIZE < allItems.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        total: allItems.length,
        pages_scraped: endPage - startPage + 1,
        total_pages: totalAvailable,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
