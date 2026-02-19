import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Authorized Telegram user IDs (admin only)
const AUTHORIZED_IDS: number[] = [];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// In-memory session store (per function invocation - stateless between calls, so we use DB)
interface UserSession {
  step: string;
  data: Record<string, any>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getSession(chatId: number): Promise<UserSession | null> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", `tg_session_${chatId}`)
    .maybeSingle();
  return data?.value as UserSession | null;
}

async function setSession(chatId: number, session: UserSession | null) {
  if (!session) {
    await supabase.from("site_settings").delete().eq("key", `tg_session_${chatId}`);
    return;
  }
  await supabase.from("site_settings").upsert(
    { key: `tg_session_${chatId}`, value: session as any },
    { onConflict: "key" }
  );
}

async function isAuthorized(userId: number): Promise<boolean> {
  // Check hardcoded list first
  if (AUTHORIZED_IDS.length > 0 && AUTHORIZED_IDS.includes(userId)) return true;
  // Check DB for authorized telegram IDs
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "telegram_authorized_ids")
    .maybeSingle();
  if (data?.value) {
    const ids = (data.value as any)?.ids || [];
    return ids.includes(userId);
  }
  return false;
}

async function handleCommand(chatId: number, userId: number, text: string) {
  const cmd = text.split(" ")[0].toLowerCase();
  const args = text.substring(cmd.length).trim();

  switch (cmd) {
    case "/start":
      await sendMessage(chatId,
        "🎬 <b>Bot de Ingestão LyneFlix</b>\n\n" +
        "Encaminhe um vídeo de outro chat para começar o cadastro.\n\n" +
        "📌 <b>Comandos:</b>\n" +
        "/pendentes — Lista conteúdos pendentes\n" +
        "/buscar [nome] — Busca por nome\n" +
        "/status — Resumo do sistema\n" +
        "/cancelar — Cancela operação atual"
      );
      break;

    case "/cancelar":
      await setSession(chatId, null);
      await sendMessage(chatId, "❌ Operação cancelada.");
      break;

    case "/pendentes": {
      const { data, count } = await supabase
        .from("telegram_ingestions")
        .select("id, title, content_type, status, created_at", { count: "exact" })
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!data?.length) {
        await sendMessage(chatId, "✅ Nenhum conteúdo pendente.");
        return;
      }
      let msg = `📋 <b>Pendentes (${count}):</b>\n\n`;
      data.forEach((d, i) => {
        const icon = d.content_type === "movie" ? "🎬" : "📺";
        msg += `${i + 1}. ${icon} <b>${d.title}</b>\n   ID: <code>${d.id.slice(0, 8)}</code>\n\n`;
      });
      await sendMessage(chatId, msg);
      break;
    }

    case "/buscar": {
      if (!args) { await sendMessage(chatId, "Use: /buscar [nome]"); return; }
      const { data } = await supabase
        .from("telegram_ingestions")
        .select("id, title, content_type, status")
        .ilike("title", `%${args}%`)
        .limit(10);
      if (!data?.length) {
        await sendMessage(chatId, `🔍 Nenhum resultado para "${args}".`);
        return;
      }
      let msg = `🔍 <b>Resultados para "${args}":</b>\n\n`;
      data.forEach((d, i) => {
        const icon = d.content_type === "movie" ? "🎬" : "📺";
        const statusIcon = d.status === "pending" ? "⏳" : d.status === "confirmed" ? "✅" : "📦";
        msg += `${i + 1}. ${icon} ${statusIcon} <b>${d.title}</b>\n   ID: <code>${d.id.slice(0, 8)}</code> | ${d.status}\n\n`;
      });
      await sendMessage(chatId, msg);
      break;
    }

    case "/status": {
      const [{ count: pending }, { count: confirmed }, { count: processed }] = await Promise.all([
        supabase.from("telegram_ingestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("telegram_ingestions").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("telegram_ingestions").select("id", { count: "exact", head: true }).eq("status", "processed"),
      ]);
      await sendMessage(chatId,
        "📊 <b>Status do Sistema:</b>\n\n" +
        `⏳ Pendentes: <b>${pending || 0}</b>\n` +
        `✅ Confirmados: <b>${confirmed || 0}</b>\n` +
        `📦 Processados: <b>${processed || 0}</b>\n` +
        `📁 Total: <b>${(pending || 0) + (confirmed || 0) + (processed || 0)}</b>`
      );
      break;
    }

    case "/excluir": {
      if (!args) { await sendMessage(chatId, "Use: /excluir [ID]"); return; }
      const { data } = await supabase
        .from("telegram_ingestions")
        .select("id, title")
        .ilike("id", `${args}%`)
        .limit(1)
        .maybeSingle();
      if (!data) { await sendMessage(chatId, "❌ ID não encontrado."); return; }
      await supabase.from("telegram_ingestions").delete().eq("id", data.id);
      await sendMessage(chatId, `🗑 <b>${data.title}</b> removido.`);
      break;
    }

    default:
      await sendMessage(chatId, "❓ Comando não reconhecido. Use /start para ver os comandos.");
  }
}

