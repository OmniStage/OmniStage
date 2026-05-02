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
    const { tenantId, eventoId, batchId } = await req.json();

    if (!tenantId || !eventoId || !batchId) {
      return NextResponse.json(
        { error: "tenantId, eventoId e batchId são obrigatórios." },
        { status: 400 }
      );
    }

    const { data: removidos, error: deleteError } = await supabase
      .from("convidados")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("evento_id", eventoId)
      .eq("import_batch_id", batchId)
      .select("id");

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const totalRemovidos = removidos?.length || 0;

    await supabase
      .from("guest_import_batches")
      .update({
        status: "cancelled",
        reverted_rows: totalRemovidos,
        reverted_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    await supabase.from("import_logs").insert({
      tenant_id: tenantId,
      evento_id: eventoId,
      batch_id: batchId,
      tipo: "legacy_guests",
      acao: "revert_import",
      origem: "planilha_legada",
      total: totalRemovidos,
    });

    return NextResponse.json({
      ok: true,
      removidos: totalRemovidos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao reverter importação." },
      { status: 500 }
    );
  }
}
