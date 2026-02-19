import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MDFiOWNkYjllNDQ0NjkxMDJiODk5YjQ0YjU2MWQ5ZCIsIm5iZiI6MTc3MTIzMDg1My43NjYsInN1YiI6IjY5OTJkNjg1NzZjODAxNTdmMjFhZjMxMSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.c47JvphccOz_oyaUuQWCHQ1mXAsSH01OB14vKE2uenw";
const TMDB_BASE = "https://api.themoviedb.org/3";
const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

function sanitizeDate(d: string | null | undefined): string | null {
  if (!d || d === "0000-00-00" || d.startsWith("0000")) return null;
  return d;
}

interface JsonItem {
  id: number;
  name: string;
  type: "movie" | "tv";
  original_name: string;
  link: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    
    // Auto mode: called with items array directly (self-chain or admin trigger)
    const isAutoMode = body.auto === true;
    
    if (!isAutoMode) {
      // Manual mode: verify admin auth
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const authHeader = req.headers.get("Authorization");
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader || "" } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      const { data: roles } = await adminClient
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin");
      if (!roles?.length) throw new Error("Not admin");
    }

    const items: JsonItem[] = body.items || [];
    const offset: number = body.offset || 0;
    const batchSize: number = body.batch_size || 200;

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No items provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const batch = items.slice(offset, offset + batchSize);
    if (batch.length === 0) {
      return new Response(
        JSON.stringify({ success: true, imported: 0, skipped: 0, total: items.length, done: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get existing TMDB IDs to skip
    const tmdbIds = batch.map(i => i.id);
    const { data: existing } = await adminClient
      .from("content")
      .select("tmdb_id, content_type")
      .in("tmdb_id", tmdbIds);

    const existingSet = new Set(
      (existing || []).map((e: any) => `${e.tmdb_id}-${e.content_type}`)
    );

    const toImport = batch.filter(item => {
      const ct = item.type === "movie" ? "movie" : "series";
      return !existingSet.has(`${item.id}-${ct}`);
    });

    console.log(`[import-json] Batch offset=${offset}, total=${batch.length}, new=${toImport.length}, skipped=${batch.length - toImport.length}`);

    // Log skipped items
    const skippedCount = batch.length - toImport.length;

    // Enrich via TMDB in parallel (8 workers)
    const enriched: any[] = [];
    const queue = [...toImport];

    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const tmdbType = item.type === "movie" ? "movie" : "tv";
        try {
          const url = `${TMDB_BASE}/${tmdbType}/${item.id}?language=pt-BR&append_to_response=external_ids`;
          const res = await fetch(url, { headers: tmdbHeaders });
          if (res.ok) {
            const d = await res.json();
            const title = d.title || d.name || item.name || "Sem título";
            const contentType = item.type === "movie" ? "movie" : "series";
            const hasOverview = d.overview && d.overview.length > 10;

            enriched.push({
              tmdb_id: item.id,
              content_type: contentType,
              title,
              original_title: d.original_title || d.original_name || item.original_name || null,
              overview: d.overview || "",
              poster_path: d.poster_path || null,
              backdrop_path: d.backdrop_path || null,
              release_date: sanitizeDate(d.release_date || d.first_air_date),
              vote_average: d.vote_average || 0,
              runtime: d.runtime || null,
              imdb_id: d.imdb_id || d.external_ids?.imdb_id || null,
              number_of_seasons: d.number_of_seasons || null,
              number_of_episodes: d.number_of_episodes || null,
              status: hasOverview ? "published" : "draft",
              featured: false,
              audio_type: ["legendado"],
            });

            // Log success to resolve_logs
            await adminClient.from("resolve_logs").insert({
              tmdb_id: item.id,
              title,
              content_type: contentType,
              provider: "json-import",
              success: true,
              video_url: null,
              video_type: null,
              error_message: null,
            });
          } else if (res.status === 404) {
            // Log 404
            await adminClient.from("resolve_logs").insert({
              tmdb_id: item.id,
              title: item.name || `TMDB #${item.id}`,
              content_type: item.type === "movie" ? "movie" : "series",
              provider: "json-import",
              success: false,
              error_message: "TMDB 404 - não encontrado",
            });
          }
        } catch (err) {
          await adminClient.from("resolve_logs").insert({
            tmdb_id: item.id,
            title: item.name || `TMDB #${item.id}`,
            content_type: item.type === "movie" ? "movie" : "series",
            provider: "json-import",
            success: false,
            error_message: `Erro: ${err instanceof Error ? err.message : "unknown"}`,
          });
        }
      }
    }

    const workers = Array.from({ length: Math.min(8, toImport.length || 1) }, () => worker());
    await Promise.all(workers);

    // Upsert in batches of 100
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < enriched.length; i += 100) {
      const chunk = enriched.slice(i, i + 100);
      const { error } = await adminClient.from("content").upsert(chunk, {
        onConflict: "tmdb_id,content_type",
      });
      if (error) {
        errors.push(error.message);
      } else {
        imported += chunk.length;
      }
    }

    const done = offset + batchSize >= items.length;
    const nextOffset = offset + batchSize;

    // Self-chain if more to process
    if (!done) {
      const selfUrl = `${supabaseUrl}/functions/v1/import-json-catalog`;
      fetch(selfUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          auto: true,
          items,
          offset: nextOffset,
          batch_size: batchSize,
        }),
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped: skippedCount,
        enriched_count: enriched.length,
        batch_processed: batch.length,
        next_offset: done ? null : nextOffset,
        done,
        errors: errors.slice(0, 3),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Import JSON error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
