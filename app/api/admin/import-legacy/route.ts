import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseLegacyGuestList } from "@/lib/importLegacyGuestsParser";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Variáveis do Supabase ausentes no servidor.");
  }

  return createClient(url, key);
}

function gerarToken() {
  return "EVT-" + Math.floor(100000 + Math.random() * 900000);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const action = body.action;
    const tenantId = body.tenantId;
    const eventoId = body.eventoId;
    const text = body.text || "";
    const batchId = body.batchId;

    if (!tenantId || !eventoId) {
      return NextResponse.json(
        { error: "tenantId e eventoId são obrigatórios." },
        { status: 400 }
      );
    }

    if (action === "preview") {
      if (!text.trim()) {
        return NextResponse.json({ error: "Lista vazia." }, { status: 400 });
      }

      const parsedGuests = parseLegacyGuestList(text);

      const { data: batch, error: batchError } = await supabase
        .from("guest_import_batches")
        .insert({
          tenant_id: tenantId,
          event_id: eventoId,
          source_type: "spreadsheet",
          total_rows: parsedGuests.length,
          status: "preview",
          file_name: "importacao_legado_admin",
        })
        .select()
        .single();

      if (batchError) {
        return NextResponse.json({ error: batchError.message }, { status: 500 });
      }

      const phones = parsedGuests
        .map((guest) => guest.phone)
        .filter((phone): phone is string => Boolean(phone));

      const legacyIds = parsedGuests
        .map((guest) => guest.legacy_id)
        .filter((id): id is string => Boolean(id));

      const { data: existingByPhone, error: existingPhoneError } = await supabase
        .from("convidados")
        .select("telefone")
        .eq("tenant_id", tenantId)
        .eq("evento_id", eventoId)
        .in("telefone", phones.length ? phones : ["__empty__"]);

      if (existingPhoneError) {
        return NextResponse.json(
          { error: existingPhoneError.message },
          { status: 500 }
        );
      }

      const { data: existingByLegacy, error: existingLegacyError } = await supabase
        .from("convidados")
        .select("legacy_id")
        .eq("tenant_id", tenantId)
        .eq("evento_id", eventoId)
        .in("legacy_id", legacyIds.length ? legacyIds : ["__empty__"]);

      if (existingLegacyError) {
        return NextResponse.json(
          { error: existingLegacyError.message },
          { status: 500 }
        );
      }

      const existingPhones = new Set(
        (existingByPhone || []).map((item) => item.telefone)
      );

      const existingLegacyIds = new Set(
        (existingByLegacy || []).map((item) => item.legacy_id)
      );

      const previewRows = parsedGuests.map((guest) => ({
        batch_id: batch.id,
        tenant_id: tenantId,
        event_id: eventoId,
        legacy_id: guest.legacy_id,
        origem_importacao: "planilha_legada",
        nome: guest.name,
        telefone: guest.phone,
        grupo: guest.grupo,
        quantidade: 1,
        status_rsvp: guest.status_rsvp,
        status_envio: guest.status_envio,
        observacoes: guest.observacoes,
        is_duplicate:
          Boolean(guest.phone && existingPhones.has(guest.phone)) ||
          Boolean(guest.legacy_id && existingLegacyIds.has(guest.legacy_id)),
        raw_data: guest,
      }));

      const duplicatedRows = previewRows.filter((row) => row.is_duplicate).length;

      const { data: preview, error: previewError } = await supabase
        .from("guest_import_preview")
        .insert(previewRows)
        .select();

      if (previewError) {
        return NextResponse.json({ error: previewError.message }, { status: 500 });
      }

      await supabase
        .from("guest_import_batches")
        .update({
          duplicated_rows: duplicatedRows,
        })
        .eq("id", batch.id);

      await supabase
        .from("eventos")
        .update({
          is_legado: true,
          origem_dados: "planilha_legada",
        })
        .eq("id", eventoId)
        .eq("tenant_id", tenantId);

      await supabase.from("import_logs").insert({
        tenant_id: tenantId,
        evento_id: eventoId,
        batch_id: batch.id,
        tipo: "legacy_guests",
        acao: "preview_import",
        origem: "planilha_legada",
        total: previewRows.length,
      });

      return NextResponse.json({
        ok: true,
        batchId: batch.id,
        total: preview?.length || 0,
        duplicated: duplicatedRows,
        preview,
      });
    }

    if (action === "confirm") {
      if (!batchId) {
        return NextResponse.json({ error: "batchId é obrigatório." }, { status: 400 });
      }

      const { data: previewRows, error: previewError } = await supabase
        .from("guest_import_preview")
        .select("*")
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId)
        .eq("event_id", eventoId)
        .eq("is_duplicate", false);

      if (previewError) {
        return NextResponse.json({ error: previewError.message }, { status: 500 });
      }

      const rowsToInsert = (previewRows || []).map((item) => ({
        tenant_id: tenantId,
        evento_id: eventoId,
        import_batch_id: batchId,
        legacy_id: item.legacy_id,
        origem_importacao: item.origem_importacao || "planilha_legada",
        nome: item.nome,
        telefone: item.telefone,
        grupo: item.grupo,
        tipo_convite: item.grupo ? "grupo" : "individual",
        observacoes: item.observacoes,
        status_rsvp: item.status_rsvp || "pendente",
        status_envio: item.status_envio || "pendente",
        status_checkin: "nao_entrou",
        token: gerarToken(),
      }));

      if (rowsToInsert.length === 0) {
        return NextResponse.json(
          { error: "Nenhum convidado válido para importar." },
          { status: 400 }
        );
      }

      const { error: insertError } = await supabase
        .from("convidados")
        .insert(rowsToInsert);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      await supabase
        .from("guest_import_batches")
        .update({
          status: "imported",
          imported_rows: rowsToInsert.length,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", batchId);

      await supabase.from("import_logs").insert({
        tenant_id: tenantId,
        evento_id: eventoId,
        batch_id: batchId,
        tipo: "legacy_guests",
        acao: "confirm_import",
        origem: "planilha_legada",
        total: rowsToInsert.length,
      });

      return NextResponse.json({
        ok: true,
        imported: rowsToInsert.length,
      });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro na importação legada." },
      { status: 500 }
    );
  }
}
