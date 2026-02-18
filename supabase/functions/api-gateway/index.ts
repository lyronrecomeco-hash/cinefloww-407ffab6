import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-cf-sig, x-cf-ts",
};

const REJECTION_MSG = "Mano, tá passando fome? pede marmita.";

// HMAC-SHA256 using Web Crypto
async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Simple IP hash for logging (privacy-preserving)
async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "cf-salt-2024");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Rate limiting: in-memory store (resets on cold start, good enough)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await hashIP(clientIP);
  const ua = req.headers.get("user-agent") || "";

  try {
    // 1. Validate HMAC signature
    const sig = req.headers.get("x-cf-sig");
    const ts = req.headers.get("x-cf-ts");
    
    if (!sig || !ts) {
      await logAccess(supabase, "/api-gateway", ipHash, ua, true, "missing-headers");
      return reject();
    }

    // Timestamp validation (30s window)
    const tsNum = parseInt(ts);
    const now = Date.now();
    if (isNaN(tsNum) || Math.abs(now - tsNum) > 30_000) {
      await logAccess(supabase, "/api-gateway", ipHash, ua, true, "expired-timestamp");
      return reject();
    }

    // Verify HMAC
    const secret = Deno.env.get("CF_INTERNAL_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.text();
    const expectedSig = await hmacSha256(secret, ts + body);
    
    if (sig !== expectedSig) {
      await logAccess(supabase, "/api-gateway", ipHash, ua, true, "invalid-signature");
      return reject();
    }

    // 2. Rate limiting
    if (!checkRateLimit(ipHash)) {
      await logAccess(supabase, "/api-gateway", ipHash, ua, true, "rate-limited");
      return new Response(JSON.stringify({ error: "Calma aí parceiro, muitas requisições." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse and route request
    const payload = JSON.parse(body);
    const { action, data } = payload;

    await logAccess(supabase, action || "unknown", ipHash, ua, false, null);

    switch (action) {
      case "extract-video": {
        // Forward to extract-video internally
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-video`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "track-visitor": {
        // Insert visitor tracking
        await supabase.from("site_visitors").insert({
          visitor_id: data.visitor_id,
          referrer: data.referrer || null,
          hostname: data.hostname || null,
          pathname: data.pathname || null,
          user_agent: ua.substring(0, 200),
          ip_hash: ipHash,
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return reject();
    }
  } catch (error) {
    console.error("[api-gateway] Error:", error);
    return reject();
  }
});

function reject() {
  return new Response(JSON.stringify({ error: REJECTION_MSG }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logAccess(
  supabase: any, endpoint: string, ipHash: string, ua: string,
  blocked: boolean, reason: string | null
) {
  try {
    await supabase.from("api_access_log").insert({
      endpoint, ip_hash: ipHash, user_agent: ua.substring(0, 200), blocked, reason,
    });
  } catch { /* silent */ }
}
