import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseLegacyGuestList } from "@/lib/importLegacyGuestsParser";

type ImportGuest = {
  legacy_id: string | null;
  grupo: string | null;
  name: string;
  phone: string | null;
  email?: string | null;
  crianca: string | null;
  mae: string | null;
  idade_crianca: string | number | null;
  tipo_contato?: string | null;
  responsavel_nome?: string | null;
  responsavel_telefone?: string | null;
  tipo_nucleo?: string | null;
  nucleo?: string | null;
  relacao_nucleo?: string | null;
  relacao_responsavel_nucleo?: string | null;
  relacao_evento?: string | null;
  recebe_comunicacao?: boolean;
  principal_envio?: boolean;
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

function normalizeTextKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;

  const raw = normalizeTextKey(value);
  if (!raw) return fallback;

  if (["sim", "s", "true", "1", "yes", "y"].includes(raw)) return true;
  if (["nao", "não", "n", "false", "0", "no"].includes(raw)) return false;

  return fallback;
}

function normalizeTipoContato(value: unknown, crianca: unknown, mae: unknown) {
  const raw = normalizeTextKey(value);
  const criancaNormalizada = normalizeCrianca(crianca, mae);

  if (raw === "crianca" || raw === "criança" || raw === "infantil") return "crianca";
  if (criancaNormalizada === "sim") return "crianca";

  return "adulto";
}

function normalizeTipoNucleo(value: unknown) {
  const raw = normalizeTextKey(value).replace(/\s+/g, "_");

  if (!raw) return "familia";
  if (raw === "família") return "familia";
  if (["familia", "empresa", "escola", "igreja", "associacao", "associação", "fornecedor", "politico", "político", "corporativo", "outro"].includes(raw)) {
    if (raw === "associação") return "associacao";
    if (raw === "político") return "politico";
    return raw;
  }

  return raw;
}

function normalizePapelNucleo(value: unknown, fallback: string) {
  const text = cleanText(value);
  return text ? text : fallback;
}

function getRawValue(raw: any, keys: string[]): string | null {
  if (!raw || typeof raw !== "object") return null;

  for (const key of keys) {
    const direct = raw[key];
    if (cleanText(direct)) return cleanText(direct);
  }

  return null;
}

