const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both GET (query param) and POST (json body)
    let targetUrl: string | null = null;

    if (req.method === "GET") {
      const params = new URL(req.url).searchParams;
      targetUrl = params.get("url");
    } else {
      const body = await req.json();
      targetUrl = body.url;
    }

    if (!targetUrl || !targetUrl.startsWith("https://superflixapi.one/")) {
      return new Response("Invalid URL", { status: 400, headers: corsHeaders });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://superflixapi.one/",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, {
        status: response.status,
        headers: corsHeaders,
      });
    }

    let html = await response.text();

    // Rewrite relative URLs to absolute
    html = html.replace(/(src|href)="\/(?!\/)/g, `$1="https://superflixapi.one/`);
    html = html.replace(/(src|href)='\/(?!\/)/g, `$1='https://superflixapi.one/`);

    // Inject base tag
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head><base href="https://superflixapi.one/">`);
    } else if (html.includes("<HEAD>")) {
      html = html.replace("<HEAD>", `<HEAD><base href="https://superflixapi.one/">`);
    }

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "ALLOWALL",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Proxy failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
