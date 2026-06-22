import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: album } = await supabase
    .from("albums")
    .select("id, nome, descricao, album_token, evento_id, editor_fotos")
    .eq("album_token", token)
    .maybeSingle();

  if (!album) return NextResponse.json({ error: "Álbum não encontrado" }, { status: 404 });

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nome, data_evento, background_url, background_image, logo_url, logo_image")
    .eq("id", album.evento_id)
    .maybeSingle();

  const { data: midias } = await supabase
    .from("event_album")
    .select("*")
    .eq("album_id", album.id)
    .order("criado_em", { ascending: false });

  const { data: convidados } = await supabase
    .from("convidados")
    .select("nome")
    .eq("evento_id", album.evento_id)
    .order("nome", { ascending: true });

  return NextResponse.json({
    album,
    evento,
    midias: midias || [],
    convidados: (convidados || []).map((c) => c.nome).filter(Boolean),
  });
}

export async function PATCH(req: NextRequest) {
  const { id, descurtir } = await req.json();
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: atual } = await supabase.from("event_album").select("curtidas").eq("id", id).single();
  const novoValor = Math.max(0, (atual?.curtidas || 0) + (descurtir ? -1 : 1));
  await supabase.from("event_album").update({ curtidas: novoValor }).eq("id", id);
  return NextResponse.json({ curtidas: novoValor });
}

export async function DELETE(req: NextRequest) {
  const { id, arquivo_url } = await req.json();
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const supabase = createServiceClient();

  if (arquivo_url) {
    const path = arquivo_url.split("/event-album/")[1];
    if (path) await supabase.storage.from("event-album").remove([path]);
  }

  await supabase.from("event_album").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
