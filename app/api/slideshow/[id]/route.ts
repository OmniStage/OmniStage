import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const { data: config } = await supabase
    .from("slideshow_configs")
    .select("foto_ids")
    .eq("id", params.id)
    .maybeSingle();

  if (!config) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { data: midias } = await supabase
    .from("event_album")
    .select("id, arquivo_url, tipo, uploader_nome, legenda, curtidas")
    .in("id", config.foto_ids);

  // Preserva a ordem da seleção original
  const ordem = new Map((config.foto_ids as string[]).map((id: string, i: number) => [id, i]));
  const ordenadas = (midias || []).sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0));

  return NextResponse.json({ midias: ordenadas });
}
