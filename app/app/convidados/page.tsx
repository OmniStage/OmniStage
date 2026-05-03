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
  tipo_convite: string;
  observacoes: string;
  status_rsvp: string;
  status_envio: string;
};

type ImportPreviewRow = {
  id: string;
  nome?: string;
  name?: string;
  telefone?: string | null;
  phone?: string | null;
  grupo?: string | null;
  quantidade?: number;
  observacoes?: string | null;
  is_duplicate?: boolean;
};

const initialForm: ConvidadoForm = {
  nome: "",
  telefone: "",
  email: "",
  grupo: "",
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

  const [importAberto, setImportAberto] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importBatchId, setImportBatchId] = useState<string | null>(null);

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const filtrados = convidados.filter((convidado) => {
      const rsvpOk = filtroRsvp === "todos" || convidado.status_rsvp === filtroRsvp;
      const envioOk = filtroEnvio === "todos" || convidado.status_envio === filtroEnvio;

      const buscaOk =
        !termo ||
        [
          convidado.nome,
          convidado.telefone,
          convidado.email,
          convidado.grupo,
          convidado.tipo_convite,
          convidado.status_rsvp,
          convidado.status_envio,
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      return rsvpOk && envioOk && buscaOk;
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
  }, [convidados, busca, filtroRsvp, filtroEnvio]);

  const totaisPorGrupo = useMemo(() => {
    return convidadosFiltrados.reduce<Record<string, number>>((acc, convidado) => {
      const grupo = (convidado.grupo || "Sem grupo").trim() || "Sem grupo";
      acc[grupo] = (acc[grupo] || 0) + 1;
      return acc;
    }, {});
  }, [convidadosFiltrados]);

  function updateForm(field: keyof ConvidadoForm, value: string) {
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
    const token = encodeURIComponent(convidado.token || "");
    return `/c/${token}`;
  }

  function gerarLinkWhatsApp(convidado: Convidado) {
    const telefone = normalizarTelefone(convidado.telefone);

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
      .select(`
        id,
        nome,
        telefone,
        email,
        grupo,
        tipo_convite,
        observacoes,
        status_rsvp,
        status_envio,
        status_checkin,
        token,
        evento_id,
        created_at
      `)
      .eq("tenant_id", tenant)
      .eq("evento_id", evento)
      .order("grupo", { ascending: true, nullsFirst: false })
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
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        grupo: form.grupo.trim() || null,
        tipo_convite: form.tipo_convite,
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
      alert(error instanceof Error ? error.message : "Erro ao salvar convidado.");
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
      tipo_convite: convidado.tipo_convite || "individual",
      observacoes: convidado.observacoes || "",
      status_rsvp: convidado.status_rsvp || "pendente",
      status_envio: convidado.status_envio || "pendente",
    });
    setFormAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirConvidado(convidado: Convidado) {
    if (!tenantId || !eventoId) return;

    const confirmar = confirm(`Tem certeza que deseja excluir "${convidado.nome}"?`);
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

    setConvidados((current) => current.filter((item) => item.id !== convidado.id));
    alert("Convidado excluído.");
  }

  useEffect(() => {
    iniciarTela();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>Convidados</h1>

      <p style={{ color: "#94a3b8", marginTop: 8 }}>
        Cadastre os convidados que receberão o convite digital, RSVP e cartão de entrada.
      </p>

      <section style={{ marginTop: 24, marginBottom: 8 }}>
        <label style={fieldStyle}>
          <span>Evento</span>
          <select
            value={eventoId}
            onChange={(event) => trocarEvento(event.target.value)}
            style={{ ...inputStyle, maxWidth: 420 }}
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

      {importAberto && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ margin: 0 }}>Importar lista inteligente</h2>
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

          <p style={{ color: "#94a3b8", marginTop: 0 }}>
            Cole uma lista com nomes, telefones, grupos ou quantidades. Ex:
            Maria +1, Família Silva (4), João - 21999999999.
          </p>

          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder={`Maria Silva\nJoão Santos - 11999990000\nFamília Costa (4)\nAna +1`}
            style={{
              ...inputStyle,
              minHeight: 180,
              resize: "vertical",
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
                        : "1px solid #334155",
                      background: item.is_duplicate
                        ? "rgba(239,68,68,0.08)"
                        : "#0f172a",
                    }}
                  >
                    <strong>{item.nome || item.name}</strong>

                    <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                      Telefone: {item.telefone || item.phone || "Sem telefone"} · Grupo:{" "}
                      {item.grupo || "Sem grupo"} · Quantidade: {item.quantidade || 1}
                    </p>

                    {item.observacoes && (
                      <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
                        {item.observacoes}
                      </p>
                    )}

                    {item.is_duplicate && (
                      <small style={{ color: "#fca5a5", fontWeight: 800 }}>
                        Possível duplicado
                      </small>
                    )}
                  </div>
                ))}
              </div>

              {importBatchId && (
                <p style={{ color: "#64748b", marginTop: 12, fontSize: 13 }}>
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
            <h2 style={{ margin: 0 }}>{editandoId ? "Editar convidado" : "Criar convidado"}</h2>
            <button onClick={cancelarFormulario} style={secondaryButtonStyle}>
              Fechar
            </button>
          </div>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span>Nome</span>
              <input
                value={form.nome}
                onChange={(event) => updateForm("nome", event.target.value)}
                placeholder="Ex: Maria Silva"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Telefone</span>
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

            <label style={fieldStyle}>
              <span>Grupo/Família</span>
              <input
                value={form.grupo}
                onChange={(event) => updateForm("grupo", event.target.value)}
                placeholder="Ex: Família Silva"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Tipo</span>
              <select
                value={form.tipo_convite}
                onChange={(event) => updateForm("tipo_convite", event.target.value)}
                style={inputStyle}
              >
                <option value="individual">Individual</option>
                <option value="grupo">Grupo</option>
              </select>
            </label>

            <label style={fieldStyle}>
              <span>Status RSVP</span>
              <select
                value={form.status_rsvp}
                onChange={(event) => updateForm("status_rsvp", event.target.value)}
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
                onChange={(event) => updateForm("status_envio", event.target.value)}
                style={inputStyle}
              >
                <option value="pendente">Pendente</option>
                <option value="enviado">Enviado</option>
                <option value="erro">Erro</option>
              </select>
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <span>Observações</span>
              <textarea
                value={form.observacoes}
                onChange={(event) => updateForm("observacoes", event.target.value)}
                placeholder="Observações internas sobre o convidado"
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              />
            </label>
          </div>

          <div style={formActionsStyle}>
            <button onClick={salvarConvidado} disabled={loading} style={buttonStyle}>
              {loading ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar convidado"}
            </button>
            <button onClick={cancelarFormulario} style={secondaryButtonStyle}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={{ margin: 0 }}>Convidados cadastrados</h2>
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>
            {convidadosFiltrados.length} de {convidados.length}
          </span>
        </div>

        <div style={filtersStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, telefone, e-mail ou grupo..."
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
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {convidados.length === 0 && (
            <div style={emptyStyle}>Nenhum convidado cadastrado para este evento.</div>
          )}

          {convidados.length > 0 && convidadosFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum convidado encontrado com estes filtros.</div>
          )}

          {convidadosFiltrados.map((convidado, index) => {
            const linkWhatsApp = gerarLinkWhatsApp(convidado);
            const linkCartao = gerarLinkCartao(convidado);
            const linkConvite = gerarLinkConvite(convidado);
            const grupoAtual = (convidado.grupo || "Sem grupo").trim() || "Sem grupo";
            const grupoAnterior =
              index > 0
                ? (convidadosFiltrados[index - 1].grupo || "Sem grupo").trim() || "Sem grupo"
                : null;
            const deveMostrarSeparador = grupoAtual !== grupoAnterior;

            return (
              <div key={convidado.id} style={{ display: "grid", gap: 12 }}>
                {deveMostrarSeparador && (
                  <div style={groupHeaderStyle}>
                    <div>
                      <span style={groupEyebrowStyle}>Grupo/Família</span>
                      <strong style={groupTitleStyle}>{grupoAtual}</strong>
                    </div>

                    <span style={groupCountStyle}>
                      {totaisPorGrupo[grupoAtual] || 0} convidado
                      {(totaisPorGrupo[grupoAtual] || 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                )}

                <article style={eventCardStyle}>
                <div style={guestMainStyle}>
                  <strong style={{ fontSize: 22 }}>{convidado.nome}</strong>

                  <p style={{ color: "#94a3b8", marginBottom: 0 }}>
                    {convidado.grupo || "Sem grupo"} · {convidado.telefone || "Sem telefone"}
                  </p>

                  <small style={{ color: "#64748b" }}>
                    E-mail: {convidado.email || "Sem e-mail"} · Tipo:{" "}
                    {convidado.tipo_convite || "individual"}
                  </small>

                  <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
                    Token:{" "}
                    <strong style={{ color: "#facc15" }}>
                      {convidado.token || "sem token"}
                    </strong>
                  </div>

                  {convidado.observacoes && (
                    <p style={{ color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>
                      {convidado.observacoes}
                    </p>
                  )}

                  <div style={quickActionsStyle}>
                    <button onClick={() => copiarNome(convidado.nome)} style={goldButtonStyle}>
                      Copiar nome
                    </button>

                    {linkWhatsApp ? (
                      <a href={linkWhatsApp} target="_blank" rel="noreferrer" style={goldButtonStyle}>
                        WhatsApp
                      </a>
                    ) : (
                      <button disabled style={{ ...goldButtonStyle, opacity: 0.45, cursor: "not-allowed" }}>
                        WhatsApp
                      </button>
                    )}

                    <a href={linkConvite} target="_blank" rel="noreferrer" style={goldButtonStyle}>
                      Ver convite
                    </a>

                    <a href={linkCartao} target="_blank" rel="noreferrer" style={goldButtonStyle}>
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

                  <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 13 }}>
                    Check-in: {convidado.status_checkin || "nao_entrou"}
                  </div>

                  <div style={rowActionsStyle}>
                    <button onClick={() => editarConvidado(convidado)} style={smallButtonStyle}>
                      Editar
                    </button>
                    <button
                      onClick={() => excluirConvidado(convidado)}
                      style={{ ...smallButtonStyle, background: "#7f1d1d" }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
              </div>
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
      background: "rgba(34,197,94,0.14)",
      color: "#86efac",
    };
  }

  if (status === "nao") {
    return {
      ...statusStyle,
      background: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
    };
  }

  return {
    ...statusStyle,
    background: "rgba(250,204,21,0.14)",
    color: "#fde68a",
  };
}

function getEnvioStyle(status: string | null): CSSProperties {
  if (status === "enviado") {
    return {
      ...statusStyle,
      background: "rgba(59,130,246,0.14)",
      color: "#93c5fd",
    };
  }

  if (status === "erro") {
    return {
      ...statusStyle,
      background: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
    };
  }

  return {
    ...statusStyle,
    background: "rgba(148,163,184,0.14)",
    color: "#cbd5e1",
  };
}

const sectionStyle: CSSProperties = {
  marginTop: 28,
  padding: 22,
  borderRadius: 18,
  border: "1px solid #334155",
  background: "#020617",
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  justifyContent: "flex-start",
  marginTop: 24,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#cbd5e1",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
};

const formActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 20,
};

const buttonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 10,
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 10,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const filtersStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 190px 190px",
  gap: 12,
  marginBottom: 18,
};

const groupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "13px 16px",
  borderRadius: 14,
  border: "1px solid rgba(250,204,21,0.32)",
  background: "linear-gradient(135deg, rgba(250,204,21,0.12), rgba(15,23,42,0.92))",
};

const groupEyebrowStyle: CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const groupTitleStyle: CSSProperties = {
  display: "block",
  color: "#fde68a",
  fontSize: 18,
  letterSpacing: "0.02em",
};

const groupCountStyle: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "rgba(2,6,23,0.72)",
  border: "1px solid rgba(250,204,21,0.24)",
  color: "#fef3c7",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const eventCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: 18,
  background: "#0f172a",
  padding: 18,
  borderRadius: 14,
  border: "1px solid #334155",
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
  borderRadius: 9,
  background: "#2563eb",
  border: "none",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const goldButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(250,204,21,0.42)",
  background: "rgba(250,204,21,0.08)",
  color: "#fde68a",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
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
  border: "1px dashed #334155",
  color: "#94a3b8",
};
