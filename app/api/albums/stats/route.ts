import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/albums/stats?tenant_id=xxx
// Returns per-event album and media counts
export async function GET(req: NextRequest) {
  const tenant_id = req.nextUrl.searchParams.get("tenant_id");
  if (!tenant_id) return NextResponse.json({ error: "tenant_id obrigatório" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, nome, data_evento, tipo_evento")
    .eq("tenant_id", tenant_id)
    .order("data_evento", { ascending: false });

  if (!eventos) return NextResponse.json({ eventos: [] });

  const { data: albums } = await supabase
    .from("albums")
    .select("id, evento_id")
    .in("evento_id", eventos.map((e) => e.id));

  const albumIds = (albums || []).map((a) => a.id);

  const { data: midias } = albumIds.length > 0
    ? await supabase.from("event_album").select("album_id, tipo").in("album_id", albumIds)
    : { data: [] };

  const result = eventos.map((ev) => {
    const evAlbums = (albums || []).filter((a) => a.evento_id === ev.id);
    const evAlbumIds = new Set(evAlbums.map((a) => a.id));
    const evMidias = (midias || []).filter((m) => evAlbumIds.has(m.album_id));
    return {
      ...ev,
      total_albums: evAlbums.length,
      total_fotos: evMidias.filter((m) => m.tipo === "image").length,
      total_videos: evMidias.filter((m) => m.tipo === "video").length,
    };
  });

  return NextResponse.json({ eventos: result });
}
