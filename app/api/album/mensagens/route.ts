import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/album/mensagens?token=xxx
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("album_token", token)
    .maybeSingle();

  if (!album) return NextResponse.json({ error: "Álbum não encontrado" }, { status: 404 });

  const { data: mensagens } = await supabase
    .from("album_mensagens")
    .select("id, autor_nome, mensagem, criado_em")
    .eq("album_id", album.id)
    .order("criado_em", { ascending: false });

  return NextResponse.json({ mensagens: mensagens || [] });
}

// POST /api/album/mensagens
export async function POST(req: NextRequest) {
  const { token, autor_nome, mensagem } = await req.json();
  if (!token || !mensagem?.trim()) {
    return NextResponse.json({ error: "Token e mensagem obrigatórios" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("album_token", token)
    .maybeSingle();

  if (!album) return NextResponse.json({ error: "Álbum não encontrado" }, { status: 404 });

  const { data, error } = await supabase
    .from("album_mensagens")
    .insert({ album_id: album.id, autor_nome: autor_nome?.trim() || null, mensagem: mensagem.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ mensagem: data });
}

// DELETE /api/album/mensagens
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const supabase = createServiceClient();
  await supabase.from("album_mensagens").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
