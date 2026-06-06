"use client";

import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tenant = {
  id: string;
  nome: string | null;
  responsavel_nome?: string | null;
  telefone?: string | null;
  status?: string | null;
};

type Evento = {
  id: string;
  nome: string;
};

type PreviewRow = {
  id: string;
  legacy_id: string | null;
  nome: string;
  telefone: string | null;
  email?: string | null;
  grupo: string | null;
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
  recebe_comunicacao?: boolean | null;
  principal_envio?: boolean | null;
  contato_principal?: boolean | null;
  recebe_convite?: boolean | null;
  status_rsvp: string | null;
  status_envio: string | null;
  data_hora_rsvp: string | null;
  data_hora_envio: string | null;
  observacoes?: string | null;
  raw_data?: any;
  is_duplicate: boolean;
};

type ImportHistoryItem = {
  id: string;
  source_type: string | null;
  file_name: string | null;
  total_rows: number | null;
  imported_rows: number | null;
  duplicated_rows: number | null;
  reverted_rows: number | null;
  status: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  reverted_at: string | null;
};

type SheetMapping = {
  legacy_id: string;
  grupo: string;
  nome: string;
  telefone: string;
  email: string;
  crianca: string;
  mae: string;
  idade_crianca: string;
  tipo_contato: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  tipo_nucleo: string;
  nucleo: string;
  relacao_nucleo: string;
  relacao_responsavel_nucleo: string;
  relacao_evento: string;
  recebe_comunicacao: string;
  principal_envio: string;
  status_rsvp: string;
  status_envio: string;
  data_hora_rsvp: string;
  data_hora_envio: string;
};

type VcfContact = {
  nome: string;
  telefone: string | null;
  grupo: string | null;
};

type MappedRow = {
  legacy_id: string;
  grupo: string;
  nome: string;
  telefone: string;
  email: string;
  crianca: string;
  mae: string;
  idade_crianca: string;
  tipo_contato: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  tipo_nucleo: string;
  nucleo: string;
  relacao_nucleo: string;
  relacao_responsavel_nucleo: string;
  relacao_evento: string;
  recebe_comunicacao: string;
  principal_envio: string;
  status_rsvp: string;
  status_envio: string;
  data_hora_rsvp: string;
  data_hora_envio: string;
};

type ImportRowDecision = "manter" | "atualizar" | "rejeitar" | "criar_novo";

type FieldComparison = {
  field: string;
  label: string;
  crmValue: string;
  importValue: string;
  severity: "complemento" | "divergencia" | "conflito";
};

const initialMapping: SheetMapping = {
  legacy_id: "",
  grupo: "",
  nome: "",
  telefone: "",
  email: "",
  crianca: "",
  mae: "",
  idade_crianca: "",
  tipo_contato: "",
  responsavel_nome: "",
  responsavel_telefone: "",
  tipo_nucleo: "",
  nucleo: "",
  relacao_nucleo: "",
  relacao_responsavel_nucleo: "",
  relacao_evento: "",
  recebe_comunicacao: "",
  principal_envio: "",
  status_rsvp: "",
  status_envio: "",
  data_hora_rsvp: "",
  data_hora_envio: "",
};

