"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
};

type Convidado = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  grupo: string | null;
  crianca: string | null;
  mae: string | null;
  responsavel: string | null;
  responsavel_telefone: string | null;
  idade_crianca: number | null;
  tamanho_chinelo: string | null;
  contato_principal: boolean | null;
  recebe_convite: boolean | null;
  tipo_convite: string | null;
  observacoes: string | null;
  status_rsvp: string | null;
  status_envio: string | null;
  status_checkin: string | null;
  token: string | null;
  evento_id: string | null;
  created_at: string | null;
};

type ConvidadoForm = {
  nome: string;
  telefone: string;
  email: string;
  grupo: string;
  crianca: string;
  responsavel: string;
  responsavel_telefone: string;
  mae: string;
  idade_crianca: string;
  tamanho_chinelo: string;
  contato_principal: boolean;
  recebe_convite: boolean;
  tipo_convite: string;
  observacoes: string;
  status_rsvp: string;
  status_envio: string;
};

type ThemeMode = "auto" | "light" | "dark";

type ImportPreviewRow = {
  id: string;
  nome?: string;
  name?: string;
  telefone?: string | null;
  phone?: string | null;
  grupo?: string | null;
  quantidade?: number;

  crianca?: string | null;
  responsavel?: string | null;
  responsavel_telefone?: string | null;
  mae?: string | null;
  idade_crianca?: string | number | null;
  tamanho_chinelo?: string | null;

  observacoes?: string | null;
  is_duplicate?: boolean;
};

const initialForm: ConvidadoForm = {
  nome: "",
  telefone: "",
  email: "",
  grupo: "",
  crianca: "",
  responsavel: "",
  responsavel_telefone: "",
  mae: "",
  idade_crianca: "",
  tamanho_chinelo: "",
  contato_principal: false,
  recebe_convite: false,
  tipo_convite: "individual",
  observacoes: "",
  status_rsvp: "pendente",
  status_envio: "pendente",
};

