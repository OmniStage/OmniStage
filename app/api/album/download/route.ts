import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  const { album_id, foto_ids } = await req.json();

  const supabase = createServiceClient();

  let query = supabase.from("event_album").select("id, arquivo_url, tipo, uploader_nome, criado_em");
  if (foto_ids?.length) {
    query = query.in("id", foto_ids);
  } else if (album_id) {
    query = query.eq("album_id", album_id);
  } else {
    return NextResponse.json({ error: "album_id ou foto_ids obrigatório" }, { status: 400 });
  }

  const { data: midias, error } = await query.order("criado_em", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!midias?.length) return NextResponse.json({ error: "Nenhuma mídia encontrada" }, { status: 404 });

  const zip = new JSZip();

  await Promise.all(
    midias.map(async (m, i) => {
      try {
        const res = await fetch(m.arquivo_url);
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        const ext = m.arquivo_url.split("?")[0].split(".").pop() || (m.tipo === "video" ? "mp4" : "jpg");
        const nome = `${String(i + 1).padStart(3, "0")}_${(m.uploader_nome || "foto").replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
        zip.file(nome, buf);
      } catch {}
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="album.zip"`,
    },
  });
}
