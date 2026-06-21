import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const { token, nome_arquivo, tipo_mime, uploader_nome } = await req.json();

  if (!token || !nome_arquivo || !tipo_mime) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: album } = await supabase
    .from("albums")
    .select("id, evento_id, album_token")
    .eq("album_token", token)
    .maybeSingle();

  if (!album) return NextResponse.json({ error: "Álbum não encontrado" }, { status: 404 });

  const ext = nome_arquivo.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${album.evento_id}/${album.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: uploadData, error } = await supabase.storage
    .from("event-album")
    .createSignedUploadUrl(path);

  if (error || !uploadData) {
    return NextResponse.json({ error: error?.message || "Erro ao gerar URL" }, { status: 500 });
  }

  const tipo = tipo_mime.startsWith("video") ? "video" : "image";
  const arquivo_url = supabase.storage.from("event-album").getPublicUrl(path).data.publicUrl;

  const { data: midia } = await supabase
    .from("event_album")
    .insert({
      evento_id: album.evento_id,
      album_id: album.id,
      arquivo_url,
      path_storage: path,
      tipo,
      uploader_nome: uploader_nome || null,
    })
    .select()
    .single();

  return NextResponse.json({ signed_url: uploadData.signedUrl, token: uploadData.token, path, midia });
}