export default function ConvidadosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [form, setForm] = useState<ConvidadoForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroRsvp, setFiltroRsvp] = useState("todos");
  const [filtroEnvio, setFiltroEnvio] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [systemDark, setSystemDark] = useState(false);

  const [importAberto, setImportAberto] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importBatchId, setImportBatchId] = useState<string | null>(null);

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const filtrados = convidados.filter((convidado) => {
      const rsvpOk =
        filtroRsvp === "todos" || convidado.status_rsvp === filtroRsvp;
      const envioOk =
        filtroEnvio === "todos" || convidado.status_envio === filtroEnvio;
      const temGrupo = Boolean((convidado.grupo || "").trim());
      const tipoOk =
        filtroTipo === "todos" ||
        (filtroTipo === "grupo" && temGrupo) ||
        (filtroTipo === "individual" && !temGrupo);

      const buscaOk =
        !termo ||
        [
          convidado.nome,
          convidado.telefone,
          convidado.email,
          convidado.grupo,
          convidado.crianca,
          convidado.responsavel,
          convidado.responsavel_telefone,
          convidado.mae,
          convidado.idade_crianca,
          convidado.tamanho_chinelo,
          convidado.contato_principal ? "contato principal" : "",
          convidado.recebe_convite ? "recebe convite" : "",
          convidado.tipo_convite,
          convidado.status_rsvp,
          convidado.status_envio,
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      return rsvpOk && envioOk && tipoOk && buscaOk;
    });

    return [...filtrados].sort((a, b) => {
      const grupoA = (a.grupo || "Sem grupo").trim().toLowerCase();
      const grupoB = (b.grupo || "Sem grupo").trim().toLowerCase();

      if (grupoA !== grupoB) {
        return grupoA.localeCompare(grupoB, "pt-BR");
      }

      const aTemTelefone = Boolean(normalizarTelefone(a.telefone));
      const bTemTelefone = Boolean(normalizarTelefone(b.telefone));

      if (aTemTelefone !== bTemTelefone) {
        return aTemTelefone ? -1 : 1;
      }

      const nomeA = (a.nome || "").trim().toLowerCase();
      const nomeB = (b.nome || "").trim().toLowerCase();

      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  }, [convidados, busca, filtroRsvp, filtroEnvio, filtroTipo]);

  const gruposConvidados = useMemo(() => {
    const mapa = convidadosFiltrados.reduce<Record<string, Convidado[]>>(
      (acc, convidado) => {
        const grupoOriginal = (convidado.grupo || "").trim();
        const grupo = grupoOriginal || `__individual__${convidado.id}`;

        if (!acc[grupo]) {
          acc[grupo] = [];
        }

        acc[grupo].push(convidado);
        return acc;
      },
      {},
    );

    return Object.entries(mapa).map(([grupo, integrantes]) => ({
      grupo,
      integrantes,
    }));
  }, [convidadosFiltrados]);

  function updateForm(field: keyof ConvidadoForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateFormBoolean(field: "contato_principal" | "recebe_convite", value: boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function limparFormulario() {
    setForm(initialForm);
    setEditandoId(null);
  }

  function abrirCriacao() {
    limparFormulario();
    setFormAberto(true);
  }

  function cancelarFormulario() {
    limparFormulario();
    setFormAberto(false);
  }

  function gerarToken() {
    return "EVT-" + Math.floor(100000 + Math.random() * 900000);
  }

  function normalizarTelefone(telefone: string | null) {
    if (!telefone) return "";
    return telefone.replace(/\D/g, "");
  }

  function gerarLinkCartao(convidado: Convidado) {
    const nome = encodeURIComponent(convidado.nome || "");
    const token = encodeURIComponent(convidado.token || "");

    return `https://omnistageproducoes.com.br/valentinaxv/cartao/?nome=${nome}&token=${token}`;
  }

  function gerarLinkConvite(convidado: Convidado) {
  const grupo = (convidado.grupo || "").trim();

  // convite individual
  if (!grupo) {
    const token = encodeURIComponent(convidado.token || "");
    return `/c/${token}`;
  }

  // pega todos integrantes do mesmo grupo
  const integrantesGrupo = convidados.filter(
    (item) =>
      item.evento_id === convidado.evento_id &&
      (item.grupo || "").trim() === grupo
  );

  // junta todos os tokens
  const tokens = integrantesGrupo
    .map((item) => item.token)
    .filter(Boolean)
    .join(",");

  return `/c/${tokens}`;
}

  function gerarLinkListaPresentes(convidado: Convidado) {
    const eventoDoConvidado = convidado.evento_id || eventoId;
    const token = encodeURIComponent(convidado.token || "");

    if (!eventoDoConvidado) return "";

    const base = `/lista-presentes/${eventoDoConvidado}`;

    if (!token) return base;

    return `${base}?token=${token}`;
  }

  function gerarLinkWhatsAppListaPresentes(convidado: Convidado) {
    const telefone = normalizarTelefone(
      convidado.telefone || convidado.responsavel_telefone,
    );

    if (!telefone) return "";

    const linkLista = `${window.location.origin}${gerarLinkListaPresentes(convidado)}`;

    const mensagem = `Olá ${convidado.nome} ✨

A lista de presentes do evento já está disponível.

Você pode escolher um presente físico, uma experiência especial ou presentear em valor via PIX pelo link abaixo:

${linkLista}

Com carinho,
OmniStage`;

    return `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
  }

  function gerarLinkWhatsApp(convidado: Convidado) {
    const telefone = normalizarTelefone(
      convidado.telefone || convidado.responsavel_telefone,
    );

    if (!telefone) return "";

    const linkConvite = `${window.location.origin}${gerarLinkConvite(convidado)}`;
    const linkCartao = gerarLinkCartao(convidado);

    const mensagem = `Olá ${convidado.nome} ✨

Você está convidado(a) para o evento.

Convite digital:
${linkConvite}

Cartão de entrada:
${linkCartao}

Apresente o cartão na entrada do evento.`;

    return `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
  }

  async function copiarNome(nome: string) {
    await navigator.clipboard.writeText(nome);
    alert("Nome copiado.");
  }

  async function carregarTenant() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      return null;
    }

    const { data, error } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error || !data?.tenant_id) {
      alert("Este usuário ainda não está vinculado a uma empresa.");
      return null;
    }

    setTenantId(data.tenant_id);
    return data.tenant_id as string;
  }

  async function carregarEventos(tenant: string) {
    const { data, error } = await supabase
      .from("eventos")
      .select("id, nome")
      .eq("tenant_id", tenant)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return;
    }

    const eventosData = (data || []) as Evento[];
    setEventos(eventosData);

    if (eventosData.length > 0 && !eventoId) {
      setEventoId(eventosData[0].id);
      await carregarConvidados(tenant, eventosData[0].id);
    }
  }

  async function carregarConvidados(tenant: string, evento: string) {
    const { data, error } = await supabase
      .from("convidados")
      .select(
        `
        id,
        nome,
        telefone,
        email,
        grupo,
        crianca,
        mae,
        responsavel,
        responsavel_telefone,
        idade_crianca,
        tamanho_chinelo,
        contato_principal,
        recebe_convite,
        tipo_convite,
        observacoes,
        status_rsvp,
        status_envio,
        status_checkin,
        token,
        evento_id,
        created_at
      `,
      )
      .eq("tenant_id", tenant)
      .eq("evento_id", evento)
      .order("grupo", { ascending: true, nullsFirst: false })
      .order("telefone", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar convidados: " + error.message);
      return;
    }

    setConvidados((data || []) as Convidado[]);
  }

  async function iniciarTela() {
    const tenant = await carregarTenant();

    if (tenant) {
      await carregarEventos(tenant);
    }
  }

  async function trocarEvento(id: string) {
    setEventoId(id);
    limparFormulario();
    setFormAberto(false);
    setImportPreview([]);
    setImportBatchId(null);

    if (tenantId && id) {
      await carregarConvidados(tenantId, id);
    } else {
      setConvidados([]);
    }
  }

  async function salvarConvidado() {
    if (!form.nome.trim()) {
      alert("Digite o nome do convidado.");
      return;
    }

    if (!tenantId || !eventoId) {
      alert("Selecione um evento.");
      return;
    }

    setLoading(true);

    try {
      const grupoNormalizado = form.grupo.trim();
      const conviteEhGrupo = form.tipo_convite === "grupo";
      const grupoFinal = conviteEhGrupo ? grupoNormalizado : "";
      const responsavelNormalizado = form.responsavel.trim();
      const responsavelTelefoneNormalizado = form.responsavel_telefone.trim();
      const maeNormalizada = responsavelNormalizado || form.mae.trim();
      const idadeCriancaNormalizada = form.idade_crianca.trim();
      const criancaSelecionada = form.crianca === "sim" || Boolean(idadeCriancaNormalizada);
      const criancaSemGrupoViaResponsavel =
        criancaSelecionada && !grupoFinal && Boolean(responsavelNormalizado);

      if (conviteEhGrupo && !grupoFinal) {
        alert("Informe o nome do grupo/família ou altere o tipo do convite para Individual.");
        return;
      }

      if (criancaSemGrupoViaResponsavel && !responsavelTelefoneNormalizado) {
        alert("Informe o telefone do responsável pelo envio.");
        return;
      }

      const telefonePrincipal = form.telefone.trim();

      const payload = {
        nome: form.nome.trim(),
        telefone: telefonePrincipal || null,
        email: form.email.trim() || null,
        grupo: grupoFinal || null,
        crianca: criancaSelecionada || responsavelNormalizado ? "sim" : form.crianca,
        mae: maeNormalizada || null,
        responsavel: responsavelNormalizado || maeNormalizada || null,
        responsavel_telefone: responsavelTelefoneNormalizado || null,
        idade_crianca: idadeCriancaNormalizada
          ? Number(idadeCriancaNormalizada)
          : null,
        tamanho_chinelo: form.tamanho_chinelo.trim() || null,
        contato_principal: conviteEhGrupo && !criancaSemGrupoViaResponsavel ? form.contato_principal : false,
        recebe_convite: criancaSemGrupoViaResponsavel
          ? true
          : conviteEhGrupo
            ? form.recebe_convite || form.contato_principal
            : true,
        tipo_convite: conviteEhGrupo ? "grupo" : "individual",
        observacoes: form.observacoes.trim() || null,
        status_rsvp: form.status_rsvp,
        status_envio: form.status_envio,
      };

      const { error } = editandoId
        ? await supabase
            .from("convidados")
            .update(payload)
            .eq("id", editandoId)
            .eq("tenant_id", tenantId)
            .eq("evento_id", eventoId)
        : await supabase.from("convidados").insert({
            ...payload,
            tenant_id: tenantId,
            evento_id: eventoId,
            token: gerarToken(),
            status_checkin: "nao_entrou",
          });

      if (error) {
        throw new Error(error.message);
      }

      limparFormulario();
      setFormAberto(false);
      await carregarConvidados(tenantId, eventoId);
      alert(editandoId ? "Convidado atualizado." : "Convidado criado.");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao salvar convidado.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function gerarPreviewImportacao() {
    if (!tenantId || !eventoId) {
      alert("Selecione um evento antes de importar convidados.");
      return;
    }

    if (!importText.trim()) {
      alert("Cole uma lista de convidados antes de continuar.");
      return;
    }

    setImportLoading(true);

    try {
      const response = await fetch("/api/guests/import-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          eventoId,
          sourceType: "smart_paste",
          text: importText,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar prévia.");
      }

      setImportBatchId(result.batchId);
      setImportPreview(result.preview || []);
      alert(`${result.total || 0} convidados interpretados para revisão.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao importar lista.");
    } finally {
      setImportLoading(false);
    }
  }

  function editarConvidado(convidado: Convidado) {
    setEditandoId(convidado.id);
    setForm({
      nome: convidado.nome || "",
      telefone: convidado.telefone || "",
      email: convidado.email || "",
      grupo: convidado.grupo || "",
      crianca: convidado.responsavel || convidado.mae ? "sim" : convidado.crianca || "",
      responsavel: convidado.responsavel || convidado.mae || "",
      responsavel_telefone: convidado.responsavel_telefone || "",
      mae: convidado.mae || "",
      idade_crianca: convidado.idade_crianca
        ? String(convidado.idade_crianca)
        : "",
      tamanho_chinelo: convidado.tamanho_chinelo || "",
      contato_principal: Boolean(convidado.contato_principal),
      recebe_convite: Boolean(convidado.recebe_convite),
      tipo_convite: convidado.tipo_convite || (convidado.grupo ? "grupo" : "individual"),
      observacoes: convidado.observacoes || "",
      status_rsvp: convidado.status_rsvp || "pendente",
      status_envio: convidado.status_envio || "pendente",
    });
    setFormAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirConvidado(convidado: Convidado) {
    if (!tenantId || !eventoId) return;

    const confirmar = confirm(
      `Tem certeza que deseja excluir "${convidado.nome}"?`,
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("convidados")
      .delete()
      .eq("id", convidado.id)
      .eq("tenant_id", tenantId)
      .eq("evento_id", eventoId);

    if (error) {
      alert("Erro ao excluir convidado: " + error.message);
      return;
    }

    setConvidados((current) =>
      current.filter((item) => item.id !== convidado.id),
    );
    alert("Convidado excluído.");
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      setSystemDark(media.matches);
    };

    updateTheme();
    media.addEventListener("change", updateTheme);

    return () => media.removeEventListener("change", updateTheme);
  }, []);

  useEffect(() => {
    iniciarTela();
  }, []);

  const isDark = themeMode === "dark" || (themeMode === "auto" && systemDark);
  const themeVars = getThemeVars(isDark);

  return (
    <main style={getPageStyle(themeVars)}>
      <section style={heroCardStyle}>
        <div style={pageHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>OmniStage App</div>
            <h1 style={pageTitleStyle}>Convidados</h1>
            <p style={pageSubtitleStyle}>
              Cadastre os convidados que receberão o convite digital, RSVP e
              cartão de entrada.
            </p>
          </div>

          <label style={themeSwitcherStyle}>
            <span>Tema</span>
            <select
              value={themeMode}
              onChange={(event) =>
                setThemeMode(event.target.value as ThemeMode)
              }
              style={themeSelectStyle}
            >
              <option value="auto">Automático</option>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </label>
        </div>

        <div style={heroControlsStyle}>
          <label style={{ ...fieldStyle, maxWidth: 520 }}>
            <span>Evento</span>
            <select
              value={eventoId}
              onChange={(event) => trocarEvento(event.target.value)}
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

          <div style={topActionsStyle}>
            <button onClick={abrirCriacao} style={buttonStyle}>
              + Criar convidado
            </button>

            <button
              onClick={() => setImportAberto((current) => !current)}
              style={secondaryButtonStyle}
            >
              Importar lista inteligente
            </button>
          </div>
        </div>
      </section>

      {importAberto && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={cardTitleStyle}>Importar lista inteligente</h2>
            <button
              onClick={() => {
                setImportAberto(false);
                setImportText("");
                setImportPreview([]);
                setImportBatchId(null);
              }}
              style={secondaryButtonStyle}
            >
              Fechar
            </button>
          </div>

          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Cole uma lista com nomes, telefones, grupos ou quantidades. Ex:
            Maria +1, Família Silva (4), João - 21999999999.
          </p>

          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder={`Maria Silva\nJoão Santos - 11999990000\nFamília Costa (4)\nAna +1`}
            style={{
              ...textareaStyle,
              minHeight: 180,
              marginTop: 12,
            }}
          />

          <div style={formActionsStyle}>
            <button
              onClick={gerarPreviewImportacao}
              disabled={importLoading}
              style={buttonStyle}
            >
              {importLoading ? "Interpretando..." : "Gerar prévia"}
            </button>
          </div>

          {importPreview.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 12 }}>Prévia da importação</h3>

              <div style={{ display: "grid", gap: 10 }}>
                {importPreview.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: item.is_duplicate
                        ? "1px solid rgba(239,68,68,0.6)"
                        : "1px solid var(--border)",
                      background: item.is_duplicate
                        ? "rgba(239,68,68,0.08)"
                        : "var(--soft-bg)",
                    }}
                  >
                    <strong>{item.nome || item.name}</strong>

                    <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
                      Telefone: {item.telefone || item.phone || "Sem telefone"}{" "}
                      · Grupo: {item.grupo || "Sem grupo"} · Quantidade:{" "}
                      {item.quantidade || 1}
                      {(item.mae || item.idade_crianca) && (
                        <>
                          {" "}
                          · Criança: {item.mae
                            ? "sim"
                            : item.crianca || "não"}{" "}
                          · Responsável: {item.responsavel || item.mae || "-"} · Idade da criança:{" "}
                          {item.idade_crianca || "-"}
                        </>
                      )}
                    </p>

                    {item.observacoes && (
                      <p
                        style={{
                          color: "var(--muted)",
                          margin: "6px 0 0",
                          fontSize: 13,
                        }}
                      >
                        {item.observacoes}
                      </p>
                    )}

                    {item.is_duplicate && (
                      <small style={{ color: "#b91c1c", fontWeight: 800 }}>
                        Possível duplicado
                      </small>
                    )}
                  </div>
                ))}
              </div>

              {importBatchId && (
                <p
                  style={{ color: "var(--muted)", marginTop: 12, fontSize: 13 }}
                >
                  Lote de importação: {importBatchId}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {formAberto && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={sectionKickerStyle}>
                {editandoId ? "Atualizar cadastro" : "Novo cadastro"}
              </div>
              <h2 style={cardTitleStyle}>
                {editandoId ? "Editar convidado" : "Criar convidado"}
              </h2>
            </div>
            <button onClick={cancelarFormulario} style={secondaryButtonStyle}>
              Fechar
            </button>
          </div>

          <div style={stackedFormStyle}>
            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>01</span>
                <div>
                  <strong>Dados do convidado</strong>
                  <p>Informe os dados principais de quem estará no evento.</p>
                </div>
              </div>

              <div style={formBlockGridStyle}>
                <label style={fieldStyle}>
                  <span>Nome do convidado</span>
                  <input
                    value={form.nome}
                    onChange={(event) => updateForm("nome", event.target.value)}
                    placeholder="Ex: Maria Silva"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span>Telefone do convidado</span>
                  <input
                    value={form.telefone}
                    onChange={(event) => updateForm("telefone", event.target.value)}
                    placeholder="Ex: (22) 99999-9999"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span>E-mail</span>
                  <input
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    placeholder="email@email.com"
                    style={inputStyle}
                  />
                </label>
              </div>
            </section>

            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>02</span>
                <div>
                  <strong>Perfil do convidado</strong>
                  <p>Defina se é adulto ou criança. Quando for criança sem grupo, informe quem receberá o convite.</p>
                </div>
              </div>

              <div style={formBlockGridStyle}>
                <label style={fieldStyle}>
                  <span>Tipo de convidado</span>
                  <select
                    value={form.crianca === "sim" ? "crianca" : "adulto"}
                    onChange={(event) => {
                      const isCrianca = event.target.value === "crianca";
                      setForm((current) => ({
                        ...current,
                        crianca: isCrianca ? "sim" : "",
                        idade_crianca: isCrianca ? current.idade_crianca : "",
                        responsavel: isCrianca ? current.responsavel : "",
                        responsavel_telefone: isCrianca ? current.responsavel_telefone : "",
                        mae: isCrianca ? current.mae : "",
                        contato_principal:
                          isCrianca && !current.grupo.trim() ? false : current.contato_principal,
                        recebe_convite:
                          isCrianca && !current.grupo.trim() && current.responsavel.trim()
                            ? true
                            : current.recebe_convite,
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="adulto">Adulto</option>
                    <option value="crianca">Criança</option>
                  </select>
                </label>

                {form.crianca === "sim" && (
                  <label style={fieldStyle}>
                    <span>Idade da criança</span>
                    <input
                      value={form.idade_crianca}
                      onChange={(event) =>
                        updateForm("idade_crianca", event.target.value)
                      }
                      placeholder="Ex: 7"
                      type="number"
                      min="0"
                      style={inputStyle}
                    />
                  </label>
                )}
              </div>

              {form.crianca === "sim" && !form.grupo.trim() && (
                <div style={responsavelSubBlockStyle}>
                  <div style={subBlockHeaderStyle}>
                    <strong>Responsável pelo envio</strong>
                    <span>
                      Criança sem grupo/família: o convite será enviado para este responsável.
                    </span>
                  </div>

                  <div style={formBlockGridStyle}>
                    <label style={fieldStyle}>
                      <span>Nome do responsável</span>
                      <input
                        value={form.responsavel}
                        onChange={(event) => {
                          const responsavel = event.target.value;
                          setForm((current) => ({
                            ...current,
                            responsavel,
                            mae: responsavel,
                            crianca: "sim",
                            recebe_convite: Boolean(responsavel.trim()),
                            contato_principal: false,
                            tipo_convite: "individual",
                          }));
                        }}
                        placeholder="Ex: Jessica Amaral"
                        style={inputStyle}
                      />
                    </label>

                    <label style={fieldStyle}>
                      <span>Telefone do responsável</span>
                      <input
                        value={form.responsavel_telefone}
                        onChange={(event) =>
                          updateForm("responsavel_telefone", event.target.value)
                        }
                        placeholder="Ex: (22) 99999-9999"
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <div style={formBlockGridStyle}>
                    <label style={toggleFieldStyle}>
                      <input
                        type="checkbox"
                        checked={form.recebe_convite}
                        onChange={(event) =>
                          updateFormBoolean("recebe_convite", event.target.checked)
                        }
                        style={checkboxInputStyle}
                      />
                      <div style={toggleTextStyle}>
                        <strong>Recebe comunicação</strong>
                        <span>Usado no envio: o responsável recebe o convite/comunicação da criança.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </section>

            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>03</span>
                <div>
                  <strong>Perfil do convite</strong>
                  <p>Defina se este convite será individual ou para um grupo/família. Os campos de grupo aparecem somente quando necessário.</p>
                </div>
              </div>

              <div style={formBlockGridStyle}>
                <label style={fieldStyle}>
                  <span>Tipo do convite</span>
                  <select
                    value={form.tipo_convite}
                    onChange={(event) => {
                      const tipo = event.target.value;

                      setForm((current) => ({
                        ...current,
                        tipo_convite: tipo,
                        grupo: tipo === "grupo" ? current.grupo : "",
                        contato_principal: tipo === "grupo" ? current.contato_principal : false,
                        recebe_convite:
                          tipo === "individual"
                            ? true
                            : current.recebe_convite,
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="individual">Individual</option>
                    <option value="grupo">Grupo / Família</option>
                  </select>
                </label>
              </div>

              {form.tipo_convite === "grupo" && (
                <>
                  <div style={formBlockGridStyle}>
                    <label style={fieldStyle}>
                      <span>Nome do grupo/família</span>
                      <input
                        value={form.grupo}
                        onChange={(event) => {
                          const grupo = event.target.value;
                          setForm((current) => ({
                            ...current,
                            grupo,
                            tipo_convite: "grupo",
                          }));
                        }}
                        placeholder="Ex: Família Silva"
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <div style={formBlockGridStyle}>
                    <label style={toggleFieldStyle}>
                      <input
                        type="checkbox"
                        checked={form.contato_principal}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setForm((current) => ({
                            ...current,
                            contato_principal: checked,
                            recebe_convite: checked ? true : current.recebe_convite,
                          }));
                        }}
                        style={checkboxInputStyle}
                      />
                      <div style={toggleTextStyle}>
                        <strong>Contato principal</strong>
                        <span>Identifica quem representa o grupo/família no envio.</span>
                      </div>
                    </label>

                    <label style={toggleFieldStyle}>
                      <input
                        type="checkbox"
                        checked={form.recebe_convite}
                        onChange={(event) =>
                          updateFormBoolean("recebe_convite", event.target.checked)
                        }
                        style={checkboxInputStyle}
                      />
                      <div style={toggleTextStyle}>
                        <strong>Recebe comunicação</strong>
                        <span>Usado no envio: esta pessoa recebe o convite/comunicação do grupo.</span>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </section>

            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>04</span>
                <div>
                  <strong>Extras do evento</strong>
                  <p>Campos opcionais para brindes, kits, observações internas e detalhes operacionais.</p>
                </div>
              </div>

              <div style={formBlockGridStyle}>
                <label style={fieldStyle}>
                  <span>Tamanho do chinelo</span>
                  <input
                    value={form.tamanho_chinelo}
                    onChange={(event) => updateForm("tamanho_chinelo", event.target.value)}
                    placeholder="Ex: 35/36"
                    style={inputStyle}
                  />
                </label>

                <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                  <span>Observações</span>
                  <textarea
                    value={form.observacoes}
                    onChange={(event) =>
                      updateForm("observacoes", event.target.value)
                    }
                    placeholder="Observações internas sobre o convidado"
                    style={textareaStyle}
                  />
                </label>
              </div>
            </section>

            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>05</span>
                <div>
                  <strong>Status</strong>
                  <p>Acompanhe o RSVP e o andamento do envio deste convidado.</p>
                </div>
              </div>

              <div style={formBlockGridStyle}>
                <label style={fieldStyle}>
                  <span>Status RSVP</span>
                  <select
                    value={form.status_rsvp}
                    onChange={(event) =>
                      updateForm("status_rsvp", event.target.value)
                    }
                    style={inputStyle}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="nao">Não vai</option>
                  </select>
                </label>

                <label style={fieldStyle}>
                  <span>Status envio</span>
                  <select
                    value={form.status_envio}
                    onChange={(event) =>
                      updateForm("status_envio", event.target.value)
                    }
                    style={inputStyle}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="enviado">Enviado</option>
                    <option value="erro">Erro</option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          <div style={formActionsStyle}>
            <button
              onClick={salvarConvidado}
              disabled={loading}
              style={buttonStyle}
            >
              {loading
                ? "Salvando..."
                : editandoId
                  ? "Salvar alterações"
                  : "Criar convidado"}
            </button>
            <button onClick={cancelarFormulario} style={secondaryButtonStyle}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={cardTitleStyle}>Convidados cadastrados</h2>
          <span style={{ color: "var(--muted)", fontWeight: 700 }}>
            {convidadosFiltrados.length} de {convidados.length}
          </span>
        </div>

        <div style={filtersStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, responsável, telefone, e-mail ou grupo..."
            style={inputStyle}
          />

          <select
            value={filtroRsvp}
            onChange={(event) => setFiltroRsvp(event.target.value)}
            style={inputStyle}
          >
            <option value="todos">Todos RSVP</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="nao">Não vai</option>
          </select>

          <select
            value={filtroEnvio}
            onChange={(event) => setFiltroEnvio(event.target.value)}
            style={inputStyle}
          >
            <option value="todos">Todos envios</option>
            <option value="pendente">Pendente</option>
            <option value="enviado">Enviado</option>
            <option value="erro">Erro</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(event) => setFiltroTipo(event.target.value)}
            style={inputStyle}
          >
            <option value="todos">Todos os tipos</option>
            <option value="grupo">Grupos/Famílias</option>
            <option value="individual">Individuais</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {convidados.length === 0 && (
            <div style={emptyStyle}>
              Nenhum convidado cadastrado para este evento.
            </div>
          )}

          {convidados.length > 0 && convidadosFiltrados.length === 0 && (
            <div style={emptyStyle}>
              Nenhum convidado encontrado com estes filtros.
            </div>
          )}

          {gruposConvidados.map(({ grupo, integrantes }) => {
            const nomesIntegrantes = integrantes
              .map((convidado) => convidado.nome)
              .filter(Boolean)
              .join(" • ");
            const isIndividual =
              grupo.startsWith("__individual__") ||
              integrantes.length === 1 ||
              integrantes.every(
                (item) =>
                  !item.grupo ||
                  item.grupo.trim() === "" ||
                  item.tipo_convite === "individual",
              );

            const mostrarGrupo =
              !isIndividual &&
              Boolean(grupo) &&
              !grupo.startsWith("__individual__");

            return (
              <article key={grupo} style={groupCardLargeStyle}>
                {mostrarGrupo && (
                  <>
                    <div style={groupCardHeaderStyle}>
                      <div>
                        <span style={groupEyebrowStyle}>Grupo encontrado</span>
                        <strong style={groupTitleStyle}>{grupo}</strong>
                      </div>

                      <span style={groupCountStyle}>
                        {integrantes.length} integrante
                        {integrantes.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <p style={groupMembersSummaryStyle}>
                      <strong>Integrantes:</strong>{" "}
                      {nomesIntegrantes || "Sem integrantes"}
                    </p>
                  </>
                )}

                <div style={groupMemberListStyle}>
                  {integrantes.map((convidado) => {
                    const linkWhatsApp = gerarLinkWhatsApp(convidado);
                    const linkWhatsAppListaPresentes =
                      gerarLinkWhatsAppListaPresentes(convidado);
                    const linkCartao = gerarLinkCartao(convidado);
                    const linkConvite = gerarLinkConvite(convidado);
                    const linkListaPresentes = gerarLinkListaPresentes(convidado);

                    return (
                      <div key={convidado.id} style={groupMemberRowStyle}>
                        <div style={groupMemberInfoStyle}>
                          <strong
                            style={{
                              fontSize: 21,
                              color: "var(--text)",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {convidado.nome}
                          </strong>

                          <p
                            style={{ color: "var(--muted)", margin: "6px 0 0" }}
                          >
                            {convidado.telefone
                              ? convidado.telefone
                              : convidado.responsavel_telefone
                                ? `Responsável: ${convidado.responsavel_telefone}`
                                : "Sem telefone"}
                          </p>

                          <small style={{ color: "var(--muted)" }}>
                            E-mail: {convidado.email || "Sem e-mail"}
                            {mostrarGrupo ? (
                              <> · Grupo: {grupo}</>
                            ) : (
                              <> · Individual</>
                            )}
                            {convidado.tamanho_chinelo ? ` · Chinelo: ${convidado.tamanho_chinelo}` : ""}
                          </small>

                          {(convidado.crianca ||
                            convidado.responsavel ||
                            convidado.mae ||
                            convidado.idade_crianca) && (
                            <div
                              style={{
                                marginTop: 8,
                                color: "var(--muted)",
                                fontSize: 13,
                              }}
                            >
                              Criança: {convidado.crianca || "não"} · Responsável:{" "}
                              {convidado.responsavel || convidado.mae || "-"}
                              {convidado.responsavel_telefone
                                ? ` · Tel. responsável: ${convidado.responsavel_telefone}`
                                : ""}{" "}
                              · Idade da criança: {convidado.idade_crianca ?? "-"}
                            </div>
                          )}

                          {((mostrarGrupo && convidado.contato_principal) ||
                            convidado.recebe_convite) && (
                            <div style={sendIdentityStyle}>
                              {mostrarGrupo && convidado.contato_principal && (
                                <span>Contato principal do grupo</span>
                              )}
                              {convidado.recebe_convite && (
                                <span>Recebe comunicação</span>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: 8,
                              color: "var(--muted)",
                              fontSize: 13,
                            }}
                          >
                            Token:{" "}
                            <strong style={{ color: "var(--accent)" }}>
                              {convidado.token || "sem token"}
                            </strong>
                          </div>

                          {convidado.observacoes && (
                            <p
                              style={{
                                color: "var(--muted)",
                                marginTop: 10,
                                marginBottom: 0,
                              }}
                            >
                              {convidado.observacoes}
                            </p>
                          )}

                          <div style={quickActionsStyle}>
                            <button
                              onClick={() => copiarNome(convidado.nome)}
                              style={goldButtonStyle}
                            >
                              Copiar nome
                            </button>

                            {linkWhatsApp ? (
                              <a
                                href={linkWhatsApp}
                                target="_blank"
                                rel="noreferrer"
                                style={goldButtonStyle}
                              >
                                WhatsApp
                              </a>
                            ) : (
                              <button
                                disabled
                                style={{
                                  ...goldButtonStyle,
                                  opacity: 0.45,
                                  cursor: "not-allowed",
                                }}
                              >
                                WhatsApp
                              </button>
                            )}

                            {linkWhatsAppListaPresentes ? (
                              <a
                                href={linkWhatsAppListaPresentes}
                                target="_blank"
                                rel="noreferrer"
                                style={giftButtonStyle}
                              >
                                Enviar lista de presentes
                              </a>
                            ) : (
                              <button
                                disabled
                                style={{
                                  ...giftButtonStyle,
                                  opacity: 0.45,
                                  cursor: "not-allowed",
                                }}
                              >
                                Enviar lista de presentes
                              </button>
                            )}

                            {linkListaPresentes && (
                              <a
                                href={linkListaPresentes}
                                target="_blank"
                                rel="noreferrer"
                                style={goldButtonStyle}
                              >
                                Ver lista
                              </a>
                            )}

                            <a
                              href={linkConvite}
                              target="_blank"
                              rel="noreferrer"
                              style={goldButtonStyle}
                            >
                              Ver convite
                            </a>

                            <a
                              href={linkCartao}
                              target="_blank"
                              rel="noreferrer"
                              style={goldButtonStyle}
                            >
                              Ver cartão
                            </a>
                          </div>
                        </div>

                        <div style={eventActionsColumnStyle}>
                          <span style={getRsvpStyle(convidado.status_rsvp)}>
                            RSVP: {labelRsvp(convidado.status_rsvp)}
                          </span>

                          <div style={{ marginTop: 10 }}>
                            <span style={getEnvioStyle(convidado.status_envio)}>
                              Envio: {labelEnvio(convidado.status_envio)}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              color: "var(--muted)",
                              fontSize: 13,
                            }}
                          >
                            Check-in: {convidado.status_checkin || "nao_entrou"}
                          </div>

                          <div style={rowActionsStyle}>
                            <button
                              onClick={() => editarConvidado(convidado)}
                              style={smallButtonStyle}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => excluirConvidado(convidado)}
                              style={{
                                ...smallButtonStyle,
                                background: "#dc2626",
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function labelRsvp(status: string | null) {
  if (status === "confirmado") return "Confirmado";
  if (status === "nao") return "Não vai";
  return "Pendente";
}

function labelEnvio(status: string | null) {
  if (status === "enviado") return "Enviado";
  if (status === "erro") return "Erro";
  return "Pendente";
}

function getRsvpStyle(status: string | null): CSSProperties {
  if (status === "confirmado") {
    return {
      ...statusStyle,
      background: "#dcfce7",
      color: "#15803d",
    };
  }

  if (status === "nao") {
    return {
      ...statusStyle,
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  return {
    ...statusStyle,
    background: "#fef3c7",
    color: "var(--accent)",
  };
}

function getEnvioStyle(status: string | null): CSSProperties {
  if (status === "enviado") {
    return {
      ...statusStyle,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (status === "erro") {
    return {
      ...statusStyle,
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  return {
    ...statusStyle,
    background: "var(--soft-bg)",
    color: "var(--text-secondary)",
  };
}

function getThemeVars(isDark: boolean): CSSProperties & Record<string, string> {
  return isDark
    ? {
        "--page-bg": "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
        "--card-bg": "#0f172a",
        "--section-bg": "#020617",
        "--soft-bg": "#111827",
        "--text": "#ffffff",
        "--text-secondary": "#cbd5e1",
        "--muted": "#94a3b8",
        "--border": "#334155",
        "--border-strong": "#475569",
        "--accent": "#a78bfa",
        "--accent-strong": "#c4b5fd",
        "--accent-border": "rgba(167,139,250,0.35)",
        "--group-soft": "rgba(124,58,237,0.12)",
        "--primary-bg": "linear-gradient(135deg, #7c3aed, #5b21b6)",
        "--primary-shadow": "0 12px 32px rgba(124,58,237,0.28)",
      }
    : {
        "--page-bg": "#f3f4f6",
        "--card-bg": "#ffffff",
        "--section-bg": "#ffffff",
        "--soft-bg": "#f9fafb",
        "--text": "#0f172a",
        "--text-secondary": "#374151",
        "--muted": "#6b7280",
        "--border": "#e5e7eb",
        "--border-strong": "#d1d5db",
        "--accent": "#7c3aed",
        "--accent-strong": "#5b21b6",
        "--accent-border": "rgba(124,58,237,0.28)",
        "--group-soft": "#f5f3ff",
        "--primary-bg": "#43a500",
        "--primary-shadow": "0 8px 22px rgba(67,165,0,0.22)",
      };
}

function getPageStyle(
  themeVars: CSSProperties & Record<string, string>,
): CSSProperties {
  return {
    ...themeVars,
    minHeight: "100vh",
    padding: 24,
    background: "var(--page-bg)",
    color: "var(--text)",
    transition: "background 180ms ease, color 180ms ease",
  };
}

const heroCardStyle: CSSProperties = {
  padding: 30,
  borderRadius: 34,
  border: "1px solid var(--border)",
  background: "linear-gradient(135deg, var(--section-bg), var(--soft-bg))",
  boxShadow: "0 18px 55px rgba(15,23,42,0.08)",
};

const eyebrowStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 38,
  lineHeight: 1.05,
  fontWeight: 900,
  letterSpacing: "-0.04em",
};

const pageSubtitleStyle: CSSProperties = {
  color: "var(--muted)",
  margin: "10px 0 0",
  fontSize: 17,
  lineHeight: 1.45,
  maxWidth: 760,
};

const heroControlsStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  marginTop: 26,
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const sectionKickerStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const pageHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
};

const themeSwitcherStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "var(--muted)",
  fontWeight: 800,
  minWidth: 180,
};

const themeSelectStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 999,
  background: "var(--card-bg)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
  fontWeight: 800,
};

const sectionStyle: CSSProperties = {
  marginTop: 24,
  padding: 30,
  borderRadius: 34,
  border: "1px solid var(--border)",
  background: "var(--section-bg)",
  boxShadow: "0 14px 45px rgba(15,23,42,0.07), 0 2px 10px rgba(15,23,42,0.04)",
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  justifyContent: "flex-start",
  marginTop: 0,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const stackedFormStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const formBlockCardStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  padding: 24,
  borderRadius: 28,
  border: "1px solid var(--border)",
  background: "linear-gradient(135deg, var(--card-bg), var(--soft-bg))",
  boxShadow: "0 10px 30px rgba(15,23,42,0.045)",
};

const formBlockHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  color: "var(--text)",
};

const formBlockGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const responsavelSubBlockStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 20,
  borderRadius: 24,
  border: "1px solid var(--accent-border)",
  background: "linear-gradient(135deg, var(--group-soft), var(--card-bg))",
};

const subBlockHeaderStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  color: "var(--text)",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 9,
  color: "var(--text-secondary)",
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "-0.01em",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 54,
  padding: "0 18px",
  borderRadius: 18,
  background: "var(--card-bg)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
  fontSize: 15,
  fontWeight: 600,
  outline: "none",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 118,
  padding: 18,
  resize: "vertical",
  lineHeight: 1.55,
};

const formActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 20,
};

const buttonStyle: CSSProperties = {
  padding: "15px 22px",
  minHeight: 54,
  borderRadius: 999,
  background: "var(--primary-bg)",
  border: "none",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "var(--primary-shadow)",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "14px 20px",
  minHeight: 54,
  borderRadius: 999,
  background: "var(--card-bg)",
  border: "1px solid var(--border-strong)",
  color: "var(--text)",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const filtersStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(260px, 1fr) minmax(160px, 200px) minmax(160px, 200px) minmax(160px, 200px)",
  gap: 14,
  marginBottom: 20,
};

const groupCardLargeStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  background: "var(--card-bg)",
  padding: 26,
  borderRadius: 28,
  border: "1px solid var(--border)",
  boxShadow: "0 14px 42px rgba(15,23,42,0.08)",
};

const groupCardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  paddingBottom: 16,
  borderBottom: "1px solid var(--border)",
};

const groupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "13px 16px",
  borderRadius: 14,
  border: "1px solid var(--accent-border)",
  background: "linear-gradient(135deg, var(--group-soft), var(--card-bg))",
};

const groupEyebrowStyle: CSSProperties = {
  display: "block",
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const groupTitleStyle: CSSProperties = {
  display: "block",
  color: "var(--accent)",
  fontSize: 18,
  letterSpacing: "0.02em",
};

const groupCountStyle: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "var(--group-soft)",
  border: "1px solid var(--accent-border)",
  color: "var(--accent-strong)",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const groupMembersSummaryStyle: CSSProperties = {
  margin: 0,
  color: "var(--text-secondary)",
  fontSize: 17,
  lineHeight: 1.55,
};

const groupMemberListStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const groupMemberRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: 18,
  padding: 18,
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--soft-bg)",
};

const groupMemberInfoStyle: CSSProperties = {
  flex: 1,
  minWidth: 280,
};

const eventCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: 18,
  background: "var(--card-bg)",
  padding: 18,
  borderRadius: 14,
  border: "1px solid var(--border-strong)",
};

const guestMainStyle: CSSProperties = {
  flex: 1,
  minWidth: 280,
};

const eventActionsColumnStyle: CSSProperties = {
  minWidth: 230,
  textAlign: "right",
};

const rowActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 14,
  flexWrap: "wrap",
};

const quickActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
};

const smallButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 999,
  background: "var(--accent)",
  border: "none",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const goldButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 999,
  border: "1px solid var(--accent)",
  background: "var(--card-bg)",
  color: "var(--accent)",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
};

const giftButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 999,
  border: "1px solid rgba(124,58,237,0.32)",
  background: "linear-gradient(135deg, rgba(124,58,237,0.12), var(--card-bg))",
  color: "var(--accent)",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
};

const toggleFieldStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  minHeight: 74,
  padding: 16,
  borderRadius: 18,
  border: "1px solid var(--border-strong)",
  background: "var(--card-bg)",
  color: "var(--text-secondary)",
};

const checkboxInputStyle: CSSProperties = {
  width: 20,
  height: 20,
  marginTop: 2,
  accentColor: "var(--accent)",
  cursor: "pointer",
};

const toggleTextStyle: CSSProperties = {
  display: "grid",
  gap: 3,
  lineHeight: 1.22,
};

const sendIdentityStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 900,
};

const formSectionDividerStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gap: 4,
  paddingTop: 8,
  color: "var(--text)",
};

const responsavelBoxStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  padding: 18,
  borderRadius: 22,
  border: "1px solid var(--accent-border)",
  background: "linear-gradient(135deg, var(--group-soft), var(--card-bg))",
};

const responsavelHeaderStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gap: 4,
  color: "var(--text)",
};

const statusStyle: CSSProperties = {
  display: "inline-block",
  padding: "7px 11px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  border: "1px dashed var(--border-strong)",
  color: "var(--muted)",
};
   