export default function AdminImportacaoPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<SheetMapping>(initialMapping);
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [vcfFileName, setVcfFileName] = useState<string | null>(null);
  const [vcfContacts, setVcfContacts] = useState<VcfContact[]>([]);
  const [activeMode, setActiveMode] = useState<"texto" | "sheets" | "excel" | "vcf">("texto");
  const [rowDecisions, setRowDecisions] = useState<Record<string, ImportRowDecision>>({});

  const hasSheetLoaded = sheetHeaders.length > 0 && sheetRows.length > 0;

  const mappedTextPreview = useMemo(() => {
    if (!hasSheetLoaded) return "";
    return montarTextoMapeado(false);
  }, [sheetRows, mapping, hasSheetLoaded]);

  async function carregarHistorico(tenant: string, evento: string) {
    const response = await fetch("/api/admin/import-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant, eventoId: evento }),
    });

    const result = await response.json();

    if (response.ok) {
      setHistory(result.history || []);
    }
  }

  async function carregarEventosDoTenant(tenant: string, selecionarPrimeiro = true) {
    setEventos([]);
    setEventoId("");
    setHistory([]);
    limparPreview();

    const { data: eventosData, error: eventosError } = await supabase
      .from("eventos")
      .select("id, nome")
      .eq("tenant_id", tenant)
      .order("created_at", { ascending: false });

    if (eventosError) {
      alert("Erro ao carregar eventos: " + eventosError.message);
      return;
    }

    const listaEventos = (eventosData || []) as Evento[];
    setEventos(listaEventos);

    if (selecionarPrimeiro && listaEventos.length > 0) {
      setEventoId(listaEventos[0].id);
      await carregarHistorico(tenant, listaEventos[0].id);
    }
  }

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    const { data: tenantsData, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, nome, responsavel_nome, telefone, status")
      .order("nome", { ascending: true });

    if (tenantsError) {
      alert("Erro ao carregar clientes/empresas: " + tenantsError.message);
      return;
    }

    const listaTenants = (tenantsData || []) as Tenant[];
    setTenants(listaTenants);

    if (listaTenants.length > 0) {
      const primeiroTenant = listaTenants[0].id;
      setTenantId(primeiroTenant);
      await carregarEventosDoTenant(primeiroTenant, true);
    }
  }

  function limparPreview() {
    setPreview([]);
    setSelectedIds([]);
    setBatchId(null);
    setRowDecisions({});
  }

  function cancelarPrevia() {
    setTexto("");
    setVcfFileName(null);
    setVcfContacts([]);
    limparPreview();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (spreadsheetInputRef.current) {
      spreadsheetInputRef.current.value = "";
    }
  }

  function limparPlanilhaCarregada() {
    setSheetHeaders([]);
    setSheetRows([]);
    setMapping(initialMapping);
    setTexto("");
    setActiveMode("texto");
    limparPreview();

    if (spreadsheetInputRef.current) {
      spreadsheetInputRef.current.value = "";
    }
  }

  function limparVcf() {
    setVcfFileName(null);
    setVcfContacts([]);
    setTexto("");
    setActiveMode("texto");
    limparPreview();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function normalizarGoogleSheetsUrl(url: string) {
    if (url.includes("/pubhtml")) {
      return url.replace("/pubhtml", "/pub?output=csv");
    }

    return url;
  }

  function normalizePhone(phone: string | null) {
    if (!phone) return null;

    const onlyNumbers = phone.replace(/\D/g, "");

    if (!onlyNumbers) return null;

    return onlyNumbers;
  }

  function decodeVcfValue(value: string) {
    return value
      .replace(/\\n/g, " ")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseVCF(vcfText: string): VcfContact[] {
    const contacts: VcfContact[] = [];
    const normalizedText = vcfText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");

    const blocks = normalizedText
      .split(/END:VCARD/i)
      .map((block) => block.trim())
      .filter(Boolean);

    for (const block of blocks) {
      const lines = block.split(/\r?\n/);

      const fnLine = lines.find((line) => /^FN/i.test(line));
      const nLine = lines.find((line) => /^N[:;]/i.test(line));
      const telLine = lines.find((line) => /^TEL/i.test(line));

      let rawName = "";

      if (fnLine) {
        rawName = fnLine.split(":").slice(1).join(":");
      }

      if (!rawName && nLine) {
        rawName = nLine
          .split(":")
          .slice(1)
          .join(":")
          .split(";")
          .filter(Boolean)
          .reverse()
          .join(" ");
      }

      const rawPhone = telLine ? telLine.split(":").slice(1).join(":") : "";

      let nome = decodeVcfValue(rawName);
      let grupo: string | null = null;

      if (!nome) continue;

      if (nome.includes(" - ")) {
        const [possibleGroup, ...rest] = nome.split(" - ");
        const parsedName = rest.join(" - ").trim();

        if (possibleGroup.trim() && parsedName) {
          grupo = possibleGroup.trim();
          nome = parsedName;
        }
      }

      contacts.push({
        nome,
        telefone: normalizePhone(rawPhone),
        grupo,
      });
    }

    return contacts;
  }

  function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && next === '"' && insideQuotes) {
        current += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if ((char === "," || char === ";" || char === "\t") && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  function normalizarTextoBusca(value: string) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }


  function normalizarValorComparacao(value: any) {
    if (value === null || value === undefined) return "";

    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }

    const text = String(value).trim();
    return text.length > 0 ? text : "";
  }

  function getRawValue(rawData: any, keys: string[]) {
    for (const key of keys) {
      const value = rawData?.[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return value;
      }
    }

    return "";
  }

  function getNestedRawValue(rawData: any, paths: string[][]) {
    for (const path of paths) {
      let current = rawData;

      for (const key of path) {
        current = current?.[key];
      }

      if (current !== null && current !== undefined && String(current).trim() !== "") {
        return current;
      }
    }

    return "";
  }

  function montarComparacoesCampos(item: PreviewRow): FieldComparison[] {
    const rawData = item.raw_data || {};
    const explicitComparisons =
      rawData.field_comparisons ||
      rawData.comparacoes_campos ||
      rawData.diferencas_campos ||
      rawData.diff_fields ||
      rawData.crm_differences ||
      rawData.divergent_fields ||
      [];

    if (Array.isArray(explicitComparisons) && explicitComparisons.length > 0) {
      return explicitComparisons
        .map((field: any) => {
          const fieldKey = String(field.field || field.campo || field.key || field.name || "");
          const label = String(field.label || field.campo_label || fieldKey || "Campo");
          const crmValue = normalizarValorComparacao(
            field.crmValue ?? field.crm_value ?? field.valor_crm ?? field.current ?? field.atual ?? field.old
          );
          const importValue = normalizarValorComparacao(
            field.importValue ?? field.import_value ?? field.valor_importacao ?? field.incoming ?? field.novo ?? field.new
          );
          const severity = String(field.severity || field.tipo || field.status || "divergencia");

          return {
            field: fieldKey || label,
            label,
            crmValue: crmValue || "vazio",
            importValue: importValue || "vazio",
            severity: severity === "conflito" || severity === "conflict"
              ? "conflito"
              : severity === "complemento" || severity === "complement" || severity === "update"
              ? "complemento"
              : "divergencia",
          } as FieldComparison;
        })
        .filter((field: FieldComparison) => field.crmValue !== field.importValue);
    }

    const crmSnapshot = rawData.crm_contact || rawData.crm_snapshot || rawData.contato_crm || rawData.existing_contact || {};
    const importSnapshot = rawData.import_snapshot || rawData.importacao || rawData.incoming_contact || rawData;

    const definitions: Array<{
      field: string;
      label: string;
      crmKeys: string[][];
      importKeys: string[][];
      critical?: boolean;
    }> = [
      {
        field: "nome",
        label: "Nome",
        crmKeys: [["nome"], ["name"]],
        importKeys: [["nome"], ["name"]],
      },
      {
        field: "telefone",
        label: "Telefone",
        crmKeys: [["telefone"], ["telefone_normalizado"], ["phone"]],
        importKeys: [["telefone"], ["phone"]],
      },
      {
        field: "email",
        label: "E-mail",
        crmKeys: [["email"]],
        importKeys: [["email"]],
      },
      {
        field: "tipo_contato",
        label: "Tipo contato",
        crmKeys: [["tipo_contato"]],
        importKeys: [["tipo_contato"]],
      },
      {
        field: "responsavel_nome",
        label: "Responsável",
        crmKeys: [["responsavel_nome"], ["nome_responsavel"]],
        importKeys: [["responsavel_nome"]],
        critical: true,
      },
      {
        field: "responsavel_telefone",
        label: "Telefone responsável",
        crmKeys: [["responsavel_telefone"], ["telefone_responsavel"]],
        importKeys: [["responsavel_telefone"]],
        critical: true,
      },
      {
        field: "nucleo",
        label: "Núcleo",
        crmKeys: [["nucleo"], ["grupo"]],
        importKeys: [["nucleo"], ["grupo"]],
      },
      {
        field: "relacao_nucleo",
        label: "Relação núcleo",
        crmKeys: [["relacao_nucleo"]],
        importKeys: [["relacao_nucleo"]],
      },
      {
        field: "relacao_evento",
        label: "Relação evento",
        crmKeys: [["relacao_evento"]],
        importKeys: [["relacao_evento"]],
      },
    ];

    return definitions
      .map((definition) => {
        const crmValue = normalizarValorComparacao(getNestedRawValue(crmSnapshot, definition.crmKeys));
        const importValue = normalizarValorComparacao(getNestedRawValue(importSnapshot, definition.importKeys));

        if (!crmValue && !importValue) return null;

        const normalizedCrm = normalizarTextoBusca(crmValue);
        const normalizedImport = normalizarTextoBusca(importValue);

        if (normalizedCrm === normalizedImport) return null;

        let severity: FieldComparison["severity"] = "divergencia";

        if (!crmValue && importValue) {
          severity = "complemento";
        } else if (definition.critical && crmValue && importValue) {
          severity = "conflito";
        }

        return {
          field: definition.field,
          label: definition.label,
          crmValue: crmValue || "vazio",
          importValue: importValue || "vazio",
          severity,
        } as FieldComparison;
      })
      .filter(Boolean) as FieldComparison[];
  }

  function getPreviewStatus(item: PreviewRow) {
    const rawData = item.raw_data || {};
    const comparisons = montarComparacoesCampos(item);
    const hasConflict =
      comparisons.some((field) => field.severity === "conflito") ||
      Boolean(rawData.has_conflict || rawData.tem_conflito || rawData.conflict);
    const hasDivergence =
      comparisons.some((field) => field.severity === "divergencia") ||
      Boolean(rawData.has_divergence || rawData.tem_divergencia || rawData.divergence);
    const hasComplement =
      comparisons.some((field) => field.severity === "complemento") ||
      Boolean(rawData.has_update || rawData.tem_atualizacao || rawData.has_complement);

    if (hasConflict) return "conflito";
    if (hasDivergence) return "divergencia";
    if (hasComplement) return "complemento";
    if (Boolean(rawData.crm_exists || rawData.event_exists || item.is_duplicate)) return "existente";
    return "novo";
  }

  function aplicarDecisaoLinha(item: PreviewRow, decision: ImportRowDecision) {
    setRowDecisions((prev) => ({ ...prev, [item.id]: decision }));

    if (decision === "rejeitar" || decision === "manter") {
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      return;
    }

    setSelectedIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
  }

  function linhaPareceCabecalho(row: string[]) {
    const termosCabecalho = [
      "id",
      "nome",
      "convidado",
      "telefone",
      "whatsapp",
      "celular",
      "mae",
      "crianca",
      "idade",
      "grupo",
      "familia",
      "status",
      "rsvp",
      "envio",
    ];

    return row.reduce((score, cell) => {
      const normalized = normalizarTextoBusca(cell);

      if (!normalized) return score;

      const exactMatch = termosCabecalho.includes(normalized);
      const partialMatch = termosCabecalho.some((term) => normalized.includes(term));

      return score + (exactMatch ? 2 : partialMatch ? 1 : 0);
    }, 0);
  }

  function prepararMatrizPlanilha(matrix: string[][]) {
    const validRows = matrix
      .map((row) => row.map((value) => String(value ?? "").trim()))
      .filter((row) => row.some((value) => value));

    if (validRows.length === 0) {
      return { headers: [] as string[], rows: [] as string[][] };
    }

    let headerIndex = 0;
    let bestScore = -1;

    validRows.slice(0, 12).forEach((row, index) => {
      const score = linhaPareceCabecalho(row);

      if (score > bestScore) {
        bestScore = score;
        headerIndex = index;
      }
    });

    const rawHeaders = validRows[headerIndex];
    const headers = rawHeaders.map((header, index) =>
      header && header.trim() ? header.trim() : `Coluna ${index + 1}`
    );

    const rows = validRows
      .slice(headerIndex + 1)
      .filter((row) => row.some((value) => value));

    return { headers, rows };
  }

  function parseCsvText(csvText: string) {
    const matrix = csvText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseCsvLine);

    return prepararMatrizPlanilha(matrix);
  }

  async function handleSpreadsheetUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
    const isPdf = lowerName.endsWith(".pdf");

    if (isPdf) {
      alert(
        "PDF não é recomendado para importação direta porque pode embaralhar colunas, nomes e telefones. Converta o PDF para Excel/CSV e importe o arquivo convertido."
      );
      if (spreadsheetInputRef.current) spreadsheetInputRef.current.value = "";
      return;
    }

    if (!isCsv && !isExcel) {
      alert("Envie uma planilha .xlsx, .xls ou .csv.");
      return;
    }

    setLoading(true);

    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (isCsv) {
        const content = await file.text();
        const parsed = parseCsvText(content);
        headers = parsed.headers;
        rows = parsed.rows;
      } else {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          alert("Nenhuma aba encontrada na planilha.");
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          header: 1,
          defval: "",
          raw: false,
        });

        const parsed = prepararMatrizPlanilha(matrix);

        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          alert("Nenhuma linha de convidados encontrada na planilha.");
          return;
        }

        headers = parsed.headers;
        rows = parsed.rows;
      }

      if (headers.length === 0 || rows.length === 0) {
        alert("A planilha precisa ter cabeçalho e pelo menos uma linha de convidados.");
        return;
      }

      setActiveMode("excel");
      setSheetUrl("");
      setSheetHeaders(headers);
      setSheetRows(rows);
      setTexto("");
      setVcfFileName(null);
      setVcfContacts([]);
      limparPreview();
      sugerirMapeamento(headers);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert(`${rows.length} linha(s) carregada(s) da planilha ${file.name}. Revise o mapeamento antes de gerar a prévia.`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao ler a planilha. Confira se o arquivo está em .xlsx, .xls ou .csv."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVcfUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const isVcf =
      file.name.toLowerCase().endsWith(".vcf") ||
      file.type === "text/vcard" ||
      file.type === "text/x-vcard" ||
      file.type === "text/plain";

    if (!isVcf) {
      alert("Envie um arquivo .vcf válido.");
      return;
    }

    try {
      const content = await file.text();
      const contacts = parseVCF(content);

      if (contacts.length === 0) {
        alert("Nenhum contato encontrado no arquivo .vcf.");
        return;
      }

      const textoVisual = contacts
        .map((contact, index) =>
          [
            index + 1,
            contact.grupo || "sem grupo",
            contact.nome,
            contact.telefone || "sem telefone",
            "",
            "",
            "",
            "pendente",
          ].join("    ")
        )
        .join("\n");

      setActiveMode("vcf");
      setVcfFileName(file.name);
      setVcfContacts(contacts);
      setTexto(textoVisual);
      setSheetHeaders([]);
      setSheetRows([]);
      setMapping(initialMapping);
      limparPreview();

      alert(`${contacts.length} contato(s) carregado(s) do arquivo .vcf.`);
    } catch {
      alert("Erro ao ler o arquivo .vcf.");
    }
  }

  function updateMapping(field: keyof SheetMapping, value: string) {
    setMapping((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function getColumnValue(row: string[], headerName: string) {
    if (!headerName) return "";

    const index = sheetHeaders.indexOf(headerName);

    if (index < 0) return "";

    return row[index] || "";
  }

  function normalizarCriancaPorMae(crianca: string, mae: string) {
    const maeLimpa = String(mae || "").trim();

    if (maeLimpa) {
      return "sim";
    }

    return String(crianca || "").trim();
  }

  function montarTextoMapeado(updateState = true) {
    const textoMapeado = sheetRows
      .map((row) => {
        const legacyId = getColumnValue(row, mapping.legacy_id);
        const grupo = getColumnValue(row, mapping.grupo);
        const nome = getColumnValue(row, mapping.nome);
        const telefone = getColumnValue(row, mapping.telefone);
        const email = getColumnValue(row, mapping.email);
        const mae = getColumnValue(row, mapping.mae);
        const crianca = normalizarCriancaPorMae(getColumnValue(row, mapping.crianca), mae);
        const idadeCrianca = getColumnValue(row, mapping.idade_crianca);
        const tipoContato = getColumnValue(row, mapping.tipo_contato);
        const responsavelNome = getColumnValue(row, mapping.responsavel_nome);
        const responsavelTelefone = getColumnValue(row, mapping.responsavel_telefone);
        const tipoNucleo = getColumnValue(row, mapping.tipo_nucleo);
        const nucleo = getColumnValue(row, mapping.nucleo);
        const relacaoNucleo = getColumnValue(row, mapping.relacao_nucleo);
        const relacaoResponsavelNucleo = getColumnValue(row, mapping.relacao_responsavel_nucleo);
        const relacaoEvento = getColumnValue(row, mapping.relacao_evento);
        const recebeComunicacao = getColumnValue(row, mapping.recebe_comunicacao);
        const principalEnvio = getColumnValue(row, mapping.principal_envio);
        const statusRsvp = getColumnValue(row, mapping.status_rsvp);
        const dataHoraRsvp = getColumnValue(row, mapping.data_hora_rsvp);
        const statusEnvio = getColumnValue(row, mapping.status_envio);
        const dataHoraEnvio = getColumnValue(row, mapping.data_hora_envio);

        return [
          legacyId,
          grupo,
          nome,
          telefone,
          email,
          crianca,
          mae,
          idadeCrianca,
          tipoContato,
          responsavelNome,
          responsavelTelefone,
          tipoNucleo,
          nucleo,
          relacaoNucleo,
          relacaoResponsavelNucleo,
          relacaoEvento,
          recebeComunicacao,
          principalEnvio,
          statusRsvp,
          dataHoraRsvp,
          statusEnvio,
          dataHoraEnvio,
        ].join("    ");
      })
      .filter((line) => line.trim())
      .join("\n");

    if (updateState) {
      setTexto(textoMapeado);
      limparPreview();
    }

    return textoMapeado;
  }

  function montarMappedRows(): MappedRow[] {
    return sheetRows
      .map((row) => ({
        legacy_id: getColumnValue(row, mapping.legacy_id),
        grupo: getColumnValue(row, mapping.grupo),
        nome: getColumnValue(row, mapping.nome),
        telefone: getColumnValue(row, mapping.telefone),
        email: getColumnValue(row, mapping.email),
        crianca: normalizarCriancaPorMae(
          getColumnValue(row, mapping.crianca),
          getColumnValue(row, mapping.mae)
        ),
        mae: getColumnValue(row, mapping.mae),
        idade_crianca: getColumnValue(row, mapping.idade_crianca),
        tipo_contato: getColumnValue(row, mapping.tipo_contato),
        responsavel_nome: getColumnValue(row, mapping.responsavel_nome),
        responsavel_telefone: getColumnValue(row, mapping.responsavel_telefone),
        tipo_nucleo: getColumnValue(row, mapping.tipo_nucleo),
        nucleo: getColumnValue(row, mapping.nucleo),
        relacao_nucleo: getColumnValue(row, mapping.relacao_nucleo),
        relacao_responsavel_nucleo: getColumnValue(row, mapping.relacao_responsavel_nucleo),
        relacao_evento: getColumnValue(row, mapping.relacao_evento),
        recebe_comunicacao: getColumnValue(row, mapping.recebe_comunicacao),
        principal_envio: getColumnValue(row, mapping.principal_envio),
        status_rsvp: getColumnValue(row, mapping.status_rsvp),
        status_envio: getColumnValue(row, mapping.status_envio),
        data_hora_rsvp: getColumnValue(row, mapping.data_hora_rsvp),
        data_hora_envio: getColumnValue(row, mapping.data_hora_envio),
      }))
      .filter((row) => row.nome && row.nome.trim().length > 0);
  }

  function montarMappedRowsVcf(): MappedRow[] {
    return vcfContacts
      .map((contact) => ({
        legacy_id: "",
        grupo: contact.grupo || "",
        nome: contact.nome,
        telefone: contact.telefone || "",
        email: "",
        crianca: "",
        mae: "",
        idade_crianca: "",
        tipo_contato: "adulto",
        responsavel_nome: "",
        responsavel_telefone: "",
        tipo_nucleo: "",
        nucleo: contact.grupo || "",
        relacao_nucleo: "",
        relacao_responsavel_nucleo: "",
        relacao_evento: "",
        recebe_comunicacao: "",
        principal_envio: "",
        status_rsvp: "pendente",
        status_envio: "",
        data_hora_rsvp: "",
        data_hora_envio: "",
      }))
      .filter((row) => row.nome && row.nome.trim().length > 0);
  }

  function aplicarMapeamento() {
    if (!mapping.nome) {
      alert("Mapeie pelo menos a coluna Nome.");
      return;
    }

    montarTextoMapeado(true);
    alert("Mapeamento aplicado. Agora clique em Gerar prévia.");
  }

  function sugerirMapeamento(headers: string[]) {
    function findHeader(terms: string[]) {
      const normalizedTerms = terms.map(normalizarTextoBusca);

      const exact = headers.find((header) =>
        normalizedTerms.some((term) => normalizarTextoBusca(header) === term)
      );

      if (exact) return exact;

      return (
        headers.find((header) => {
          const normalized = normalizarTextoBusca(header);
          return normalizedTerms.some((term) => normalized.includes(term));
        }) || ""
      );
    }

    setMapping({
      legacy_id: findHeader(["legacy_id", "id legado", "codigo", "código", "cod", "cód"]),
      grupo: findHeader(["grupo", "familia", "família"]),
      nome: findHeader(["nome", "convidado"]),
      telefone: findHeader(["telefone", "whatsapp", "celular"]),
      email: findHeader(["email", "e-mail", "mail"]),
      crianca: findHeader(["crianca", "criança"]),
      mae: findHeader(["mae", "mãe", "mae/responsavel", "mãe/responsável"]),
      idade_crianca: findHeader(["idade_crianca", "idade criança", "idade crianca", "idade"]),
      tipo_contato: findHeader(["tipo_contato", "tipo contato", "perfil contato", "perfil do contato"]),
      responsavel_nome: findHeader(["responsavel_nome", "nome responsavel", "nome responsável", "responsavel", "responsável"]),
      responsavel_telefone: findHeader(["responsavel_telefone", "telefone responsavel", "telefone responsável", "telefone do responsavel", "telefone do responsável"]),
      tipo_nucleo: findHeader(["tipo_nucleo", "tipo de nucleo", "tipo de núcleo"]),
      nucleo: findHeader(["nucleo", "núcleo", "nome nucleo", "nome núcleo"]),
      relacao_nucleo: findHeader(["relacao_nucleo", "relação nucleo", "relação núcleo", "relacao com o nucleo", "relação com o núcleo"]),
      relacao_responsavel_nucleo: findHeader(["relacao_responsavel_nucleo", "relação responsavel núcleo", "relação responsável núcleo", "relacao do responsavel com o nucleo", "relação do responsável com o núcleo"]),
      relacao_evento: findHeader(["relacao_evento", "relação evento", "relacao com o evento", "relação com o evento"]),
      recebe_comunicacao: findHeader(["recebe_comunicacao", "recebe comunicação", "recebe comunicacao", "recebe convite"]),
      principal_envio: findHeader(["principal_envio", "principal envio", "contato principal"]),
      status_rsvp: findHeader(["status_rsvp", "rsvp", "confirma"]),
      status_envio: findHeader(["status_envio", "envio", "enviado", "status"]),
      data_hora_rsvp: findHeader(["data_resposta", "resposta"]),
      data_hora_envio: findHeader(["data_hora_envio", "dia", "horário", "horario", "hora"]),
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selecionarTodos() {
    setSelectedIds(preview.map((item) => item.id));
  }

  function selecionarValidos() {
    setSelectedIds(preview.filter((item) => !item.is_duplicate).map((item) => item.id));
  }

  function limparSelecao() {
    setSelectedIds([]);
  }

  function removerDuplicados() {
    setSelectedIds((prev) =>
      prev.filter((id) => !preview.find((item) => item.id === id)?.is_duplicate)
    );
  }

  async function carregarGoogleSheets() {
    if (!sheetUrl.trim()) {
      alert("Cole o link CSV do Google Sheets.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-from-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizarGoogleSheetsUrl(sheetUrl.trim()),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao carregar planilha.");
      }

      const headers = result.headers || [];
      const rows = result.rows || [];

      setActiveMode("sheets");
      setSheetHeaders(headers);
      setSheetRows(rows);
      setTexto("");
      setVcfFileName(null);
      setVcfContacts([]);
      limparPreview();
      sugerirMapeamento(headers);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert(`${result.total || 0} linhas carregadas. Revise o mapeamento antes de gerar a prévia.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao carregar planilha.");
    } finally {
      setLoading(false);
    }
  }

  async function gerarPreview() {
    if (!tenantId || !eventoId) {
      alert("Selecione um evento.");
      return;
    }

    if (hasSheetLoaded && !mapping.nome) {
      alert("Mapeie a coluna Nome antes de gerar a prévia.");
      return;
    }

    if (activeMode === "vcf" && vcfContacts.length === 0) {
      alert("Envie um arquivo .vcf antes de gerar a prévia.");
      return;
    }

    if (!hasSheetLoaded && activeMode !== "vcf" && !texto.trim()) {
      alert("Cole os convidados da planilha antiga, carregue uma planilha ou envie um arquivo .vcf.");
      return;
    }

    const payload: {
      action: string;
      tenantId: string;
      eventoId: string;
      mappedRows?: MappedRow[];
      text?: string;
    } = {
      action: "preview",
      tenantId,
      eventoId,
    };

    if (hasSheetLoaded) {
      const mappedRows = montarMappedRows();

      if (mappedRows.length === 0) {
        alert("Nenhuma linha válida encontrada no mapeamento.");
        return;
      }

      payload.mappedRows = mappedRows;
      setTexto(montarTextoMapeado(false));
    } else if (activeMode === "vcf") {
      const mappedRows = montarMappedRowsVcf();

      if (mappedRows.length === 0) {
        alert("Nenhum contato válido encontrado no arquivo .vcf.");
        return;
      }

      payload.mappedRows = mappedRows;
    } else {
      payload.text = texto;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar prévia.");
      }

      const previewData = (result.preview || []) as PreviewRow[];

      setBatchId(result.batchId);
      setPreview(previewData);
      setRowDecisions({});
      setSelectedIds(previewData.filter((item) => !item.is_duplicate).map((item) => item.id));

      await carregarHistorico(tenantId, eventoId);

      alert(`${result.total} registros interpretados.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao gerar prévia.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmarImportacao() {
    if (!tenantId || !eventoId || !batchId) {
      alert("Gere uma prévia antes de confirmar.");
      return;
    }

    if (selectedIds.length === 0) {
      alert("Selecione pelo menos um convidado para importar.");
      return;
    }

    const confirmacao = confirm(
      `Confirmar importação de ${selectedIds.length} convidado(s)? As decisões manuais da prévia serão enviadas junto com o lote.`
    );

    if (!confirmacao) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          tenantId,
          eventoId,
          batchId,
          selectedIds,
          rowDecisions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao confirmar importação.");
      }

      alert(`${result.imported} convidados importados com sucesso.`);

      setTexto("");
      setPreview([]);
      setSelectedIds([]);
      setBatchId(null);
      setVcfFileName(null);
      setVcfContacts([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await carregarHistorico(tenantId, eventoId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao confirmar importação.");
    } finally {
      setLoading(false);
    }
  }

  async function atualizarConvidadosExistentes() {
    if (!tenantId || !eventoId || !batchId) {
      alert("Gere uma prévia antes de atualizar convidados existentes.");
      return;
    }

    const duplicadosParaAtualizar = preview.filter((item) => item.is_duplicate).length;

    if (duplicadosParaAtualizar === 0) {
      alert("Nenhum convidado duplicado encontrado na prévia para atualizar.");
      return;
    }

    const confirmar = confirm(
      `Atualizar ${duplicadosParaAtualizar} convidado(s) já cadastrado(s) com os dados mais recentes da planilha? Token, QR, check-in e histórico de envio serão preservados.`
    );

    if (!confirmar) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_existing",
          tenantId,
          eventoId,
          batchId,
          rowDecisions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar convidados existentes.");
      }

      alert(`${result.updated || 0} convidado(s) existente(s) atualizado(s) com sucesso.`);

      await carregarHistorico(tenantId, eventoId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atualizar convidados existentes.");
    } finally {
      setLoading(false);
    }
  }

  async function reverterImportacao(batchIdParaReverter: string) {
    if (!tenantId || !eventoId) return;

    const confirmar = confirm(
      "Deseja reverter esta importação? Os convidados deste lote serão removidos."
    );

    if (!confirmar) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/revert-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          eventoId,
          batchId: batchIdParaReverter,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao reverter importação.");
      }

      alert(`${result.removidos} convidados removidos.`);
      await carregarHistorico(tenantId, eventoId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao reverter importação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const totalDuplicados = preview.filter((item) => item.is_duplicate).length;
  const totalConflitos = preview.filter((item) => getPreviewStatus(item) === "conflito").length;
  const totalDivergencias = preview.filter((item) => getPreviewStatus(item) === "divergencia").length;
  const totalComplementos = preview.filter((item) => getPreviewStatus(item) === "complemento").length;
  const totalValidos = preview.length - totalDuplicados;
  const totalSelecionados = selectedIds.length;
  const contatosComTelefone = vcfContacts.filter((item) => item.telefone).length;
  const contatosSemTelefone = vcfContacts.length - contatosComTelefone;

  return (
    <main style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <div style={eyebrowStyle}>Admin OmniStage</div>
          <h1 style={titleStyle}>Importação de convidados</h1>
          <p style={subtitleStyle}>
            Importe convidados por Excel, CSV, Google Sheets, texto colado ou contatos do celular em .vcf.
          </p>
        </div>

        <div style={statusPillStyle}>
          {tenants.length} cliente(s) · {eventos.length} evento(s)
        </div>
      </div>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <span style={stepStyle}>01</span>
            <h2 style={sectionTitleStyle}>Selecione o evento</h2>
          </div>
        </div>

        <div style={selectionGridStyle}>
          <label style={fieldStyle}>
            <span>Cliente / Empresa</span>
            <select
              value={tenantId || ""}
              onChange={async (event) => {
                const novoTenantId = event.target.value;
                setTenantId(novoTenantId);
                setEventoId("");
                limparPreview();

                if (novoTenantId) {
                  await carregarEventosDoTenant(novoTenantId, true);
                } else {
                  setEventos([]);
                  setHistory([]);
                }
              }}
              style={inputStyle}
            >
              <option value="">Selecione um cliente</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.nome || tenant.responsavel_nome || tenant.id}
                </option>
              ))}
            </select>
          </label>

          <label style={fieldStyle}>
            <span>Evento</span>
            <select
              value={eventoId}
              onChange={async (event) => {
                const novoEventoId = event.target.value;
                setEventoId(novoEventoId);
                limparPreview();

                if (tenantId && novoEventoId) {
                  await carregarHistorico(tenantId, novoEventoId);
                }
              }}
              style={inputStyle}
              disabled={!tenantId}
            >
              <option value="">Selecione um evento</option>
              {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <span style={stepStyle}>02</span>
            <h2 style={sectionTitleStyle}>Escolha a forma de importação</h2>
          </div>

          <span style={modeBadgeStyle}>
            Modo atual:{" "}
            {activeMode === "vcf"
              ? "Contatos .vcf"
              : activeMode === "sheets"
              ? "Google Sheets"
              : activeMode === "excel"
              ? "Excel / CSV"
              : "Texto livre"}
          </span>
        </div>

        <div style={methodGridStyle}>
          <article style={methodCardStyle}>
            <div style={methodIconStyle}>📊</div>
            <strong>Excel / CSV</strong>
            <p style={methodTextStyle}>
              Importe arquivos .xlsx, .xls ou .csv enviados pelo cliente.
            </p>
          </article>

          <article style={methodCardStyle}>
            <div style={methodIconStyle}>📄</div>
            <strong>Google Sheets CSV</strong>
            <p style={methodTextStyle}>
              Use uma planilha publicada em CSV com mapeamento manual de colunas.
            </p>
          </article>

          <article style={methodCardStyle}>
            <div style={methodIconStyle}>✍️</div>
            <strong>Texto colado</strong>
            <p style={methodTextStyle}>
              Cole uma lista antiga, dados de planilha ou texto recebido por WhatsApp.
            </p>
          </article>

          <article style={methodCardStyle}>
            <div style={methodIconStyle}>📱</div>
            <strong>Contatos do celular (.vcf)</strong>
            <p style={methodTextStyle}>
              Importe contatos exportados do celular ou compartilhados pelo WhatsApp.
            </p>
          </article>
        </div>

        <div style={vcfBoxStyle}>
          <div>
            <strong style={{ fontSize: 18, color: "#0f172a" }}>Importar Excel / CSV</strong>
            <p style={{ color: "#64748b", margin: "6px 0 0" }}>
              Aceita .xlsx, .xls e .csv. PDF deve ser convertido para Excel/CSV antes da importação.
            </p>
          </div>

          <label style={uploadButtonStyle}>
            Escolher planilha
            <input
              ref={spreadsheetInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/pdf"
              onChange={handleSpreadsheetUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div style={blockStyle}>
          <label style={fieldStyle}>
            <span>Link Google Sheets CSV</span>
            <input
              value={sheetUrl}
              onChange={(event) => setSheetUrl(event.target.value)}
              placeholder="Cole o link publicado do Google Sheets"
              style={inputStyle}
            />
          </label>

          <div style={actionsStyle}>
            <button
              onClick={carregarGoogleSheets}
              disabled={loading}
              style={secondaryButtonStyle}
            >
              {loading ? "Carregando..." : "Carregar planilha"}
            </button>

            {hasSheetLoaded && (
              <button
                onClick={limparPlanilhaCarregada}
                disabled={loading}
                style={ghostButtonStyle}
              >
                Limpar planilha
              </button>
            )}
          </div>
        </div>

        <div style={vcfBoxStyle}>
          <div>
            <strong style={{ fontSize: 18, color: "#0f172a" }}>Importar contatos .vcf</strong>
            <p style={{ color: "#64748b", margin: "6px 0 0" }}>
              Ideal para o cliente exportar contatos do celular e enviar em arquivo.
            </p>
          </div>

          <label style={uploadButtonStyle}>
            Escolher arquivo .vcf
            <input
              ref={fileInputRef}
              type="file"
              accept=".vcf,text/vcard,text/x-vcard,text/plain"
              onChange={handleVcfUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {vcfContacts.length > 0 && (
          <div style={vcfSummaryStyle}>
            <div>
              <strong>{vcfFileName || "Arquivo .vcf carregado"}</strong>
              <p style={{ color: "#64748b", margin: "6px 0 0" }}>
                {vcfContacts.length} contato(s) encontrados · {contatosComTelefone} com telefone ·{" "}
                {contatosSemTelefone} sem telefone
              </p>
            </div>

            <button onClick={limparVcf} disabled={loading} style={cleanGhostButtonStyle}>
              Remover VCF
            </button>
          </div>
        )}

        {hasSheetLoaded && (
          <section style={mappingBoxStyle}>
            <div style={headerStyle}>
              <h2 style={{ margin: 0, color: "#0f172a" }}>Mapeamento de colunas</h2>
              <span style={{ color: "#64748b", fontWeight: 800 }}>
                {sheetRows.length} linhas · {sheetHeaders.length} colunas
              </span>
            </div>

            <div style={mappingGridStyle}>
              <MappingSelect label="legacy_id" value={mapping.legacy_id} headers={sheetHeaders} onChange={(value) => updateMapping("legacy_id", value)} />
              <MappingSelect label="grupo legado" value={mapping.grupo} headers={sheetHeaders} onChange={(value) => updateMapping("grupo", value)} />
              <MappingSelect label="nome" value={mapping.nome} headers={sheetHeaders} onChange={(value) => updateMapping("nome", value)} />
              <MappingSelect label="telefone" value={mapping.telefone} headers={sheetHeaders} onChange={(value) => updateMapping("telefone", value)} />
              <MappingSelect label="email" value={mapping.email} headers={sheetHeaders} onChange={(value) => updateMapping("email", value)} />
              <MappingSelect label="crianca" value={mapping.crianca} headers={sheetHeaders} onChange={(value) => updateMapping("crianca", value)} />
              <MappingSelect label="mae legado" value={mapping.mae} headers={sheetHeaders} onChange={(value) => updateMapping("mae", value)} />
              <MappingSelect label="idade_crianca" value={mapping.idade_crianca} headers={sheetHeaders} onChange={(value) => updateMapping("idade_crianca", value)} />
              <MappingSelect label="tipo_contato" value={mapping.tipo_contato} headers={sheetHeaders} onChange={(value) => updateMapping("tipo_contato", value)} />
              <MappingSelect label="responsavel_nome" value={mapping.responsavel_nome} headers={sheetHeaders} onChange={(value) => updateMapping("responsavel_nome", value)} />
              <MappingSelect label="responsavel_telefone" value={mapping.responsavel_telefone} headers={sheetHeaders} onChange={(value) => updateMapping("responsavel_telefone", value)} />
              <MappingSelect label="tipo_nucleo" value={mapping.tipo_nucleo} headers={sheetHeaders} onChange={(value) => updateMapping("tipo_nucleo", value)} />
              <MappingSelect label="nucleo" value={mapping.nucleo} headers={sheetHeaders} onChange={(value) => updateMapping("nucleo", value)} />
              <MappingSelect label="relacao_nucleo" value={mapping.relacao_nucleo} headers={sheetHeaders} onChange={(value) => updateMapping("relacao_nucleo", value)} />
              <MappingSelect label="relacao_responsavel_nucleo" value={mapping.relacao_responsavel_nucleo} headers={sheetHeaders} onChange={(value) => updateMapping("relacao_responsavel_nucleo", value)} />
              <MappingSelect label="relacao_evento" value={mapping.relacao_evento} headers={sheetHeaders} onChange={(value) => updateMapping("relacao_evento", value)} />
              <MappingSelect label="recebe_comunicacao" value={mapping.recebe_comunicacao} headers={sheetHeaders} onChange={(value) => updateMapping("recebe_comunicacao", value)} />
              <MappingSelect label="principal_envio" value={mapping.principal_envio} headers={sheetHeaders} onChange={(value) => updateMapping("principal_envio", value)} />
              <MappingSelect label="status_rsvp" value={mapping.status_rsvp} headers={sheetHeaders} onChange={(value) => updateMapping("status_rsvp", value)} />
              <MappingSelect label="status_envio" value={mapping.status_envio} headers={sheetHeaders} onChange={(value) => updateMapping("status_envio", value)} />
              <MappingSelect label="data_hora_rsvp" value={mapping.data_hora_rsvp} headers={sheetHeaders} onChange={(value) => updateMapping("data_hora_rsvp", value)} />
              <MappingSelect label="data_hora_envio" value={mapping.data_hora_envio} headers={sheetHeaders} onChange={(value) => updateMapping("data_hora_envio", value)} />
            </div>

            <div style={actionsStyle}>
              <button onClick={aplicarMapeamento} disabled={loading} style={goldButtonStyle}>
                Aplicar mapeamento
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <strong style={{ color: "#334155" }}>Prévia do texto gerado</strong>
              <pre style={preStyle}>
                {mappedTextPreview.split("\n").slice(0, 5).join("\n") ||
                  "Mapeie as colunas para visualizar o texto final."}
              </pre>
            </div>
          </section>
        )}

        <div style={blockStyle}>
          <label style={fieldStyle}>
            <span>
              {activeMode === "vcf"
                ? "Prévia visual do arquivo .vcf"
                : "Colar dados ou revisar texto convertido"}
            </span>
            <textarea
              value={texto}
              onChange={(event) => {
                setTexto(event.target.value);
                setActiveMode("texto");
                setVcfContacts([]);
                setVcfFileName(null);
                limparPreview();

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              placeholder={`3    FAMILIA_ANDREZZA    ANDREZZA FERRAZ    5522999787402    sim    URSULA    7    confirmado    02/05/2026    enviado    02/05/2026 18:40`}
              style={{
                ...inputStyle,
                minHeight: 220,
                resize: "vertical",
                lineHeight: 1.55,
              }}
            />
          </label>
        </div>

        <div style={actionsStyle}>
          <button onClick={gerarPreview} disabled={loading} style={buttonStyle}>
            {loading ? "Processando..." : "Gerar prévia"}
          </button>

          {preview.length > 0 && (
            <>
              <button
                onClick={confirmarImportacao}
                disabled={loading || totalSelecionados === 0}
                style={goldButtonStyle}
              >
                Importar selecionados ({totalSelecionados})
              </button>

              {totalDuplicados > 0 && (
                <button
                  onClick={atualizarConvidadosExistentes}
                  disabled={loading || !batchId}
                  style={blueButtonStyle}
                >
                  Atualizar existentes ({totalDuplicados})
                </button>
              )}

              <button
                onClick={cancelarPrevia}
                disabled={loading}
                style={ghostButtonStyle}
              >
                Cancelar prévia
              </button>
            </>
          )}
        </div>
      </section>

      {preview.length > 0 && (
        <section style={sectionStyle}>
          <div style={headerStyle}>
            <div>
              <span style={stepStyle}>03</span>
              <h2 style={sectionTitleStyle}>Prévia da importação</h2>
            </div>

            <span style={{ color: "#64748b", fontWeight: 800 }}>
              {totalSelecionados} selecionados · {totalValidos} válidos ·{" "}
              {totalDuplicados} duplicados · {totalComplementos} atualizações ·{" "}
              {totalDivergencias} divergências · {totalConflitos} conflitos
            </span>
          </div>

          <div style={selectionActionsStyle}>
            <button onClick={selecionarTodos} disabled={loading} style={smallButtonStyle}>
              Selecionar todos
            </button>

            <button onClick={selecionarValidos} disabled={loading} style={smallButtonStyle}>
              Selecionar válidos
            </button>

            <button onClick={removerDuplicados} disabled={loading} style={smallButtonStyle}>
              Remover duplicados
            </button>

            <button onClick={limparSelecao} disabled={loading} style={smallButtonStyle}>
              Limpar seleção
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {preview.map((item) => {
              const checked = selectedIds.includes(item.id);
              const rawData = item.raw_data || {};
              const crmExists = Boolean(rawData.crm_exists);
              const eventExists = Boolean(rawData.event_exists || item.is_duplicate);
              const crmStatusLabel = crmExists ? "CRM: já existe" : "CRM: novo contato";
              const eventStatusLabel = eventExists ? "Evento: já existe" : "Evento: novo convidado";
              const matchLabel = rawData.matched_by ? `Busca: ${rawData.matched_by}` : null;
              const fieldComparisons = montarComparacoesCampos(item);
              const previewStatus = getPreviewStatus(item);
              const rowDecision = rowDecisions[item.id];
              const hasManualDecision = Boolean(rowDecision);

              return (
                <article
                  key={item.id}
                  style={{
                    ...cardStyle,
                    border: item.is_duplicate
                      ? "1px solid rgba(239,68,68,0.45)"
                      : checked
                      ? "1px solid rgba(250,204,21,0.7)"
                      : "1px solid #e2e8f0",
                    background: item.is_duplicate
                      ? "#fef2f2"
                      : checked
                      ? "#fefce8"
                      : "#ffffff",
                  }}
                >
                  <div style={cardLeftStyle}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={rowDecision === "rejeitar" || rowDecision === "manter"}
                      onChange={() => toggleSelect(item.id)}
                      style={checkboxStyle}
                    />

                    <div>
                      <strong style={{ fontSize: 20, color: "#0f172a" }}>{item.nome}</strong>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <span
                          style={{
                            ...badgeStyle,
                            background: crmExists ? "#eef2ff" : "#dcfce7",
                            color: crmExists ? "#3730a3" : "#166534",
                          }}
                        >
                          {crmStatusLabel}
                        </span>

                        <span
                          style={{
                            ...badgeStyle,
                            background: eventExists ? "#fee2e2" : "#dcfce7",
                            color: eventExists ? "#991b1b" : "#166534",
                          }}
                        >
                          {eventStatusLabel}
                        </span>

                        {matchLabel && (
                          <span
                            style={{
                              ...badgeStyle,
                              background: "#f8fafc",
                              color: "#475569",
                            }}
                          >
                            {matchLabel}
                          </span>
                        )}
                      </div>

                      {previewStatus !== "novo" && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          <span
                            style={{
                              ...badgeStyle,
                              background:
                                previewStatus === "conflito"
                                  ? "#fee2e2"
                                  : previewStatus === "divergencia"
                                  ? "#fef3c7"
                                  : previewStatus === "complemento"
                                  ? "#dcfce7"
                                  : "#e0f2fe",
                              color:
                                previewStatus === "conflito"
                                  ? "#991b1b"
                                  : previewStatus === "divergencia"
                                  ? "#854d0e"
                                  : previewStatus === "complemento"
                                  ? "#166534"
                                  : "#075985",
                            }}
                          >
                            {previewStatus === "conflito"
                              ? "Conflito: revisar antes de importar"
                              : previewStatus === "divergencia"
                              ? "Divergência: escolha manter ou atualizar"
                              : previewStatus === "complemento"
                              ? "Atualização possível: completar dados vazios"
                              : "Registro existente"}
                          </span>

                          {hasManualDecision && (
                            <span
                              style={{
                                ...badgeStyle,
                                background: "#ede9fe",
                                color: "#5b21b6",
                              }}
                            >
                              Decisão: {rowDecision === "manter"
                                ? "manter atual"
                                : rowDecision === "atualizar"
                                ? "atualizar"
                                : rowDecision === "criar_novo"
                                ? "criar novo"
                                : "rejeitar"}
                            </span>
                          )}
                        </div>
                      )}

                      <p style={{ color: "#64748b", margin: "6px 0 0" }}>
                        Legacy ID: {item.legacy_id || "sem ID"} · Telefone:{" "}
                        {item.telefone || "sem telefone"} · E-mail: {item.email || "sem e-mail"}
                      </p>

                      <p style={{ color: "#334155", margin: "6px 0 0" }}>
                        Tipo contato: {item.tipo_contato || (item.crianca === "sim" ? "crianca" : "adulto")} · Criança:{" "}
                        {item.crianca || "-"} · Idade criança: {item.idade_crianca || "-"}
                      </p>

                      <p style={{ color: "#334155", margin: "6px 0 0" }}>
                        Responsável: {item.responsavel_nome || item.mae || "-"} · Telefone responsável:{" "}
                        {item.responsavel_telefone || "-"}
                      </p>

                      {Array.isArray(item.raw_data?.nucleos) && item.raw_data.nucleos.length > 0 ? (
  <div style={{ color: "#334155", margin: "6px 0 0" }}>
    <strong>Núcleos vinculados:</strong>

    <div style={{ marginTop: 4 }}>
      {item.raw_data.nucleos.map((nucleo: any, index: number) => (
        <div key={index}>
          • {nucleo.nome || nucleo.nucleo || "-"} · {nucleo.tipo || nucleo.tipo_nucleo || "-"} ·{" "}
          {nucleo.relacao || nucleo.relacao_nucleo || "-"}
        </div>
      ))}
    </div>
  </div>
) : (
  <p style={{ color: "#334155", margin: "6px 0 0" }}>
    Núcleo: {item.nucleo || item.grupo || "sem núcleo"} · Tipo núcleo:{" "}
    {item.tipo_nucleo || "-"} · Relação: {item.relacao_nucleo || "-"}
  </p>
)}

                      <p style={{ color: "#334155", margin: "6px 0 0" }}>
                        Relação responsável: {item.relacao_responsavel_nucleo || "-"} · Relação evento:{" "}
                        {item.relacao_evento || "-"}
                      </p>

                      <p style={{ color: "#334155", margin: "6px 0 0" }}>
                        Recebe comunicação: {item.recebe_comunicacao ? "Sim" : "Não"} · Principal envio:{" "}
                        {item.principal_envio ? "Sim" : "Não"}
                      </p>

                      <p style={{ color: "#334155", margin: "6px 0 0" }}>
                        RSVP: {item.status_rsvp || "pendente"} · Envio:{" "}
                        {item.status_envio || "pendente"}
                      </p>

                      <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
                        Data/Hora RSVP: {item.data_hora_rsvp || "-"} · Data/Hora Envio:{" "}
                        {item.data_hora_envio || "-"}
                      </p>

                      {fieldComparisons.length > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            border: "1px solid #e2e8f0",
                            borderRadius: 14,
                            overflow: "hidden",
                            background: "#ffffff",
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 12px",
                              background: "#f8fafc",
                              color: "#0f172a",
                              fontWeight: 900,
                              fontSize: 13,
                            }}
                          >
                            Campos divergentes / atualização
                          </div>

                          <div style={{ display: "grid" }}>
                            {fieldComparisons.map((field) => (
                              <div
                                key={`${item.id}-${field.field}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "160px 1fr 1fr 120px",
                                  gap: 10,
                                  alignItems: "center",
                                  padding: "10px 12px",
                                  borderTop: "1px solid #e2e8f0",
                                  fontSize: 13,
                                }}
                              >
                                <strong style={{ color: "#334155" }}>{field.label}</strong>
                                <span style={{ color: "#64748b" }}>CRM: {field.crmValue}</span>
                                <span style={{ color: "#64748b" }}>Importação: {field.importValue}</span>
                                <span
                                  style={{
                                    ...badgeStyle,
                                    justifySelf: "start",
                                    background:
                                      field.severity === "conflito"
                                        ? "#fee2e2"
                                        : field.severity === "complemento"
                                        ? "#dcfce7"
                                        : "#fef3c7",
                                    color:
                                      field.severity === "conflito"
                                        ? "#991b1b"
                                        : field.severity === "complemento"
                                        ? "#166534"
                                        : "#854d0e",
                                  }}
                                >
                                  {field.severity === "conflito"
                                    ? "Conflito"
                                    : field.severity === "complemento"
                                    ? "Completar"
                                    : "Divergência"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(crmExists || eventExists || fieldComparisons.length > 0) && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => aplicarDecisaoLinha(item, "manter")}
                            disabled={loading}
                            style={smallButtonStyle}
                          >
                            Manter atual
                          </button>

                          <button
                            type="button"
                            onClick={() => aplicarDecisaoLinha(item, "atualizar")}
                            disabled={loading}
                            style={smallButtonStyle}
                          >
                            Atualizar com importação
                          </button>

                          <button
                            type="button"
                            onClick={() => aplicarDecisaoLinha(item, "rejeitar")}
                            disabled={loading}
                            style={smallButtonStyle}
                          >
                            Rejeitar linha
                          </button>

                          <button
                            type="button"
                            onClick={() => aplicarDecisaoLinha(item, "criar_novo")}
                            disabled={loading}
                            style={smallButtonStyle}
                          >
                            Criar novo contato/convidado
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      ...badgeStyle,
                      background: item.is_duplicate
                        ? "#fee2e2"
                        : checked
                        ? "#fef3c7"
                        : "#dcfce7",
                      color: item.is_duplicate
                        ? "#991b1b"
                        : checked
                        ? "#854d0e"
                        : "#166534",
                    }}
                  >
                    {rowDecision === "manter"
                      ? "Manter atual"
                      : rowDecision === "atualizar"
                      ? "Atualizar"
                      : rowDecision === "rejeitar"
                      ? "Rejeitado"
                      : rowDecision === "criar_novo"
                      ? "Criar novo"
                      : eventExists
                      ? "Já existe no evento"
                      : checked
                      ? "Selecionado"
                      : "OK"}
                  </span>
                </article>
              );
            })}
          </div>

          {batchId && (
            <p style={{ color: "#64748b", marginTop: 16, fontSize: 13 }}>
              Lote: {batchId}
            </p>
          )}
        </section>
      )}

      <section style={sectionStyle}>
        <div style={headerStyle}>
          <div>
            <span style={stepStyle}>04</span>
            <h2 style={sectionTitleStyle}>Histórico de importações</h2>
          </div>

          <span style={{ color: "#64748b", fontWeight: 800 }}>
            {history.length} lotes
          </span>
        </div>

        {history.length === 0 && (
          <div style={{ color: "#64748b" }}>
            Nenhuma importação registrada para este evento.
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {history.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div>
                <strong style={{ color: "#0f172a" }}>
                  Lote {item.id.slice(0, 8)} · {item.status || "preview"}
                </strong>

                <p style={{ color: "#64748b", margin: "6px 0 0" }}>
                  Total: {item.total_rows || 0} · Importados:{" "}
                  {item.imported_rows || 0} · Duplicados:{" "}
                  {item.duplicated_rows || 0} · Revertidos:{" "}
                  {item.reverted_rows || 0}
                </p>

                <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
                  Criado em: {item.created_at || "-"}
                </p>
              </div>

              {item.status === "imported" && (
                <button
                  onClick={() => reverterImportacao(item.id)}
                  disabled={loading}
                  style={{
                    ...ghostButtonStyle,
                    borderColor: "#fecaca",
                    color: "#991b1b",
                  }}
                >
                  Reverter
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function MappingSelect({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
        Coluna da planilha
      </span>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={inputStyle}
        >
          <option value="">Selecionar coluna da planilha</option>
          {headers.map((header, index) => (
            <option key={`${header}-${index}`} value={header}>
              {header || `Coluna ${index + 1}`}
            </option>
          ))}
        </select>

        <span style={{ color: "#94a3b8", fontWeight: 900 }}>→</span>

        <strong style={{ color: "#0f172a", minWidth: 160 }}>{label}</strong>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  color: "#0f172a",
  maxWidth: 1280,
  margin: "0 auto",
  padding: "8px 0 48px",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 24,
  marginBottom: 26,
};

const eyebrowStyle: CSSProperties = {
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 8,
};

const titleStyle: CSSProperties = {
  fontSize: 46,
  lineHeight: 1.05,
  margin: 0,
  letterSpacing: "-0.04em",
  color: "#0f172a",
};

const subtitleStyle: CSSProperties = {
  color: "#64748b",
  marginTop: 10,
  fontSize: 17,
};

const statusPillStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const sectionStyle: CSSProperties = {
  marginTop: 22,
  padding: 24,
  borderRadius: 24,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const stepStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 24,
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 8,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const modeBadgeStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontWeight: 900,
  fontSize: 13,
};

const selectionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const methodGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 22,
};

const methodCardStyle: CSSProperties = {
  padding: 16,
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
};

const methodIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
  background: "#eef2ff",
  marginBottom: 12,
};

const methodTextStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.45,
  margin: "8px 0 0",
};

const blockStyle: CSSProperties = {
  marginTop: 18,
};

const mappingBoxStyle: CSSProperties = {
  marginTop: 22,
  padding: 18,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#334155",
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  background: "#ffffff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  outline: "none",
};

const vcfBoxStyle: CSSProperties = {
  marginTop: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  padding: 18,
  borderRadius: 18,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const vcfSummaryStyle: CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
};

const uploadButtonStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const cleanGhostButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const mappingGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 20,
};

const selectionActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 16,
};

const buttonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  background: "#16a34a",
  border: "none",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(22,163,74,0.22)",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const ghostButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
};

const goldButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  border: "1px solid #facc15",
  background: "#fefce8",
  color: "#854d0e",
  fontWeight: 900,
  cursor: "pointer",
};

const blueButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 900,
  cursor: "pointer",
};

const smallButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const cardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#0f172a",
};

const cardLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  minWidth: 0,
};

const checkboxStyle: CSSProperties = {
  width: 20,
  height: 20,
  marginTop: 4,
  cursor: "pointer",
};

const badgeStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const preStyle: CSSProperties = {
  marginTop: 8,
  padding: 12,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  fontSize: 12,
};
