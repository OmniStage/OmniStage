"use client";

import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
};

type PreviewRow = {
  id: string;
  legacy_id: string | null;
  nome: string;
  telefone: string | null;
  grupo: string | null;
  status_rsvp: string | null;
  status_envio: string | null;
  data_hora_rsvp: string | null;
  data_hora_envio: string | null;
  observacoes?: string | null;
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

const initialMapping: SheetMapping = {
  legacy_id: "",
  grupo: "",
  nome: "",
  telefone: "",
  status_rsvp: "",
  status_envio: "",
  data_hora_rsvp: "",
  data_hora_envio: "",
};

export default function AdminImportacaoPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [activeMode, setActiveMode] = useState<"texto" | "sheets" | "vcf">("texto");

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

  async function carregarDados() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member?.tenant_id) {
      alert("Usuário sem empresa vinculada.");
      return;
    }

    setTenantId(member.tenant_id);

    const { data: eventosData, error: eventosError } = await supabase
      .from("eventos")
      .select("id, nome")
      .eq("tenant_id", member.tenant_id)
      .order("created_at", { ascending: false });

    if (eventosError) {
      alert("Erro ao carregar eventos: " + eventosError.message);
      return;
    }

    setEventos((eventosData || []) as Evento[]);

    if (eventosData && eventosData.length > 0) {
      setEventoId(eventosData[0].id);
      await carregarHistorico(member.tenant_id, eventosData[0].id);
    }
  }

  function limparPreview() {
    setPreview([]);
    setSelectedIds([]);
    setBatchId(null);
  }

  function cancelarPrevia() {
    setTexto("");
    setVcfFileName(null);
    setVcfContacts([]);
    limparPreview();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function limparPlanilhaCarregada() {
    setSheetHeaders([]);
    setSheetRows([]);
    setMapping(initialMapping);
    setTexto("");
    setActiveMode("texto");
    limparPreview();
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

      const textoConvertido = contacts
        .map((contact) =>
          [
            "",
            contact.grupo || "",
            contact.nome,
            contact.telefone || "",
            "pendente",
            "",
            "",
            "",
          ].join("    ")
        )
        .join("\n");

      setActiveMode("vcf");
      setVcfFileName(file.name);
      setVcfContacts(contacts);
      setTexto(textoConvertido);
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

  function montarTextoMapeado(updateState = true) {
    const textoMapeado = sheetRows
      .map((row) => {
        const legacyId = getColumnValue(row, mapping.legacy_id);
        const grupo = getColumnValue(row, mapping.grupo);
        const nome = getColumnValue(row, mapping.nome);
        const telefone = getColumnValue(row, mapping.telefone);
        const statusRsvp = getColumnValue(row, mapping.status_rsvp);
        const dataHoraRsvp = getColumnValue(row, mapping.data_hora_rsvp);
        const statusEnvio = getColumnValue(row, mapping.status_envio);
        const dataHoraEnvio = getColumnValue(row, mapping.data_hora_envio);

        return [
          legacyId,
          grupo,
          nome,
          telefone,
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

  function montarMappedRows() {
    return sheetRows
      .map((row) => ({
        legacy_id: getColumnValue(row, mapping.legacy_id),
        grupo: getColumnValue(row, mapping.grupo),
        nome: getColumnValue(row, mapping.nome),
        telefone: getColumnValue(row, mapping.telefone),
        status_rsvp: getColumnValue(row, mapping.status_rsvp),
        status_envio: getColumnValue(row, mapping.status_envio),
        data_hora_rsvp: getColumnValue(row, mapping.data_hora_rsvp),
        data_hora_envio: getColumnValue(row, mapping.data_hora_envio),
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
      return (
        headers.find((header) => {
          const normalized = header.toLocaleLowerCase("pt-BR");
          return terms.some((term) => normalized.includes(term));
        }) || ""
      );
    }

    setMapping({
      legacy_id: findHeader(["id"]),
      grupo: findHeader(["grupo", "família", "familia"]),
      nome: findHeader(["nome", "convidado"]),
      telefone: findHeader(["telefone", "whatsapp", "celular"]),
      status_rsvp: findHeader(["status_rsvp", "rsvp", "confirma"]),
      status_envio: findHeader(["status", "envio", "enviado"]),
      data_hora_rsvp: findHeader(["data_resposta", "resposta"]),
      data_hora_envio: findHeader(["dia", "horário", "horario", "hora"]),
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

    if (!hasSheetLoaded && !texto.trim()) {
      alert("Cole os convidados da planilha antiga, carregue uma planilha ou envie um arquivo .vcf.");
      return;
    }

    const payload: {
      action: string;
      tenantId: string;
      eventoId: string;
      mappedRows?: ReturnType<typeof montarMappedRows>;
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
      `Confirmar importação de ${selectedIds.length} convidado(s)? Registros duplicados serão ignorados automaticamente.`
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
            Importe convidados por Google Sheets, texto colado ou contatos do celular em .vcf.
          </p>
        </div>

        <div style={statusPillStyle}>
          {eventos.length} evento(s) carregado(s)
        </div>
      </div>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <span style={stepStyle}>01</span>
            <h2 style={sectionTitleStyle}>Selecione o evento</h2>
          </div>
        </div>

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
          >
            <option value="">Selecione um evento</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.nome}
              </option>
            ))}
          </select>
        </label>
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
              : "Texto livre"}
          </span>
        </div>

        <div style={methodGridStyle}>
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

          <article style={{ ...methodCardStyle, ...highlightMethodStyle }}>
            <div style={methodIconStyle}>📱</div>
            <strong>Contatos do celular (.vcf)</strong>
            <p style={methodTextStyle}>
              Importe contatos exportados do celular ou compartilhados pelo WhatsApp.
            </p>
          </article>
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
            <strong style={{ fontSize: 18 }}>Importar contatos .vcf</strong>
            <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
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
              <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                {vcfContacts.length} contato(s) encontrados · {contatosComTelefone} com telefone ·{" "}
                {contatosSemTelefone} sem telefone
              </p>
            </div>

            <button onClick={limparVcf} disabled={loading} style={ghostButtonStyle}>
              Remover VCF
            </button>
          </div>
        )}

        {hasSheetLoaded && (
          <section style={mappingBoxStyle}>
            <div style={headerStyle}>
              <h2 style={{ margin: 0 }}>Mapeamento de colunas</h2>
              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                {sheetRows.length} linhas · {sheetHeaders.length} colunas
              </span>
            </div>

            <div style={mappingGridStyle}>
              <MappingSelect label="legacy_id" value={mapping.legacy_id} headers={sheetHeaders} onChange={(value) => updateMapping("legacy_id", value)} />
              <MappingSelect label="grupo" value={mapping.grupo} headers={sheetHeaders} onChange={(value) => updateMapping("grupo", value)} />
              <MappingSelect label="nome" value={mapping.nome} headers={sheetHeaders} onChange={(value) => updateMapping("nome", value)} />
              <MappingSelect label="telefone" value={mapping.telefone} headers={sheetHeaders} onChange={(value) => updateMapping("telefone", value)} />
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
              <strong style={{ color: "#cbd5e1" }}>Prévia do texto gerado</strong>
              <pre style={preStyle}>
                {mappedTextPreview.split("\n").slice(0, 5).join("\n") ||
                  "Mapeie as colunas para visualizar o texto final."}
              </pre>
            </div>
          </section>
        )}

        <div style={blockStyle}>
          <label style={fieldStyle}>
            <span>Colar dados ou revisar texto convertido</span>
            <textarea
              value={texto}
              onChange={(event) => {
                setTexto(event.target.value);
                setActiveMode("texto");
                limparPreview();
              }}
              placeholder={`3    FAMILIA_ANDREZZA    ANDREZZA FERRAZ    5522999787402    confirmado    02/05/2026    enviado    02/05/2026 18:40`}
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

            <span style={{ color: "#94a3b8", fontWeight: 800 }}>
              {totalSelecionados} selecionados · {totalValidos} válidos ·{" "}
              {totalDuplicados} duplicados
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

              return (
                <article
                  key={item.id}
                  style={{
                    ...cardStyle,
                    border: item.is_duplicate
                      ? "1px solid rgba(239,68,68,0.6)"
                      : checked
                      ? "1px solid rgba(250,204,21,0.6)"
                      : "1px solid rgba(148,163,184,0.22)",
                    background: item.is_duplicate
                      ? "rgba(127,29,29,0.22)"
                      : checked
                      ? "rgba(250,204,21,0.08)"
                      : "rgba(15,23,42,0.86)",
                  }}
                >
                  <div style={cardLeftStyle}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={item.is_duplicate}
                      onChange={() => toggleSelect(item.id)}
                      style={checkboxStyle}
                    />

                    <div>
                      <strong style={{ fontSize: 20 }}>{item.nome}</strong>

                      <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                        Legacy ID: {item.legacy_id || "sem ID"} · Grupo:{" "}
                        {item.grupo || "sem grupo"} · Telefone:{" "}
                        {item.telefone || "sem telefone"}
                      </p>

                      <p style={{ color: "#cbd5e1", margin: "6px 0 0" }}>
                        RSVP: {item.status_rsvp || "pendente"} · Envio:{" "}
                        {item.status_envio || "pendente"}
                      </p>

                      <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
                        Data/Hora RSVP: {item.data_hora_rsvp || "-"} · Data/Hora Envio:{" "}
                        {item.data_hora_envio || "-"}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      ...badgeStyle,
                      background: item.is_duplicate
                        ? "rgba(239,68,68,0.16)"
                        : checked
                        ? "rgba(250,204,21,0.16)"
                        : "rgba(34,197,94,0.14)",
                      color: item.is_duplicate
                        ? "#fca5a5"
                        : checked
                        ? "#fde68a"
                        : "#86efac",
                    }}
                  >
                    {item.is_duplicate ? "Duplicado" : checked ? "Selecionado" : "OK"}
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

          <span style={{ color: "#94a3b8", fontWeight: 800 }}>
            {history.length} lotes
          </span>
        </div>

        {history.length === 0 && (
          <div style={{ color: "#94a3b8" }}>
            Nenhuma importação registrada para este evento.
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {history.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div>
                <strong>
                  Lote {item.id.slice(0, 8)} · {item.status || "preview"}
                </strong>

                <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
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
                    borderColor: "rgba(239,68,68,0.55)",
                    color: "#fca5a5",
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
      <span style={{ color: "#94a3b8", fontSize: 13 }}>Coluna da planilha</span>

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

        <span style={{ color: "#64748b", fontWeight: 900 }}>→</span>

        <strong style={{ color: "#fff", minWidth: 160 }}>{label}</strong>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  color: "#fff",
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
  background: "rgba(15,23,42,0.06)",
  border: "1px solid rgba(15,23,42,0.08)",
  color: "#334155",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const sectionStyle: CSSProperties = {
  marginTop: 22,
  padding: 24,
  borderRadius: 24,
  border: "1px solid rgba(148,163,184,0.22)",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.98), rgba(15,23,42,0.98))",
  boxShadow: "0 24px 60px rgba(15,23,42,0.16)",
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
  background: "rgba(124,58,237,0.18)",
  color: "#c4b5fd",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 8,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  letterSpacing: "-0.02em",
};

const modeBadgeStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#cbd5e1",
  fontWeight: 900,
  fontSize: 13,
};

const methodGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 22,
};

const methodCardStyle: CSSProperties = {
  padding: 16,
  borderRadius: 18,
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const highlightMethodStyle: CSSProperties = {
  background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(124,58,237,0.08))",
  border: "1px solid rgba(34,197,94,0.34)",
};

const methodIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
  marginBottom: 12,
};

const methodTextStyle: CSSProperties = {
  color: "#94a3b8",
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
  border: "1px solid rgba(250,204,21,0.25)",
  background: "rgba(250,204,21,0.045)",
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#cbd5e1",
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  background: "rgba(2,6,23,0.86)",
  color: "#fff",
  border: "1px solid rgba(148,163,184,0.3)",
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
  background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(124,58,237,0.08))",
  border: "1px solid rgba(34,197,94,0.34)",
};

const vcfSummaryStyle: CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: 16,
  borderRadius: 16,
  background: "rgba(34,197,94,0.08)",
  border: "1px solid rgba(34,197,94,0.25)",
};

const uploadButtonStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 14,
  border: "1px solid rgba(34,197,94,0.42)",
  background: "rgba(34,197,94,0.14)",
  color: "#bbf7d0",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
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
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  border: "none",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(34,197,94,0.24)",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const ghostButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  background: "transparent",
  border: "1px solid rgba(148,163,184,0.25)",
  color: "#cbd5e1",
  fontWeight: 900,
  cursor: "pointer",
};

const goldButtonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 14,
  border: "1px solid rgba(250,204,21,0.42)",
  background: "rgba(250,204,21,0.12)",
  color: "#fde68a",
  fontWeight: 900,
  cursor: "pointer",
};

const smallButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
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
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(15,23,42,0.86)",
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
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.9)",
  color: "#94a3b8",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  fontSize: 12,
};
