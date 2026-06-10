import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CAMPAIGN_ASSETS_BUCKET = "campaign-assets";
const TIPOS_IMAGEM_COPIAVEL = new Set(["image/png", "image/jpeg", "image/webp"]);

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Variáveis do Supabase ausentes no servidor.");
  }

  return createClient(url, key);
}

function getBearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  const [type, token] = authorization.split(" ");

  if (type?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function inferirContentType(path: string, fallback?: string | null) {
  if (fallback) return fallback;

  const lower = path.toLowerCase().split("?")[0];

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mp4")) return "video/mp4";

  return "application/octet-stream";
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const campanhaId = req.nextUrl.searchParams.get("campanha_id");
    const token = getBearerToken(req);

    if (!campanhaId) {
      return NextResponse.json({ error: "campanha_id obrigatório." }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: "Sessão ausente." }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user?.id) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const { data: campanha, error: campanhaError } = await supabase
      .from("envio_campanhas")
      .select("id, evento_id, tenant_id, tipo_envio, midia_bucket, midia_path, midia_tipo, ativo")
      .eq("id", campanhaId)
      .eq("ativo", true)
      .maybeSingle();

    if (campanhaError) {
      return NextResponse.json({ error: campanhaError.message }, { status: 500 });
    }

    if (!campanha?.id || !campanha.evento_id) {
      return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
    }

    if (!campanha.midia_path) {
      return NextResponse.json({ error: "Campanha sem mídia configurada." }, { status: 404 });
    }

    const { data: evento, error: eventoError } = await supabase
      .from("eventos")
      .select("id, tenant_id")
      .eq("id", campanha.evento_id)
      .maybeSingle();

    if (eventoError) {
      return NextResponse.json({ error: eventoError.message }, { status: 500 });
    }

    if (!evento?.tenant_id) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    if (campanha.tenant_id && campanha.tenant_id !== evento.tenant_id) {
      return NextResponse.json({ error: "Campanha não pertence ao tenant do evento." }, { status: 403 });
    }

    const { data: membro, error: membroError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userData.user.id)
      .eq("tenant_id", evento.tenant_id)
      .in("status", ["ativo", "active", "aprovado"])
      .maybeSingle();

    if (membroError) {
      return NextResponse.json({ error: membroError.message }, { status: 500 });
    }

    if (!membro?.tenant_id) {
      return NextResponse.json({ error: "Você não tem acesso a esta mídia." }, { status: 403 });
    }

    const bucket = campanha.midia_bucket || CAMPAIGN_ASSETS_BUCKET;

    if (bucket !== CAMPAIGN_ASSETS_BUCKET) {
      return NextResponse.json({ error: "Bucket de campanha inválido." }, { status: 403 });
    }

    const { data: arquivo, error: storageError } = await supabase.storage
      .from(bucket)
      .download(campanha.midia_path);

    if (storageError || !arquivo) {
      return NextResponse.json(
        { error: storageError?.message || "Arquivo não encontrado no Storage." },
        { status: 404 }
      );
    }

    const contentType = inferirContentType(campanha.midia_path, campanha.midia_tipo);

    if (!TIPOS_IMAGEM_COPIAVEL.has(contentType)) {
      return NextResponse.json(
        { error: "Esta rota é para copiar imagens estáticas PNG, JPG ou WebP." },
        { status: 415 }
      );
    }

    const buffer = await arquivo.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="campaign-media"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

