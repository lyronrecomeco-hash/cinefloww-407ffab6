import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tmdb_id, imdb_id, content_type, audio_type, season, episode } = await req.json();

    if (!tmdb_id) {
      return new Response(JSON.stringify({ error: "tmdb_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cType = content_type || "movie";
    const aType = audio_type || "legendado";

    // 1. Check cache first
    let query = supabase
      .from("video_cache")
      .select("*")
      .eq("tmdb_id", tmdb_id)
      .eq("content_type", cType)
      .eq("audio_type", aType)
      .gt("expires_at", new Date().toISOString());

    if (season) query = query.eq("season", season);
    else query = query.is("season", null);
    if (episode) query = query.eq("episode", episode);
    else query = query.is("episode", null);

    const { data: cached } = await query.maybeSingle();

    if (cached) {
      console.log(`[extract] Cache hit for tmdb_id=${tmdb_id}`);
      return new Response(JSON.stringify({
        url: cached.video_url,
        type: cached.video_type,
        provider: cached.provider,
        cached: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build EmbedPlay embed URL
    const isMovie = cType === "movie";
    const embedId = imdb_id || tmdb_id;
    const embedPageUrl = isMovie
      ? `https://embedplayapi.site/embed/${embedId}`
      : `https://embedplayapi.site/embed/${embedId}/${season || 1}/${episode || 1}`;

    console.log(`[extract] Fetching embed page: ${embedPageUrl}`);

    const pageRes = await fetch(embedPageUrl, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://embedplayapi.site/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) {
      return new Response(JSON.stringify({ error: `EmbedPlay returned ${pageRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await pageRes.text();

    // 3. Parse movie ID and server IDs from the embed page
    const movieIdMatch = html.match(/data-movie-id="([^"]+)"/);
    const movieId = movieIdMatch?.[1];

    if (!movieId) {
      console.log("[extract] Could not find data-movie-id in embed page");
      return new Response(JSON.stringify({ error: "Movie not found on EmbedPlay", embed_url: embedPageUrl }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all server IDs
    const serverMatches = [...html.matchAll(/class="server[^"]*"\s+data-id="([^"]+)"/g)];
    const serverIds = serverMatches.map(m => m[1]);
    console.log(`[extract] Movie ID: ${movieId}, Servers: ${serverIds.join(", ")}`);

    if (serverIds.length === 0) {
      return new Response(JSON.stringify({ error: "No servers found", embed_url: embedPageUrl }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Try each server to get a stream link
    let videoUrl: string | null = null;
    let videoType: "m3u8" | "mp4" = "m3u8";
    let playerLink: string | null = null;

    for (const serverId of serverIds) {
      try {
        const apiUrl = `https://embedplayapi.site/ajax/get_stream_link?id=${serverId}&movie=${movieId}&is_init=false&captcha=&ref=`;
        console.log(`[extract] Trying server ${serverId}: ${apiUrl}`);

        const apiRes = await fetch(apiUrl, {
          headers: {
            "User-Agent": UA,
            "Referer": embedPageUrl,
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
          },
        });

        if (!apiRes.ok) {
          console.log(`[extract] Server ${serverId} returned ${apiRes.status}`);
          continue;
        }

        const contentType = apiRes.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
          console.log(`[extract] Server ${serverId} returned non-JSON: ${contentType}`);
          continue;
        }

        const apiData = await apiRes.json();
        console.log(`[extract] Server ${serverId} response:`, JSON.stringify(apiData));

        if (apiData.success && apiData.data?.link) {
          playerLink = apiData.data.link;
          console.log(`[extract] Got player link: ${playerLink}`);

          // 5. Fetch the player link to extract the actual video URL
          const playerRes = await fetch(playerLink, {
            headers: {
              "User-Agent": UA,
              "Referer": "https://embedplayapi.site/",
            },
            redirect: "follow",
          });

          if (playerRes.ok) {
            const playerHtml = await playerRes.text();

            // Try regex patterns to find video URLs
            const patterns = [
              /file\s*:\s*["']([^"']+\.m3u8[^"']*)/gi,
              /src\s*:\s*["']([^"']+\.m3u8[^"']*)/gi,
              /source\s*:\s*["']([^"']+\.m3u8[^"']*)/gi,
              /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi,
              /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/gi,
              /file\s*:\s*["']([^"']+\.mp4[^"']*)/gi,
            ];

            for (const pattern of patterns) {
              pattern.lastIndex = 0;
              const match = pattern.exec(playerHtml);
              if (match?.[1]) {
                videoUrl = match[1];
                videoType = videoUrl.includes(".mp4") ? "mp4" : "m3u8";
                console.log(`[extract] Found video URL: ${videoUrl}`);
                break;
              }
            }

            // Also check for iframes inside the player page
            if (!videoUrl) {
              const iframeSrcs = [...playerHtml.matchAll(/src=["'](https?:\/\/[^"']+)["']/gi)].map(m => m[1]);
              for (const iframeUrl of iframeSrcs) {
                if (iframeUrl.includes("embed") || iframeUrl.includes("player") || iframeUrl.includes("stream") || iframeUrl.includes("video")) {
                  try {
                    console.log(`[extract] Following inner iframe: ${iframeUrl}`);
                    const iframeRes = await fetch(iframeUrl, {
                      headers: { "User-Agent": UA, "Referer": playerLink || "https://embedplayapi.site/" },
                      redirect: "follow",
                    });
                    const iframeHtml = await iframeRes.text();

                    for (const pattern of patterns) {
                      pattern.lastIndex = 0;
                      const m = pattern.exec(iframeHtml);
                      if (m?.[1]) {
                        videoUrl = m[1];
                        videoType = videoUrl.includes(".mp4") ? "mp4" : "m3u8";
                        console.log(`[extract] Found video in iframe: ${videoUrl}`);
                        break;
                      }
                    }
                    if (videoUrl) break;
                  } catch (e) {
                    console.log(`[extract] Failed to follow iframe: ${e}`);
                  }
                }
              }
            }
          }

          if (videoUrl) break;
        }
      } catch (e) {
        console.log(`[extract] Server ${serverId} error: ${e}`);
      }
    }

    // 6. If found, save to cache and return
    if (videoUrl) {
      console.log(`[extract] Success! Video: ${videoUrl}`);

      await supabase.from("video_cache").upsert({
        tmdb_id,
        content_type: cType,
        audio_type: aType,
        season: season || null,
        episode: episode || null,
        video_url: videoUrl,
        video_type: videoType,
        provider: "embedplay",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: "tmdb_id,content_type,audio_type,season,episode",
      });

      return new Response(JSON.stringify({
        url: videoUrl,
        type: videoType,
        provider: "embedplay",
        cached: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. No direct URL - return player link for proxy fallback
    console.log(`[extract] No direct video URL found. Player link: ${playerLink}`);
    return new Response(JSON.stringify({
      url: null,
      player_link: playerLink,
      embed_url: embedPageUrl,
      provider: "embedplay",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[extract] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Extraction failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
