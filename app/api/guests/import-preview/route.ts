import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseGuestList } from "@/lib/importGuestsParser";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const eventId = body.eventId;
    const sourceType = body.sourceType || "smart_paste";
    const text = body.text || "";

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId é obrigatório" },
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
        event_id: eventId,
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
      .filter(Boolean);

    const { data: existingGuests } = await supabase
      .from("guests")
      .select("phone")
      .eq("event_id", eventId)
      .in("phone", phones.length ? phones : ["__empty__"]);

    const existingPhones = new Set(
      (existingGuests || []).map((guest) => guest.phone)
    );

    const previewRows = parsedGuests.map((guest) => ({
      batch_id: batch.id,
      event_id: eventId,
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
