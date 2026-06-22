import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/albums?evento_id=xxx  — lista álbuns do evento com contagem de mídias
export async function GET(req: NextRequest) {
  const evento_id = req.nextUrl.searchParams.get("evento_id");
  if (!evento_id) return NextResponse.json({ error: "evento_id obrigatório" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: albumsData } = await supabase
    .from("albums")
    .select("id, nome, descricao, album_token, criado_em, editor_fotos")
    .eq("evento_id", evento_id)
    .order("criado_em", { ascending: true });

  if (!albumsData) return NextResponse.json({ albums: [] });

  const comContagem = await Promise.all(
    albumsData.map(async (a) => {
      const { count } = await supabase
        .from("event_album")
        .select("*", { count: "exact", head: true })
        .eq("album_id", a.id);
      return { ...a, total_midias: count || 0 };
    })
  );

  return NextResponse.json({ albums: comContagem });
}

// POST /api/albums  — cria novo álbum
export async function POST(req: NextRequest) {
  const { evento_id, nome, descricao } = await req.json();
  if (!evento_id || !nome) return NextResponse.json({ error: "evento_id e nome obrigatórios" }, { status: 400 });

  const supabase = createServiceClient();

  const token = `${evento_id.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;

  const { data: album, error } = await supabase
    .from("albums")
    .insert({ evento_id, nome: nome.trim(), descricao: descricao?.trim() || null, album_token: token })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ album });
}

// PATCH /api/albums  — edita nome/descrição/configurações
export async function PATCH(req: NextRequest) {
  const { id, nome, descricao, editor_fotos } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome?.trim();
  if (descricao !== undefined) updates.descricao = descricao?.trim() || null;
  if (editor_fotos !== undefined) updates.editor_fotos = editor_fotos;

  const supabase = createServiceClient();
  const { data: album, error } = await supabase
    .from("albums")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ album });
}

// DELETE /api/albums  — remove álbum e todas as mídias
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const supabase = createServiceClient();

  // Remove arquivos do storage
  const { data: midias } = await supabase
    .from("event_album")
    .select("path_storage")
    .eq("album_id", id);

  if (midias && midias.length > 0) {
    const paths = midias.map((m) => m.path_storage).filter(Boolean);
    if (paths.length > 0) await supabase.storage.from("event-album").remove(paths);
  }

  await supabase.from("event_album").delete().eq("album_id", id);
  await supabase.from("albums").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
