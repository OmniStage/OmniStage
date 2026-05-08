import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseLegacyGuestList } from "@/lib/importLegacyGuestsParser";

type ImportGuest = {
  legacy_id: string | null;
  grupo: string | null;
  name: string;
  phone: string | null;
  crianca: string | null;
  mae: string | null;
  idade_crianca: string | number | null;
  contato_principal: boolean;
  recebe_convite: boolean;
  status_rsvp: string | null;
  status_envio: string | null;
  data_hora_rsvp: string | null;
  data_hora_envio: string | null;
  raw?: any;
};

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

function cleanPhone(value: string | null | undefined): string | null {
  if (!value) return null;

  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function cleanText(value: unknown): string | null {
  const text = String(value || "").trim();
  return text ? text : null;
}

function normalizeCrianca(value: unknown, mae: unknown): string | null {
  const maeText = cleanText(mae);

  if (maeText) return "sim";

  const raw = String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!raw) return null;
  if (["sim", "s", "crianca", "criança", "infantil", "kid", "kids"].includes(raw)) return "sim";
  if (["nao", "não", "n", "adulto"].includes(raw)) return "nao";

  return String(value).trim();
}

function normalizeIdadeCrianca(value: unknown): string | number | null {
  const text = String(value || "").trim();

  if (!text) return null;

  const numberValue = Number(text.replace(",", "."));

  if (Number.isFinite(numberValue)) {
    return numberValue;
  }

  return text;
}

function normalizeStatusRsvp(value: string | null | undefined): string {
  const status = String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (status.includes("confirm")) return "confirmado";
  if (status.includes("nao")) return "nao";
  if (status.includes("pend")) return "pendente";

  return "pendente";
}

function normalizeStatusEnvio(value: string | null | undefined): string {
  const status = String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (status.includes("enviado")) return "enviado";
  if (status.includes("erro")) return "erro";
  if (status.includes("pend")) return "pendente";

  return "pendente";
}

function normalizarGrupoChave(value: string | null | undefined) {
  return String(value || "Sem grupo")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_") || "sem_grupo";
}

function aplicarContatoPrincipal(rows: any[]): ImportGuest[] {
  const gruposComPrincipal = new Set<string>();

  return rows.map((guest) => {
    const grupoKey = normalizarGrupoChave(guest.grupo || guest.name);
    const temTelefone = Boolean(cleanPhone(guest.phone));
    const contatoPrincipal = temTelefone && !gruposComPrincipal.has(grupoKey);

    if (contatoPrincipal) {
      gruposComPrincipal.add(grupoKey);
    }

    return {
      ...guest,
      contato_principal: contatoPrincipal,
      recebe_convite: contatoPrincipal,
    };
  });
}