async function handleMessage(chatId: number, userId: number, message: any) {
  // Check if it's a forwarded video
  const video = message.video || message.document;
  const isForwarded = message.forward_date || message.forward_from || message.forward_from_chat;

  if (video && isForwarded) {
    // Check duplicate
    const uniqueId = video.file_unique_id;
    const { data: existing } = await supabase
      .from("telegram_ingestions")
      .select("id, title")
      .eq("telegram_unique_id", uniqueId)
      .maybeSingle();

    if (existing) {
      await sendMessage(chatId, `⚠️ Este arquivo já foi cadastrado como "<b>${existing.title}</b>".`);
      return;
    }

    // Start ingestion flow
    const fileData = {
      telegram_file_id: video.file_id,
      telegram_unique_id: uniqueId,
      file_size: video.file_size || 0,
      duration: video.duration || 0,
      resolution: video.width ? `${video.width}x${video.height}` : null,
      file_name: video.file_name || null,
      mime_type: video.mime_type || null,
    };

    await setSession(chatId, { step: "ask_title", data: fileData });

    const sizeStr = video.file_size ? `${(video.file_size / (1024 * 1024 * 1024)).toFixed(2)}GB` : "N/A";
    const durStr = video.duration ? `${Math.floor(video.duration / 60)}min` : "N/A";

    await sendMessage(chatId,
      "📥 <b>Vídeo recebido!</b>\n\n" +
      `📁 Arquivo: ${video.file_name || "Sem nome"}\n` +
      `💾 Tamanho: ${sizeStr}\n` +
      `⏱ Duração: ${durStr}\n` +
      `🎥 Resolução: ${fileData.resolution || "N/A"}\n\n` +
      "📝 <b>Informe o nome do conteúdo:</b>"
    );
    return;
  }

  if (video && !isForwarded) {
    await sendMessage(chatId, "❌ <b>Upload direto não aceito.</b>\nEncaminhe o vídeo de outro chat/canal.");
    return;
  }

  // Handle session flow
  const session = await getSession(chatId);
  if (!session) {
    if (message.text?.startsWith("/")) {
      await handleCommand(chatId, userId, message.text);
    } else {
      await sendMessage(chatId, "Encaminhe um vídeo para começar ou use /start.");
    }
    return;
  }

  const text = message.text?.trim() || "";

  switch (session.step) {
    case "ask_title":
      session.data.title = text;
      session.step = "ask_synopsis";
      await setSession(chatId, session);
      await sendMessage(chatId, "📝 <b>Informe a sinopse:</b>");
      break;

    case "ask_synopsis":
      session.data.synopsis = text;
      session.step = "ask_type";
      await setSession(chatId, session);
      await sendMessage(chatId, "🎭 <b>É um filme ou série?</b>", {
        inline_keyboard: [
          [
            { text: "🎬 Filme", callback_data: "type_movie" },
            { text: "📺 Série", callback_data: "type_series" },
          ],
        ],
      });
      break;

    case "ask_season":
      session.data.season = parseInt(text) || 1;
      session.step = "ask_episode";
      await setSession(chatId, session);
      await sendMessage(chatId, "📝 <b>Episódio:</b>");
      break;

    case "ask_episode":
      session.data.episode = parseInt(text) || 1;
      session.step = "ask_ep_title";
      await setSession(chatId, session);
      await sendMessage(chatId, "📝 <b>Título do episódio (opcional — envie . para pular):</b>");
      break;

    case "ask_ep_title":
      session.data.episode_title = text === "." ? null : text;
      await showConfirmation(chatId, session);
      break;

    default:
      await sendMessage(chatId, "❓ Algo deu errado. Use /cancelar e tente novamente.");
  }
}

