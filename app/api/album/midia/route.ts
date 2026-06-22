import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// PATCH: update legenda (session-owned only)
export async function PATCH(req: NextRequest) {
  const { id, uploader_session_id, legenda } = await req.json();
  if (!id || !uploader_session_id) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("event_album")
    .update({ legenda: legenda || null })
    .eq("id", id)
    .eq("uploader_session_id", uploader_session_id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  return NextResponse.json({ ok: true });
}

// DELETE: remove photo/video (session-owned only)
export async function DELETE(req: NextRequest) {
  const { id, uploader_session_id } = await req.json();
  if (!id || !uploader_session_id) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: midia, error: findErr } = await supabase
    .from("event_album")
    .select("id, path_storage, uploader_session_id")
    .eq("id", id)
    .eq("uploader_session_id", uploader_session_id)
    .maybeSingle();

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
  if (!midia) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  if (midia.path_storage) {
    await supabase.storage.from("event-album").remove([midia.path_storage]);
  }

  await supabase.from("event_album").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
