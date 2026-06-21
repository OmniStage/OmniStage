import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nome, album_token, background_url, background_image, logo_url, logo_image")
    .eq("album_token", token)
    .maybeSingle();

  if (!evento) return NextResponse.json({ error: "Álbum não encontrado" }, { status: 404 });

  const { data: midias } = await supabase
    .from("event_album")
    .select("*")
    .eq("evento_id", evento.id)
    .order("criado_em", { ascending: false });

  const { data: convidados } = await supabase
    .from("convidados")
    .select("id, nome")
    .eq("evento_id", evento.id)
    .order("nome", { ascending: true });

  return NextResponse.json({ evento, midias: midias || [], convidados: (convidados || []).map((c) => c.nome).filter(Boolean) });
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
