import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Variáveis do Supabase ausentes no servidor.");
  }

  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { tenantId, eventoId } = await req.json();

    if (!tenantId || !eventoId) {
      return NextResponse.json(
        { error: "tenantId e eventoId são obrigatórios." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("guest_import_batches")
      .select(`
        id,
        source_type,
        file_name,
        total_rows,
        imported_rows,
        duplicated_rows,
        reverted_rows,
        status,
        created_at,
        confirmed_at,
        reverted_at
      `)
      .eq("tenant_id", tenantId)
      .eq("event_id", eventoId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, history: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao carregar histórico." },
      { status: 500 }
    );
  }
}