function normalizeMappedRows(mappedRows: any[]): ImportGuest[] {
  return aplicarContatoPrincipal(mappedRows
    .map((row) => ({
      legacy_id: row.legacy_id ? String(row.legacy_id).trim() : null,
      grupo: row.grupo ? String(row.grupo).trim() : null,
      name: row.nome ? String(row.nome).trim() : "",
      phone: cleanPhone(row.telefone),
      crianca: normalizeCrianca(row.crianca, row.mae),
      mae: cleanText(row.mae),
      idade_crianca: normalizeIdadeCrianca(row.idade_crianca),
      status_rsvp: normalizeStatusRsvp(row.status_rsvp),
      status_envio: normalizeStatusEnvio(row.status_envio),
      data_hora_rsvp: row.data_hora_rsvp
        ? String(row.data_hora_rsvp).trim()
        : null,
      data_hora_envio: row.data_hora_envio
        ? String(row.data_hora_envio).trim()
        : null,
      raw: row,
    }))
    .filter((guest) => guest.name.length > 1));
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const action = body.action;
    const tenantId = body.tenantId;
    const eventoId = body.eventoId;
    const text = body.text || "";
    const mappedRows = Array.isArray(body.mappedRows) ? body.mappedRows : [];
    const batchId = body.batchId;
    const selectedIds: string[] = Array.isArray(body.selectedIds)
      ? body.selectedIds
      : [];

    if (!tenantId || !eventoId) {
      return NextResponse.json(
        { error: "tenantId e eventoId são obrigatórios." },
        { status: 400 }
      );
    }

    if (action === "preview") {
      let parsedGuests: ImportGuest[] = [];

      if (mappedRows.length > 0) {
        parsedGuests = normalizeMappedRows(mappedRows);
      } else {
        if (!text.trim()) {
          return NextResponse.json({ error: "Lista vazia." }, { status: 400 });
        }

        parsedGuests = aplicarContatoPrincipal(parseLegacyGuestList(text).map((guest) => ({
          legacy_id: guest.legacy_id,
          grupo: guest.grupo,
          name: guest.name,
          phone: guest.phone,
          crianca: normalizeCrianca((guest as any).crianca, (guest as any).mae),
          mae: cleanText((guest as any).mae),
          idade_crianca: normalizeIdadeCrianca((guest as any).idade_crianca),
          contato_principal: false,
          recebe_convite: false,
          status_rsvp: guest.status_rsvp,
          status_envio: guest.status_envio,
          data_hora_rsvp: guest.data_hora_rsvp,
          data_hora_envio: guest.data_hora_envio,
          raw: guest.raw,
        })));
      }

      if (parsedGuests.length === 0) {
        return NextResponse.json(
          { error: "Nenhum convidado válido encontrado para gerar prévia." },
          { status: 400 }
        );
      }

      const { data: batch, error: batchError } = await supabase
        .from("guest_import_batches")
        .insert({
          tenant_id: tenantId,
          event_id: eventoId,
          source_type: "spreadsheet",
          total_rows: parsedGuests.length,
          status: "preview",
          file_name:
            mappedRows.length > 0
              ? "importacao_planilha_mapeada_admin"
              : "importacao_texto_admin",
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

      const { data: existingByLegacy, error: existingLegacyError } =
        await supabase
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
        origem_importacao:
          mappedRows.length > 0 ? "planilha_mapeada" : "texto_importado",
        nome: guest.name,
        telefone: guest.phone,
        grupo: guest.grupo,
        crianca: guest.crianca,
        mae: guest.mae,
        idade_crianca: guest.idade_crianca,
        contato_principal: guest.contato_principal,
        recebe_convite: guest.recebe_convite,
        quantidade: 1,
        status_rsvp: guest.status_rsvp || "pendente",
        status_envio: guest.status_envio || "pendente",
        data_hora_rsvp: guest.data_hora_rsvp || null,
        data_hora_envio: guest.data_hora_envio || null,
        is_duplicate:
          Boolean(guest.phone && existingPhones.has(guest.phone)) ||
          Boolean(guest.legacy_id && existingLegacyIds.has(guest.legacy_id)),
        raw_data: guest.raw || guest,
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
          origem_dados:
            mappedRows.length > 0 ? "planilha_mapeada" : "texto_importado",
        })
        .eq("id", eventoId)
        .eq("tenant_id", tenantId);

      await supabase.from("import_logs").insert({
        tenant_id: tenantId,
        evento_id: eventoId,
        batch_id: batch.id,
        tipo: "legacy_guests",
        acao: "preview_import",
        origem: mappedRows.length > 0 ? "planilha_mapeada" : "texto_importado",
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
        return NextResponse.json(
          { error: "batchId é obrigatório." },
          { status: 400 }
        );
      }

      if (selectedIds.length === 0) {
        return NextResponse.json(
          { error: "Selecione pelo menos um convidado para importar." },
          { status: 400 }
        );
      }

      const { data: previewRows, error: previewError } = await supabase
        .from("guest_import_preview")
        .select("*")
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId)
        .eq("event_id", eventoId)
        .eq("is_duplicate", false)
        .in("id", selectedIds);

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
        crianca: normalizeCrianca(item.crianca, item.mae),
        mae: cleanText(item.mae),
        idade_crianca: normalizeIdadeCrianca(item.idade_crianca),
        contato_principal: Boolean(item.contato_principal),
        recebe_convite: Boolean(item.recebe_convite),
        tipo_convite: item.grupo ? "grupo" : "individual",
        status_rsvp: item.status_rsvp || "pendente",
        status_envio: item.status_envio || "pendente",
        data_hora_rsvp: item.data_hora_rsvp || null,
        data_hora_envio: item.data_hora_envio || null,
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
        origem: rowsToInsert[0]?.origem_importacao || "planilha_legada",
        total: rowsToInsert.length,
      });

      return NextResponse.json({
        ok: true,
        imported: rowsToInsert.length,
      });
    }

    if (action === "update_existing") {
      if (!batchId) {
        return NextResponse.json(
          { error: "batchId é obrigatório." },
          { status: 400 }
        );
      }

      let duplicatedQuery = supabase
        .from("guest_import_preview")
        .select("*")
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId)
        .eq("event_id", eventoId)
        .eq("is_duplicate", true);

      if (selectedIds.length > 0) {
        duplicatedQuery = duplicatedQuery.in("id", selectedIds);
      }

      const { data: duplicatedRows, error: duplicatedError } =
        await duplicatedQuery;

      if (duplicatedError) {
        return NextResponse.json(
          { error: duplicatedError.message },
          { status: 500 }
        );
      }

      if (!duplicatedRows || duplicatedRows.length === 0) {
        return NextResponse.json(
          { error: "Nenhum convidado existente encontrado para atualizar." },
          { status: 400 }
        );
      }

      let updated = 0;
      let ignored = 0;
      const errors: string[] = [];

      for (const item of duplicatedRows) {
        let existingGuest: any = null;

        if (item.legacy_id) {
          const { data, error } = await supabase
            .from("convidados")
            .select(
              "id, telefone, legacy_id, tenant_id, evento_id, nome, grupo, status_rsvp, data_hora_rsvp"
            )
            .eq("tenant_id", tenantId)
            .eq("evento_id", eventoId)
            .eq("legacy_id", item.legacy_id)
            .maybeSingle();

          if (error) {
            errors.push(`Erro ao buscar legacy_id ${item.legacy_id}: ${error.message}`);
            ignored++;
            continue;
          }

          existingGuest = data;
        }

        if (!existingGuest && item.telefone) {
          const { data, error } = await supabase
            .from("convidados")
            .select(
              "id, telefone, legacy_id, tenant_id, evento_id, nome, grupo, status_rsvp, data_hora_rsvp"
            )
            .eq("tenant_id", tenantId)
            .eq("evento_id", eventoId)
            .eq("telefone", item.telefone)
            .maybeSingle();

          if (error) {
            errors.push(`Erro ao buscar telefone ${item.telefone}: ${error.message}`);
            ignored++;
            continue;
          }

          existingGuest = data;
        }

        if (!existingGuest) {
          ignored++;
          continue;
        }

        const updatePayload: any = {};

        // Atualiza somente dados vindos da planilha atualizada.
        // Não mexe em token, QR, cartão, check-in, envio ou histórico.
        if (item.status_rsvp) {
          updatePayload.status_rsvp = item.status_rsvp;
        }

        if (item.data_hora_rsvp) {
          updatePayload.data_hora_rsvp = item.data_hora_rsvp;
        }

        if (item.grupo) {
          updatePayload.grupo = item.grupo;
        }

        if (item.telefone && !existingGuest.telefone) {
          updatePayload.telefone = item.telefone;
        }

        if (item.crianca) {
          updatePayload.crianca = normalizeCrianca(item.crianca, item.mae);
        }

        if (item.mae) {
          updatePayload.mae = cleanText(item.mae);
        }

        if (item.idade_crianca) {
          updatePayload.idade_crianca = normalizeIdadeCrianca(item.idade_crianca);
        }

        if (Object.keys(updatePayload).length === 0) {
          ignored++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("convidados")
          .update(updatePayload)
          .eq("id", existingGuest.id)
          .eq("tenant_id", tenantId)
          .eq("evento_id", eventoId);

        if (updateError) {
          errors.push(
            `Erro ao atualizar ${item.nome || item.telefone || item.legacy_id}: ${updateError.message}`
          );
          ignored++;
          continue;
        }

        updated++;
      }

      const { error: batchUpdateError } = await supabase
        .from("guest_import_batches")
        .update({
          status: "updated",
          imported_rows: updated,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", batchId)
        .eq("tenant_id", tenantId)
        .eq("event_id", eventoId);

      if (batchUpdateError) {
        return NextResponse.json(
          { error: batchUpdateError.message },
          { status: 500 }
        );
      }

      await supabase.from("import_logs").insert({
        tenant_id: tenantId,
        evento_id: eventoId,
        batch_id: batchId,
        tipo: "legacy_guests",
        acao: "update_existing",
        origem: "planilha_atualizada",
        total: updated,
      });

      return NextResponse.json({
        ok: true,
        updated,
        ignored,
        errors,
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