async function showConfirmation(chatId: number, session: UserSession) {
  const d = session.data;
  const sizeStr = d.file_size ? `${(d.file_size / (1024 * 1024 * 1024)).toFixed(2)}GB` : "N/A";
  const durStr = d.duration ? `${Math.floor(d.duration / 60)}min` : "N/A";
  const typeIcon = d.content_type === "movie" ? "🎬 Filme" : "📺 Série";

  let msg = `⚠️ <b>CONFIRMAR CADASTRO</b>\n\n` +
    `📌 Nome: <b>${d.title}</b>\n` +
    `🎭 Tipo: ${typeIcon}\n`;

  if (d.content_type === "series") {
    msg += `📺 Temporada: ${d.season} | Episódio: ${d.episode}\n`;
    if (d.episode_title) msg += `📝 Título ep.: ${d.episode_title}\n`;
  }

  msg += `\n📝 Sinopse: ${d.synopsis?.substring(0, 100)}${d.synopsis?.length > 100 ? "..." : ""}\n` +
    `📁 Arquivo: ${sizeStr}\n` +
    `⏱ Duração: ${durStr}\n\n` +
    `<b>Deseja enviar para processamento?</b>`;

  session.step = "confirm";
  await setSession(chatId, session);

  await sendMessage(chatId, msg, {
    inline_keyboard: [
      [{ text: "✅ Confirmar envio", callback_data: "confirm_yes" }],
      [{ text: "✏️ Editar informações", callback_data: "confirm_edit" }],
      [{ text: "❌ Cancelar", callback_data: "confirm_cancel" }],
    ],
  });
}

async function handleCallback(chatId: number, userId: number, callbackData: string, callbackQueryId: string) {
  // Answer callback to remove loading
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });

  const session = await getSession(chatId);
  if (!session) {
    await sendMessage(chatId, "Sessão expirada. Encaminhe o vídeo novamente.");
    return;
  }

  if (callbackData === "type_movie") {
    session.data.content_type = "movie";
    await showConfirmation(chatId, session);
  } else if (callbackData === "type_series") {
    session.data.content_type = "series";
    session.step = "ask_season";
    await setSession(chatId, session);
    await sendMessage(chatId, "📝 <b>Temporada:</b>");
  } else if (callbackData === "confirm_yes") {
    // Save to database
    const d = session.data;
    const { error } = await supabase.from("telegram_ingestions").insert({
      title: d.title,
      synopsis: d.synopsis,
      content_type: d.content_type,
      season: d.season || null,
      episode: d.episode || null,
      episode_title: d.episode_title || null,
      telegram_file_id: d.telegram_file_id,
      telegram_unique_id: d.telegram_unique_id,
      file_size: d.file_size,
      duration: d.duration,
      resolution: d.resolution,
      file_name: d.file_name,
      mime_type: d.mime_type,
      status: "pending",
      telegram_user_id: userId,
    });

    await setSession(chatId, null);

    if (error) {
      await sendMessage(chatId, `❌ Erro ao salvar: ${error.message}`);
    } else {
      await sendMessage(chatId, "✅ <b>Cadastrado com sucesso!</b>\n\nStatus: ⏳ Pendente\nEncaminhe outro vídeo para continuar.");
    }
  } else if (callbackData === "confirm_edit") {
    session.step = "ask_title";
    await setSession(chatId, session);
    await sendMessage(chatId, "📝 <b>Informe o nome do conteúdo:</b>");
  } else if (callbackData === "confirm_cancel") {
    await setSession(chatId, null);
    await sendMessage(chatId, "❌ Cadastro cancelado.");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET for webhook setup
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("setup") === "true") {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      return new Response(JSON.stringify({ webhook: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const update = await req.json();
    const message = update.message || update.edited_message;
    const callback = update.callback_query;

    let chatId: number;
    let userId: number;

    if (callback) {
      chatId = callback.message.chat.id;
      userId = callback.from.id;
    } else if (message) {
      chatId = message.chat.id;
      userId = message.from.id;
    } else {
      return new Response("ok", { headers: corsHeaders });
    }

    // Auth check
    const authorized = await isAuthorized(userId);
    if (!authorized) {
      await sendMessage(chatId, "🚫 <b>Acesso negado.</b>\n\nVocê não está autorizado a usar este bot.");
      return new Response("ok", { headers: corsHeaders });
    }

    if (callback) {
      await handleCallback(chatId, userId, callback.data, callback.id);
    } else if (message) {
      if (message.text?.startsWith("/")) {
        await handleCommand(chatId, userId, message.text);
      } else {
        await handleMessage(chatId, userId, message);
      }
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error("Bot error:", err);
    return new Response("ok", { headers: corsHeaders });
  }
});