async function ensureTenantContato(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: {
    tenantId: string;
    nome: string;
    telefone?: string | null;
    email?: string | null;
    tipoContato?: string | null;
    responsavelNome?: string | null;
    responsavelTelefone?: string | null;
    origem?: string;
  }
) {
  const nome = cleanText(params.nome);
  if (!nome) return null;

  const telefoneNormalizado = cleanPhone(params.telefone || undefined);
  const tipoContato = params.tipoContato || "adulto";

  let query = supabase
    .from("tenant_contatos")
    .select("id, nome, telefone, telefone_normalizado, email, tipo_contato, responsavel_nome, responsavel_telefone")
    .eq("tenant_id", params.tenantId)
    .limit(1);

  if (telefoneNormalizado) {
    query = query.eq("telefone_normalizado", telefoneNormalizado);
  } else {
    query = query.eq("nome", nome);

    if (tipoContato === "crianca" && cleanText(params.responsavelNome)) {
      query = query.eq("responsavel_nome", cleanText(params.responsavelNome));
    }
  }

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) throw new Error(findError.message);

  const payload: any = {
    nome,
    telefone: telefoneNormalizado || cleanText(params.telefone) || null,
    telefone_normalizado: telefoneNormalizado || null,
    email: cleanText(params.email) || null,
    tipo_contato: tipoContato,
    responsavel_nome: tipoContato === "crianca" ? cleanText(params.responsavelNome) : null,
    responsavel_telefone: tipoContato === "crianca" ? cleanPhone(params.responsavelTelefone || undefined) || cleanText(params.responsavelTelefone) : null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const updatePayload: any = { updated_at: payload.updated_at };

    if (payload.nome && valuesAreDifferent(payload.nome, existing.nome)) updatePayload.nome = payload.nome;
    if (payload.telefone && !existing.telefone) updatePayload.telefone = payload.telefone;
    if (payload.telefone_normalizado && !existing.telefone_normalizado) updatePayload.telefone_normalizado = payload.telefone_normalizado;
    if (payload.email && !existing.email) updatePayload.email = payload.email;
    if (payload.tipo_contato && valuesAreDifferent(payload.tipo_contato, existing.tipo_contato)) updatePayload.tipo_contato = payload.tipo_contato;
    if (payload.responsavel_nome && !existing.responsavel_nome) updatePayload.responsavel_nome = payload.responsavel_nome;
    if (payload.responsavel_telefone && !existing.responsavel_telefone) updatePayload.responsavel_telefone = payload.responsavel_telefone;

    if (Object.keys(updatePayload).length > 1) {
      const { error: updateError } = await supabase
        .from("tenant_contatos")
        .update(updatePayload)
        .eq("id", existing.id)
        .eq("tenant_id", params.tenantId);

      if (updateError) throw new Error(updateError.message);
    }

    return existing.id as string;
  }

  const { data: created, error: insertError } = await supabase
    .from("tenant_contatos")
    .insert({
      tenant_id: params.tenantId,
      ...payload,
      origem: params.origem || "importacao_admin_evento",
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  return created?.id as string;
}

async function ensureContatoGrupo(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: { tenantId: string; nome: string; tipoNucleo?: string | null; origem?: string }
) {
  const nome = cleanText(params.nome);
  if (!nome) return null;

  const tipoNucleo = normalizeTipoNucleo(params.tipoNucleo);

  const { data: existing, error: findError } = await supabase
    .from("contato_grupos")
    .select("id, tipo, tipo_nucleo")
    .eq("tenant_id", params.tenantId)
    .eq("nome", nome)
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing?.id) {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (tipoNucleo && !existing.tipo_nucleo) updatePayload.tipo_nucleo = tipoNucleo;
    if (tipoNucleo && !existing.tipo) updatePayload.tipo = tipoNucleo;

    if (Object.keys(updatePayload).length > 1) {
      const { error: updateError } = await supabase
        .from("contato_grupos")
        .update(updatePayload)
        .eq("id", existing.id)
        .eq("tenant_id", params.tenantId);

      if (updateError) throw new Error(updateError.message);
    }

    return existing.id as string;
  }

  const { data: created, error: insertError } = await supabase
    .from("contato_grupos")
    .insert({
      tenant_id: params.tenantId,
      nome,
      tipo: tipoNucleo,
      tipo_nucleo: tipoNucleo,
      origem: params.origem || "importacao_admin_evento",
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  return created?.id as string;
}

async function ensureContatoGrupoMembro(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: {
    tenantId: string;
    grupoContatoId: string | null;
    tenantContatoId: string | null;
    papel: string;
    recebeComunicacao?: boolean;
    principalEnvio?: boolean;
  }
) {
  if (!params.grupoContatoId || !params.tenantContatoId) return;

  const { data: existing, error: findError } = await supabase
    .from("contato_grupo_membros")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("grupo_contato_id", params.grupoContatoId)
    .eq("tenant_contato_id", params.tenantContatoId)
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  const payload = {
    papel: params.papel,
    papel_nucleo: params.papel,
    recebe_comunicacao: Boolean(params.recebeComunicacao),
    principal_envio: Boolean(params.principalEnvio),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("contato_grupo_membros")
      .update(payload)
      .eq("id", existing.id)
      .eq("tenant_id", params.tenantId);

    if (updateError) throw new Error(updateError.message);
    return;
  }

  const { error: insertError } = await supabase.from("contato_grupo_membros").insert({
    tenant_id: params.tenantId,
    grupo_contato_id: params.grupoContatoId,
    tenant_contato_id: params.tenantContatoId,
    ...payload,
  });

  if (insertError) throw new Error(insertError.message);
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
      email: cleanText(row.email),
      crianca: normalizeCrianca(row.crianca, row.mae || row.responsavel_nome),
      mae: cleanText(row.mae),
      idade_crianca: normalizeIdadeCrianca(row.idade_crianca),
      tipo_contato: normalizeTipoContato(row.tipo_contato, row.crianca, row.mae || row.responsavel_nome),
      responsavel_nome: cleanText(row.responsavel_nome) || cleanText(row.mae),
      responsavel_telefone: cleanPhone(row.responsavel_telefone) || cleanText(row.responsavel_telefone),
      tipo_nucleo: cleanText(row.tipo_nucleo),
      nucleo: cleanText(row.nucleo),
      relacao_nucleo: cleanText(row.relacao_nucleo),
      relacao_responsavel_nucleo: cleanText(row.relacao_responsavel_nucleo),
      relacao_evento: cleanText(row.relacao_evento),
      recebe_comunicacao: normalizeBoolean(row.recebe_comunicacao, false),
      principal_envio: normalizeBoolean(row.principal_envio, false),
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

function normalizeComparableValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function valuesAreDifferent(newValue: unknown, oldValue: unknown) {
  const normalizedNew = normalizeComparableValue(newValue);
  const normalizedOld = normalizeComparableValue(oldValue);

  if (!normalizedNew) return false;

  return normalizedNew !== normalizedOld;
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
          email: null,
          crianca: normalizeCrianca((guest as any).crianca, (guest as any).mae),
          mae: cleanText((guest as any).mae),
          idade_crianca: normalizeIdadeCrianca((guest as any).idade_crianca),
          tipo_contato: normalizeTipoContato(null, (guest as any).crianca, (guest as any).mae),
          responsavel_nome: cleanText((guest as any).mae),
          responsavel_telefone: null,
          tipo_nucleo: null,
          nucleo: null,
          relacao_nucleo: null,
          relacao_responsavel_nucleo: null,
          relacao_evento: null,
          recebe_comunicacao: false,
          principal_envio: false,
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

      const { data: existingGuests, error: existingGuestsError } = await supabase
        .from("convidados")
        .select("id, nome, telefone, legacy_id")
        .eq("tenant_id", tenantId)
        .eq("evento_id", eventoId);

      if (existingGuestsError) {
        return NextResponse.json(
          { error: existingGuestsError.message },
          { status: 500 }
        );
      }

      const { data: existingContacts, error: existingContactsError } = await supabase
        .from("tenant_contatos")
        .select("id, nome, telefone, telefone_normalizado")
        .eq("tenant_id", tenantId);

      if (existingContactsError) {
        return NextResponse.json(
          { error: existingContactsError.message },
          { status: 500 }
        );
      }

      const guestsByPhone = new Map<string, any>();
      const guestsByLegacyId = new Map<string, any>();
      const guestsByName = new Map<string, any>();

      for (const existingGuest of existingGuests || []) {
        const phoneKey = cleanPhone(existingGuest.telefone);
        const legacyKey = cleanText(existingGuest.legacy_id);
        const nameKey = normalizeTextKey(existingGuest.nome);

        if (phoneKey && !guestsByPhone.has(phoneKey)) guestsByPhone.set(phoneKey, existingGuest);
        if (legacyKey && !guestsByLegacyId.has(legacyKey)) guestsByLegacyId.set(legacyKey, existingGuest);
        if (nameKey && !guestsByName.has(nameKey)) guestsByName.set(nameKey, existingGuest);
      }

      const contactsByPhone = new Map<string, any>();
      const contactsByName = new Map<string, any>();

      for (const existingContact of existingContacts || []) {
        const phoneKey = cleanPhone(existingContact.telefone_normalizado || existingContact.telefone);
        const nameKey = normalizeTextKey(existingContact.nome);

        if (phoneKey && !contactsByPhone.has(phoneKey)) contactsByPhone.set(phoneKey, existingContact);
        if (nameKey && !contactsByName.has(nameKey)) contactsByName.set(nameKey, existingContact);
      }

      const previewRows = parsedGuests.map((guest) => {
        const isCrianca = normalizeTipoContato(
          guest.tipo_contato,
          guest.crianca,
          guest.mae || guest.responsavel_nome
        ) === "crianca";

        const guestPhoneKey = cleanPhone(guest.phone);
        const guestLegacyKey = cleanText(guest.legacy_id);
        const guestNameKey = normalizeTextKey(guest.name);

        const existingGuest =
          (guestPhoneKey ? guestsByPhone.get(guestPhoneKey) : null) ||
          (guestLegacyKey ? guestsByLegacyId.get(guestLegacyKey) : null) ||
          (guestNameKey ? guestsByName.get(guestNameKey) : null) ||
          null;

        const existingContact =
          (guestPhoneKey ? contactsByPhone.get(guestPhoneKey) : null) ||
          (guestNameKey ? contactsByName.get(guestNameKey) : null) ||
          null;

        const eventExists = Boolean(existingGuest);
        const crmExists = Boolean(existingContact);
        const sourceRaw = guest.raw || guest;

        return {
          batch_id: batch.id,
          tenant_id: tenantId,
          event_id: eventoId,
          legacy_id: guest.legacy_id,
          origem_importacao:
            mappedRows.length > 0 ? "planilha_mapeada" : "texto_importado",
          nome: guest.name,
          telefone: guest.phone,
          email: cleanText(guest.email),
          grupo: guest.grupo,
          crianca: isCrianca ? "sim" : normalizeCrianca(guest.crianca, guest.mae || guest.responsavel_nome),
          mae: guest.mae,
          idade_crianca: guest.idade_crianca,
          tipo_contato: isCrianca ? "crianca" : "adulto",
          responsavel_nome: cleanText(guest.responsavel_nome) || cleanText(guest.mae),
          responsavel_telefone: cleanPhone(guest.responsavel_telefone) || cleanText(guest.responsavel_telefone),
          tipo_nucleo: cleanText(guest.tipo_nucleo),
          nucleo: cleanText(guest.nucleo),
          relacao_nucleo: cleanText(guest.relacao_nucleo),
          relacao_responsavel_nucleo: cleanText(guest.relacao_responsavel_nucleo),
          relacao_evento: cleanText(guest.relacao_evento),
          recebe_comunicacao: Boolean(guest.recebe_comunicacao),
          principal_envio: Boolean(guest.principal_envio),
          contato_principal: Boolean(guest.principal_envio) || guest.contato_principal,
          recebe_convite: Boolean(guest.recebe_comunicacao) || guest.recebe_convite,
          quantidade: 1,
          status_rsvp: guest.status_rsvp || "pendente",
          status_envio: guest.status_envio || "pendente",
          data_hora_rsvp: guest.data_hora_rsvp || null,
          data_hora_envio: guest.data_hora_envio || null,
          is_duplicate: eventExists,
          raw_data: {
            ...sourceRaw,
            crm_exists: crmExists,
            crm_status: crmExists ? "contato_existente" : "novo_contato",
            crm_contact_id: existingContact?.id || null,
            event_exists: eventExists,
            evento_status: eventExists ? "convidado_existente" : "novo_convidado",
            event_guest_id: existingGuest?.id || null,
            matched_by: existingGuest
              ? guestPhoneKey && existingGuest.telefone && cleanPhone(existingGuest.telefone) === guestPhoneKey
                ? "telefone_evento"
                : guestLegacyKey && existingGuest.legacy_id === guestLegacyKey
                ? "legacy_id_evento"
                : "nome_evento"
              : existingContact
              ? guestPhoneKey && cleanPhone(existingContact.telefone_normalizado || existingContact.telefone) === guestPhoneKey
                ? "telefone_crm"
                : "nome_crm"
              : "novo",
          },
        };
      });

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

      const rowsToInsert: any[] = [];

      for (const item of previewRows || []) {
        const raw = item.raw_data || {};
        const responsavelNome =
          cleanText(item.responsavel_nome) || cleanText(raw.responsavel_nome) || cleanText(item.mae) || cleanText(raw.mae);
        const responsavelTelefone =
          cleanPhone(item.responsavel_telefone) || cleanPhone(raw.responsavel_telefone) || cleanText(item.responsavel_telefone) || cleanText(raw.responsavel_telefone);
        const tipoContato = normalizeTipoContato(item.tipo_contato || raw.tipo_contato, item.crianca, responsavelNome || item.mae);
        const isCrianca = tipoContato === "crianca" || normalizeCrianca(item.crianca, responsavelNome || item.mae) === "sim";
        const nucleoNome = cleanText(item.nucleo) || cleanText(raw.nucleo) || cleanText(item.grupo);
        const tipoNucleo = cleanText(item.tipo_nucleo) || cleanText(raw.tipo_nucleo) || (nucleoNome ? "familia" : null);
        const relacaoNucleo = normalizePapelNucleo(item.relacao_nucleo || raw.relacao_nucleo, isCrianca ? "filho" : "membro");
        const relacaoResponsavelNucleo = normalizePapelNucleo(item.relacao_responsavel_nucleo || raw.relacao_responsavel_nucleo, "responsavel");
        const recebeComunicacao = normalizeBoolean(item.recebe_comunicacao ?? raw.recebe_comunicacao, Boolean(item.recebe_convite));
        const principalEnvio = normalizeBoolean(item.principal_envio ?? raw.principal_envio, Boolean(item.contato_principal));

        const tenantContatoId = await ensureTenantContato(supabase, {
          tenantId,
          nome: item.nome,
          telefone: item.telefone,
          email: cleanText(raw.email),
          tipoContato: isCrianca ? "crianca" : "adulto",
          responsavelNome,
          responsavelTelefone,
          origem: "importacao_admin_evento",
        });

        let responsavelContatoId: string | null = null;
        if (isCrianca && responsavelNome) {
          responsavelContatoId = await ensureTenantContato(supabase, {
            tenantId,
            nome: responsavelNome,
            telefone: responsavelTelefone,
            tipoContato: "adulto",
            origem: "importacao_admin_evento_responsavel",
          });
        }

        let grupoContatoId: string | null = null;
        if (nucleoNome) {
          grupoContatoId = await ensureContatoGrupo(supabase, {
            tenantId,
            nome: nucleoNome,
            tipoNucleo,
            origem: "importacao_admin_evento",
          });

          await ensureContatoGrupoMembro(supabase, {
            tenantId,
            grupoContatoId,
            tenantContatoId,
            papel: relacaoNucleo,
            recebeComunicacao,
            principalEnvio,
          });

          if (responsavelContatoId) {
            await ensureContatoGrupoMembro(supabase, {
              tenantId,
              grupoContatoId,
              tenantContatoId: responsavelContatoId,
              papel: relacaoResponsavelNucleo,
              recebeComunicacao: true,
              principalEnvio: true,
            });
          }
        }

        rowsToInsert.push({
          tenant_id: tenantId,
          evento_id: eventoId,
          import_batch_id: batchId,
          legacy_id: item.legacy_id,
          origem_importacao: item.origem_importacao || "planilha_legada",
          nome: item.nome,
          telefone: item.telefone,
          email: cleanText(item.email) || cleanText(raw.email) || null,
          grupo: nucleoNome || item.grupo,
          crianca: isCrianca ? "sim" : normalizeCrianca(item.crianca, responsavelNome || item.mae),
          mae: cleanText(item.mae),
          idade_crianca: normalizeIdadeCrianca(item.idade_crianca),
          contato_principal: principalEnvio || Boolean(item.contato_principal),
          recebe_convite: recebeComunicacao || Boolean(item.recebe_convite),
          tipo_convite: nucleoNome || item.grupo ? "grupo" : "individual",
          status_rsvp: item.status_rsvp || "pendente",
          status_envio: item.status_envio || "pendente",
          data_hora_rsvp: item.data_hora_rsvp || null,
          data_hora_envio: item.data_hora_envio || null,
          status_checkin: "nao_entrou",
          responsavel: isCrianca ? responsavelNome : null,
          responsavel_telefone: isCrianca ? responsavelTelefone : null,
          tenant_contato_id: tenantContatoId,
          relacao_evento: cleanText(item.relacao_evento) || cleanText(raw.relacao_evento) || null,
          token: gerarToken(),
        });
      }

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
      let changed = 0;
      let unchanged = 0;
      let ignored = 0;
      const errors: string[] = [];

      for (const item of duplicatedRows) {
        let existingGuest: any = null;

        if (item.legacy_id) {
          const { data, error } = await supabase
            .from("convidados")
            .select(
              "id, telefone, legacy_id, tenant_id, evento_id, nome, grupo, status_rsvp, data_hora_rsvp, crianca, mae, idade_crianca"
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
              "id, telefone, legacy_id, tenant_id, evento_id, nome, grupo, status_rsvp, data_hora_rsvp, crianca, mae, idade_crianca"
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

        function addIfChanged(field: string, newValue: unknown, oldValue: unknown) {
          if (valuesAreDifferent(newValue, oldValue)) {
            updatePayload[field] = newValue;
          }
        }

        // Atualiza somente dados vindos da planilha atualizada que realmente mudaram.
        // Não mexe em token, QR, cartão, check-in, envio ou histórico.
        addIfChanged("status_rsvp", item.status_rsvp, existingGuest.status_rsvp);
        addIfChanged("data_hora_rsvp", item.data_hora_rsvp, existingGuest.data_hora_rsvp);
        addIfChanged("grupo", item.grupo, existingGuest.grupo);

        if (item.telefone && !existingGuest.telefone) {
          updatePayload.telefone = item.telefone;
        }

        addIfChanged(
          "crianca",
          normalizeCrianca(item.crianca, item.mae),
          existingGuest.crianca
        );
        addIfChanged("mae", cleanText(item.mae), existingGuest.mae);
        addIfChanged(
          "idade_crianca",
          normalizeIdadeCrianca(item.idade_crianca),
          existingGuest.idade_crianca
        );

        if (Object.keys(updatePayload).length === 0) {
          unchanged++;
          continue;
        }

        changed++;

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

      const confirmedAt = new Date().toISOString();

      const { data: updatedBatch, error: batchUpdateError } = await supabase
        .from("guest_import_batches")
        .update({
          status: "updated",
          imported_rows: updated,
          duplicated_rows: duplicatedRows.length,
          confirmed_at: confirmedAt,
        })
        .eq("id", batchId)
        .eq("tenant_id", tenantId)
        .eq("event_id", eventoId)
        .select("id, status, total_rows, imported_rows, duplicated_rows, confirmed_at")
        .maybeSingle();

      if (batchUpdateError) {
        return NextResponse.json(
          { error: batchUpdateError.message },
          { status: 500 }
        );
      }

      if (!updatedBatch) {
        return NextResponse.json(
          { error: "Atualização concluída, mas o lote não foi encontrado para gravar o histórico." },
          { status: 404 }
        );
      }

      const { error: logError } = await supabase.from("import_logs").insert({
        tenant_id: tenantId,
        evento_id: eventoId,
        batch_id: batchId,
        tipo: "legacy_guests",
        acao: "update_existing",
        origem: "planilha_atualizada",
        total: updated,
      });

      if (logError) {
        return NextResponse.json(
          { error: logError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        duplicated: duplicatedRows.length,
        changed,
        updated,
        unchanged,
        ignored,
        errors,
        batch: updatedBatch,
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
