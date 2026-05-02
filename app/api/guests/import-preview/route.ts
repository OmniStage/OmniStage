import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseGuestList } from "@/lib/importGuestsParser";

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
    const body = await req.json();

    const eventoId = body.eventoId || body.eventId;
    const tenantId = body.tenantId;
    const sourceType = body.sourceType || "smart_paste";
    const text = body.text || "";

    if (!eventoId) {
      return NextResponse.json(
        { error: "eventoId é obrigatório" },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId é obrigatório" },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Lista vazia" },
        { status: 400 }
      );
    }

    const parsedGuests = parseGuestList(text);

    const { data: batch, error: batchError } = await supabase
      .from("guest_import_batches")
      .insert({
        event_id: eventoId,
        tenant_id: tenantId,
        source_type: sourceType,
        total_rows: parsedGuests.length,
        status: "preview",
      })
      .select()
      .single();

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    const phones = parsedGuests
      .map((guest) => guest.phone)
      .filter((phone): phone is string => Boolean(phone));

    const { data: existingGuests, error: existingError } = await supabase
      .from("convidados")
      .select("telefone")
      .eq("tenant_id", tenantId)
      .eq("evento_id", eventoId)
      .in("telefone", phones.length ? phones : ["__empty__"]);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingPhones = new Set(
      (existingGuests || []).map((guest) => guest.telefone)
    );

    const previewRows = parsedGuests.map((guest) => ({
      batch_id: batch.id,
      event_id: eventoId,
      tenant_id: tenantId,
      nome: guest.name,
      telefone: guest.phone,
      name: guest.name,
      phone: guest.phone,
      grupo: guest.grupo,
      quantidade: guest.quantidade,
      observacoes: guest.observacoes,
      is_duplicate: guest.phone ? existingPhones.has(guest.phone) : false,
      raw_data: guest,
    }));

    const { data: preview, error: previewError } = await supabase
      .from("guest_import_preview")
      .insert(previewRows)
      .select();

    if (previewError) {
      return NextResponse.json({ error: previewError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      total: preview?.length || 0,
      preview,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao importar lista" },
      { status: 500 }
    );
  }
}
