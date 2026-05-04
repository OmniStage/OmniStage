"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TipoEnvio = "convite" | "lembrete_rsvp" | "cartao_evento";
type FiltroStatusEnvio = "a_enviar" | "enviados" | "sem_telefone" | "todos";

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email?: string | null;
  grupo: string | null;
  status_rsvp: string | null;
  status_checkin?: string | null;
  token?: string | null;

  status_envio_convite?: string | null;
  data_envio_convite?: string | null;

  status_envio_lembrete_rsvp?: string | null;
  data_envio_lembrete_rsvp?: string | null;

  status_envio_cartao?: string | null;
  data_envio_cartao?: string | null;
};

type Evento = {
  id: string;
  nome: string | null;
};

type Campanha = {
  key: TipoEnvio;
  titulo: string;
  subtitulo: string;
  descricao: string;
  statusColumn: keyof Convidado;
  dataColumn: keyof Convidado;
  cor: string;
  corSuave: string;
  filtrarPublico: (convidado: Convidado) => boolean;
  templatePadrao: string;
};



export default function EnviosPage() {
  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio>("convite");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusEnvio>("a_enviar");
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [templates, setTemplates] = useState<Record<TipoEnvio, string>>({
    convite: campanhas.convite.templatePadrao,
    lembrete_rsvp: campanhas.lembrete_rsvp.templatePadrao,
    cartao_evento: campanhas.cartao_evento.templatePadrao,
  });
  const [templatesConfigurados, setTemplatesConfigurados] = useState<Record<TipoEnvio, boolean>>({
    convite: false,
    lembrete_rsvp: false,
    cartao_evento: false,
  });
  const [loading, setLoading] = useState(true);
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [busca, setBusca] = useState("");
  const [editorAberto, setEditorAberto] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const campanha = campanhas[tipoEnvio];
  const mensagemAtual = templates[tipoEnvio] || campanha.templatePadrao;
  const templateConfigurado = templatesConfigurados[tipoEnvio];

  async function carregarTudo(eventoPreferencialId?: string) {
    setLoading(true);

    const evento = await carregarEventos(eventoPreferencialId);

    if (evento) {
      await Promise.all([carregarConvidados(evento.id), carregarTemplates(evento.id)]);
    } else {
      setConvidados([]);
    }

    setLoading(false);
  }

  async function carregarEventos(eventoPreferencialId?: string) {
    const { data, error } = await supabase
      .from("eventos")
      .select("id, nome")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return null;
    }

    const lista = (data || []) as Evento[];
    setEventos(lista);

    if (lista.length === 0) {
      setEventoAtual(null);
      return null;
    }

    const eventoEscolhido =
      lista.find((evento) => evento.id === eventoPreferencialId) ||
      (eventoAtual?.id ? lista.find((evento) => evento.id === eventoAtual.id) : null) ||
      lista[0];

    setEventoAtual(eventoEscolhido);
    return eventoEscolhido;
  }

  async function trocarEvento(eventoId: string) {
    const evento = eventos.find((item) => item.id === eventoId);

    if (!evento) return;

    setEventoAtual(evento);
    setLoading(true);
    setBusca("");
    setFiltroStatus("a_enviar");
    setPreviewId(null);

    await Promise.all([carregarConvidados(evento.id), carregarTemplates(evento.id)]);

    setLoading(false);
  }

  async function carregarConvidados(eventoId: string) {
    const { data, error } = await supabase
      .from("convidados")
      .select(`
        id,
        nome,
        telefone,
        email,
        grupo,
        status_rsvp,
        status_checkin,
        token,
        status_envio_convite,
        data_envio_convite,
        status_envio_lembrete_rsvp,
        data_envio_lembrete_rsvp,
        status_envio_cartao,
        data_envio_cartao
      `)
      .eq("evento_id", eventoId)
      .order("grupo", { ascending: true, nullsFirst: false })
      .order("telefone", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar convidados: " + error.message);
      return;
    }

    setConvidados((data || []) as Convidado[]);
  }

  async function carregarTemplates(eventoId: string) {
    const { data, error } = await supabase
      .from("envio_templates")
      .select("evento_id, tipo_envio, mensagem, ativo")
      .eq("evento_id", eventoId)
      .eq("ativo", true);

    if (error) {
      console.warn("Templates ainda não configurados:", error.message);
      return;
    }

    const novosTemplates: Record<TipoEnvio, string> = {
      convite: campanhas.convite.templatePadrao,
      lembrete_rsvp: campanhas.lembrete_rsvp.templatePadrao,
      cartao_evento: campanhas.cartao_evento.templatePadrao,
    };

    const novosConfigurados: Record<TipoEnvio, boolean> = {
      convite: false,
      lembrete_rsvp: false,
      cartao_evento: false,
    };

    (data || []).forEach((template) => {
      const tipo = template.tipo_envio as TipoEnvio;
      if (tipo in novosTemplates) {
        novosTemplates[tipo] = template.mensagem || campanhas[tipo].templatePadrao;
        novosConfigurados[tipo] = true;
      }
    });

    setTemplates(novosTemplates);
    setTemplatesConfigurados(novosConfigurados);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    setFiltroStatus("a_enviar");
    setBusca("");
    setPreviewId(null);
  }, [tipoEnvio]);

  const publicoCampanha = useMemo(() => {
    return convidados.filter((convidado) => campanha.filtrarPublico(convidado));
  }, [convidados, campanha]);

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return publicoCampanha.filter((convidado) => {
      const telefoneLimpo = normalizarTelefone(convidado.telefone);
      const enviado = getStatusEnvio(convidado, campanha) === "enviado";

      const buscaOk =
        !termo ||
        [convidado.nome, convidado.grupo, convidado.telefone, convidado.email, convidado.token]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      if (!buscaOk) return false;

      if (filtroStatus === "todos") return true;
      if (filtroStatus === "a_enviar") return !enviado && !!telefoneLimpo;
      if (filtroStatus === "enviados") return enviado;
      if (filtroStatus === "sem_telefone") return !telefoneLimpo;

      return true;
    });
  }, [publicoCampanha, busca, filtroStatus, campanha]);

  const convidadoPreview = useMemo(() => {
    if (previewId) {
      return convidados.find((convidado) => convidado.id === previewId) || convidadosFiltrados[0] || publicoCampanha[0];
    }

    return convidadosFiltrados[0] || publicoCampanha[0];
  }, [previewId, convidados, convidadosFiltrados, publicoCampanha]);

  const previewMensagem = convidadoPreview
    ? montarMensagem(mensagemAtual, convidadoPreview, eventoAtual)
    : mensagemAtual;

  const stats = useMemo(() => {
    const total = publicoCampanha.length;
    const enviados = publicoCampanha.filter((c) => getStatusEnvio(c, campanha) === "enviado").length;
    const semTelefone = publicoCampanha.filter((c) => !normalizarTelefone(c.telefone)).length;
    const aEnviar = publicoCampanha.filter(
      (c) => getStatusEnvio(c, campanha) !== "enviado" && !!normalizarTelefone(c.telefone)
    ).length;

    return { total, enviados, aEnviar, semTelefone };
  }, [publicoCampanha, campanha]);

  async function salvarTemplate() {
    if (!eventoAtual?.id) {
      alert("Selecione ou carregue um evento antes de salvar a mensagem.");
      return;
    }

    setSalvandoTemplate(true);

    const { error } = await supabase.from("envio_templates").upsert(
      {
        evento_id: eventoAtual.id,
        tipo_envio: tipoEnvio,
        titulo: campanha.titulo,
        mensagem: mensagemAtual,
        ativo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "evento_id,tipo_envio" }
    );

    setSalvandoTemplate(false);

    if (error) {
      alert("Erro ao salvar mensagem: " + error.message);
      return;
    }

    setTemplatesConfigurados((current) => ({
      ...current,
      [tipoEnvio]: true,
    }));

    alert("Mensagem salva com sucesso.");
  }

  function restaurarTemplatePadrao() {
    if (!window.confirm("Restaurar a mensagem padrão desta campanha?")) return;

    setTemplates((current) => ({
      ...current,
      [tipoEnvio]: campanha.templatePadrao,
    }));
  }

  function inserirVariavel(variavel: string) {
    setTemplates((current) => ({
      ...current,
      [tipoEnvio]: `${current[tipoEnvio] || ""}${current[tipoEnvio]?.endsWith(" ") ? "" : " "}${variavel}`,
    }));
  }

  async function marcarComoEnviado(convidado: Convidado) {
    const agora = new Date().toISOString();

    const payload = {
      [campanha.statusColumn]: "enviado",
      [campanha.dataColumn]: agora,
    };

    const { error } = await supabase.from("convidados").update(payload).eq("id", convidado.id);

    if (error) {
      alert("Erro ao marcar como enviado: " + error.message);
      return;
    }

    setConvidados((current) =>
      current.map((item) =>
        item.id === convidado.id
          ? {
              ...item,
              [campanha.statusColumn]: "enviado",
              [campanha.dataColumn]: agora,
            }
          : item
      )
    );

    await registrarHistoricoEnvio(convidado, "enviado", "Marcado manualmente como enviado.");
  }

  async function registrarHistoricoEnvio(
    convidado: Convidado,
    status: "pendente" | "enviado" | "erro",
    detalhe?: string
  ) {
    if (!eventoAtual?.id) return;

    await supabase.from("envio_historico").insert({
      evento_id: eventoAtual.id,
      convidado_id: convidado.id,
      tipo_envio: tipoEnvio,
      canal: "whatsapp",
      telefone: normalizarTelefone(convidado.telefone),
      mensagem: montarMensagem(mensagemAtual, convidado, eventoAtual),
      status,
      detalhe: detalhe || null,
    });
  }

  async function adicionarFilaEnvio(convidado: Convidado) {
    if (!eventoAtual?.id) {
      alert("Selecione um evento antes de adicionar à fila.");
      return;
    }

    const telefone = normalizarTelefone(convidado.telefone);

    if (!telefone) {
      alert("Este convidado não tem telefone cadastrado.");
      return;
    }

    const { error } = await supabase.from("envio_fila").insert({
      evento_id: eventoAtual.id,
      convidado_id: convidado.id,
      tipo_envio: tipoEnvio,
      canal: "whatsapp",
      telefone,
      mensagem: montarMensagem(mensagemAtual, convidado, eventoAtual),
      status: "pendente",
    });

    if (error) {
      alert("Erro ao adicionar à fila: " + error.message);
      return;
    }

    await registrarHistoricoEnvio(convidado, "pendente", "Adicionado à fila de envio.");
    alert("Convidado adicionado à fila de envio.");
  }

  function abrirWhatsApp(convidado: Convidado) {
    const telefone = normalizarTelefone(convidado.telefone);

    if (!telefone) {
      alert("Este convidado não tem telefone cadastrado.");
      return;
    }

    const mensagem = montarMensagem(mensagemAtual, convidado, eventoAtual);
    const link = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;

    registrarHistoricoEnvio(convidado, "pendente", "WhatsApp aberto para envio manual.");
    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function copiarMensagem(convidado: Convidado) {
    await navigator.clipboard.writeText(montarMensagem(mensagemAtual, convidado, eventoAtual));
    alert("Mensagem copiada.");
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .envio-card {
          transition:
            transform 170ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease,
            border-color 170ms ease,
            background 170ms ease;
        }

        .envio-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(15,23,42,0.07);
          border-color: rgba(109,40,217,0.2);
          background: #f8fafc;
        }

        .envio-action:active,
        .template-chip:active {
          transform: scale(0.97);
        }

        button:focus-visible,
        a:focus-visible,
        textarea:focus-visible,
        input:focus-visible {
          outline: 3px solid rgba(109,40,217,0.22);
          outline-offset: 3px;
        }

        @media (max-width: 900px) {
          .envios-editor-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>OmniStage Envios</span>
          <h1 style={titleStyle}>Central de envios</h1>
          <p style={subtitleStyle}>
            Organize campanhas de WhatsApp por etapa do evento e personalize as mensagens por cliente.
            {eventoAtual?.nome ? ` Evento: ${eventoAtual.nome}.` : ""}
          </p>
        </div>

        <button onClick={() => carregarTudo(eventoAtual?.id)} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar lista"}
        </button>
      </section>

      <section style={eventSelectorPanelStyle}>
        <div>
          <label style={fieldLabelStyle}>Evento selecionado</label>
          <p style={panelTextStyle}>
            Escolha o evento para carregar a fila de convidados e os templates de mensagem.
          </p>
        </div>

        <select
          value={eventoAtual?.id || ""}
          onChange={(event) => trocarEvento(event.target.value)}
          style={eventSelectStyle}
        >
          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nome || "Evento sem nome"}
            </option>
          ))}
        </select>
      </section>

      <section style={campaignSelectorStyle}>
        {Object.values(campanhas).map((item) => {
          const active = tipoEnvio === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setTipoEnvio(item.key)}
              style={{
                ...campaignButtonStyle,
                ...(active
                  ? {
                      background: item.cor,
                      color: "#fff",
                      border: `1px solid ${item.cor}`,
                    }
                  : {}),
              }}
            >
              <strong>{item.titulo}</strong>
              <span>{item.subtitulo}</span>
            </button>
          );
        })}
      </section>

      <section
        style={{
          ...campaignHeaderStyle,
          borderColor: campanha.corSuave,
          background: `linear-gradient(135deg, ${campanha.corSuave}, #ffffff)`,
        }}
      >
        <div>
          <h2 style={panelTitleStyle}>{campanha.titulo}</h2>
          <p style={panelTextStyle}>{campanha.descricao}</p>
        </div>

        <div style={campaignHeaderActionsStyle}>
          <button onClick={() => setEditorAberto((current) => !current)} style={secondaryButtonStyle}>
            {editorAberto ? "Ocultar editor" : "Editar mensagem"}
          </button>

          <span
            style={{
              ...campaignBadgeStyle,
              background: campanha.corSuave,
              color: campanha.cor,
            }}
          >
            {stats.aEnviar} a enviar
          </span>
        </div>
      </section>

      {editorAberto && (
        <section style={templatePanelStyle}>
          <div style={templateHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Editor profissional de mensagem</h2>
              <p style={panelTextStyle}>
                Configure a mensagem desta campanha. Use variáveis para personalizar automaticamente.
              </p>
            </div>

            <div style={templateActionsStyle}>
              <button onClick={restaurarTemplatePadrao} style={ghostButtonStyle}>
                Restaurar padrão
              </button>

              <button onClick={salvarTemplate} style={primaryButtonStyle}>
                {salvandoTemplate ? "Salvando..." : "Salvar mensagem"}
              </button>
            </div>
          </div>

          {!templateConfigurado && (
            <div style={templateWarningStyle}>
              <strong>Mensagem ainda não configurada pelo cliente.</strong>
              <span>
                O sistema está mostrando um modelo padrão. Ao clicar em “Salvar mensagem”,
                o template será criado automaticamente no Supabase para esta campanha.
              </span>
            </div>
          )}

          <div className="envios-editor-grid" style={editorGridStyle}>
            <div style={editorColumnStyle}>
              <label style={fieldLabelStyle}>Mensagem da campanha</label>

              <textarea
                value={mensagemAtual}
                onChange={(event) =>
                  setTemplates((current) => ({
                    ...current,
                    [tipoEnvio]: event.target.value,
                  }))
                }
                style={textareaStyle}
                rows={14}
              />

              <div style={variablesBoxStyle}>
                <strong style={variablesTitleStyle}>Variáveis disponíveis</strong>
                <div style={variablesListStyle}>
                  {variaveis.map((item) => (
                    <button
                      key={item.key}
                      className="template-chip"
                      onClick={() => inserirVariavel(item.key)}
                      style={chipStyle}
                      title={item.description}
                    >
                      {item.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={previewColumnStyle}>
              <div style={previewHeaderStyle}>
                <div>
                  <label style={fieldLabelStyle}>Prévia ao vivo</label>
                  <p style={previewHelpStyle}>
                    {convidadoPreview
                      ? `Usando ${convidadoPreview.nome || "convidado sem nome"} como exemplo.`
                      : "Nenhum convidado disponível para prévia."}
                  </p>
                </div>

                {convidadosFiltrados.length > 0 && (
                  <select
                    value={convidadoPreview?.id || ""}
                    onChange={(event) => setPreviewId(event.target.value)}
                    style={previewSelectStyle}
                  >
                    {convidadosFiltrados.slice(0, 80).map((convidado) => (
                      <option key={convidado.id} value={convidado.id}>
                        {convidado.nome || "Sem nome"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={phonePreviewStyle}>
                <div style={phoneTopStyle}>WhatsApp</div>
                <div style={messageBubbleStyle}>{previewMensagem}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section style={statsGridStyle}>
        <MetricCard label="Público da campanha" value={stats.total} detail="Convidados elegíveis" />
        <MetricCard label="A enviar" value={stats.aEnviar} detail="Com telefone e não enviado" />
        <MetricCard label="Enviados" value={stats.enviados} detail="Já marcados como enviados" />
        <MetricCard label="Sem telefone" value={stats.semTelefone} detail="Precisam revisão" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Fila de envio</h2>
            <p style={panelTextStyle}>
              Abra o WhatsApp, envie a mensagem configurada e depois marque como enviado.
            </p>
          </div>

          <span style={counterStyle}>{convidadosFiltrados.length} itens</span>
        </div>

        <div style={tabsStyle}>
          {[
            { key: "a_enviar", label: "A enviar" },
            { key: "enviados", label: "Enviados" },
            { key: "sem_telefone", label: "Sem telefone" },
            { key: "todos", label: "Todos" },
          ].map((tab) => {
            const active = filtroStatus === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setFiltroStatus(tab.key as FiltroStatusEnvio)}
                style={active ? tabActiveStyle : tabStyle}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={searchRowStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, grupo, telefone, e-mail ou token"
            style={searchInputStyle}
          />
        </div>

        <div style={listStyle}>
          {convidadosFiltrados.map((convidado) => {
            const telefoneOk = !!normalizarTelefone(convidado.telefone);
            const enviado = getStatusEnvio(convidado, campanha) === "enviado";
            const dataEnvio = getDataEnvio(convidado, campanha);

            return (
              <article key={convidado.id} className="envio-card" style={cardStyle}>
                <div style={guestInfoStyle}>
                  <strong style={guestNameStyle}>{convidado.nome || "Sem nome"}</strong>
                  <span style={guestMetaStyle}>
                    {convidado.grupo || "Sem grupo"} · {convidado.telefone || "Sem telefone"}
                  </span>

                  <p style={messagePreviewStyle}>{montarMensagem(mensagemAtual, convidado, eventoAtual)}</p>

                  {dataEnvio && (
                    <small style={sentDateStyle}>
                      Enviado em {formatarData(dataEnvio)}
                    </small>
                  )}
                </div>

                <div style={actionsStyle}>
                  <span style={enviado ? sentBadgeStyle : pendingBadgeStyle}>
                    {enviado ? "Enviado" : "A enviar"}
                  </span>

                  <button
                    className="envio-action"
                    onClick={() => abrirWhatsApp(convidado)}
                    disabled={!telefoneOk}
                    style={
                      telefoneOk
                        ? whatsappButtonStyle
                        : { ...whatsappButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                    }
                  >
                    WhatsApp
                  </button>

                  <button
                    className="envio-action"
                    onClick={() => copiarMensagem(convidado)}
                    style={secondaryButtonStyle}
                  >
                    Copiar mensagem
                  </button>

                  <button
                    className="envio-action"
                    onClick={() => adicionarFilaEnvio(convidado)}
                    disabled={!telefoneOk}
                    style={
                      telefoneOk
                        ? filaButtonStyle
                        : { ...filaButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                    }
                  >
                    Adicionar à fila
                  </button>

                  <button
                    className="envio-action"
                    onClick={() => marcarComoEnviado(convidado)}
                    disabled={enviado}
                    style={
                      enviado
                        ? { ...secondaryButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                        : secondaryButtonStyle
                    }
                  >
                    Marcar enviado
                  </button>
                </div>
              </article>
            );
          })}

          {!loading && convidadosFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum convidado encontrado com estes filtros.</div>
          )}
        </div>
      </section>
    </div>
  );
}

const campanhas: Record<TipoEnvio, Campanha> = {
  convite: {
    key: "convite",
    titulo: "1. Envio do convite",
    subtitulo: "Primeiro contato",
    descricao:
      "Envio inicial do convite digital para todos os convidados com telefone.",
    statusColumn: "status_envio_convite",
    dataColumn: "data_envio_convite",
    cor: "#6d28d9",
    corSuave: "#ede9fe",
    filtrarPublico: (convidado) => !!normalizarTelefone(convidado.telefone),
    templatePadrao: `Olá {{nome}} ✨

Você está convidado(a) para o evento {{evento}}.

Acesse seu convite digital:
{{link_convite}}

Por lá você poderá confirmar sua presença.

Com carinho,
OmniStage`,
  },

  lembrete_rsvp: {
    key: "lembrete_rsvp",
    titulo: "2. Confirmação pendente",
    subtitulo: "Lembrete RSVP",
    descricao:
      "Lembrete para convidados que ainda estão com RSVP pendente.",
    statusColumn: "status_envio_lembrete_rsvp",
    dataColumn: "data_envio_lembrete_rsvp",
    cor: "#f59e0b",
    corSuave: "#fef3c7",
    filtrarPublico: (convidado) =>
      convidado.status_rsvp === "pendente" && !!normalizarTelefone(convidado.telefone),
    templatePadrao: `Olá {{nome}} ✨

Passando para lembrar que você ainda não confirmou presença no evento {{evento}}.

Para confirmar, acesse seu convite digital:
{{link_convite}}

Sua confirmação é muito importante para organizarmos tudo com carinho.

Com carinho,
OmniStage`,
  },

  cartao_evento: {
    key: "cartao_evento",
    titulo: "3. Cartão do evento",
    subtitulo: "Entrada / QR Code",
    descricao:
      "Envio do cartão de entrada para convidados confirmados.",
    statusColumn: "status_envio_cartao",
    dataColumn: "data_envio_cartao",
    cor: "#16a34a",
    corSuave: "#dcfce7",
    filtrarPublico: (convidado) =>
      convidado.status_rsvp === "confirmado" && !!normalizarTelefone(convidado.telefone),
    templatePadrao: `Olá {{nome}} ✨

Ficamos muito felizes com sua confirmação.

Segue seu cartão de entrada para o evento {{evento}}:
{{link_cartao}}

Apresente este cartão na entrada.

Com carinho,
OmniStage`,
  },
};

const variaveis = [
  { key: "{{nome}}", description: "Nome do convidado" },
  { key: "{{grupo}}", description: "Grupo ou família do convidado" },
  { key: "{{evento}}", description: "Nome do evento" },
  { key: "{{nome_evento}}", description: "Nome do evento" },
  { key: "{{telefone}}", description: "Telefone cadastrado" },
  { key: "{{email}}", description: "E-mail cadastrado" },
  { key: "{{token}}", description: "Token do convite/cartão" },
  { key: "{{link_convite}}", description: "Link do convite digital" },
  { key: "{{link_cartao}}", description: "Link do cartão de entrada" },
];

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article style={metricCardStyle}>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={metricValueStyle}>{value}</strong>
      <p style={metricDetailStyle}>{detail}</p>
    </article>
  );
}

function getStatusEnvio(convidado: Convidado, campanha: Campanha) {
  return convidado[campanha.statusColumn] as string | null | undefined;
}

function getDataEnvio(convidado: Convidado, campanha: Campanha) {
  return convidado[campanha.dataColumn] as string | null | undefined;
}

function normalizarTelefone(telefone: string | null | undefined) {
  return (telefone || "").replace(/\D/g, "");
}

function gerarLinkConvite(convidado: Convidado) {
  const token = encodeURIComponent(convidado.token || "");
  if (typeof window === "undefined") return `/c/${token}`;
  return `${window.location.origin}/c/${token}`;
}

function gerarLinkCartao(convidado: Convidado) {
  const nome = encodeURIComponent(convidado.nome || "");
  const token = encodeURIComponent(convidado.token || "");
  return `https://omnistageproducoes.com.br/valentinaxv/cartao/?nome=${nome}&token=${token}`;
}

function montarMensagem(template: string, convidado: Convidado, evento?: Evento | null) {
  const nomeEvento = evento?.nome || "";

  return template
    .replaceAll("{{nome}}", convidado.nome || "")
    .replaceAll("{{grupo}}", convidado.grupo || "")
    .replaceAll("{{evento}}", nomeEvento)
    .replaceAll("{{nome_evento}}", nomeEvento)
    .replaceAll("{{telefone}}", convidado.telefone || "")
    .replaceAll("{{email}}", convidado.email || "")
    .replaceAll("{{token}}", convidado.token || "")
    .replaceAll("{{link_convite}}", gerarLinkConvite(convidado))
    .replaceAll("{{link_cartao}}", gerarLinkCartao(convidado));
}

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ===== Styles ===== */

const pageStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const heroStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, boxShadow: "0 18px 50px rgba(15,23,42,0.06)", flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { color: "#6d28d9", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" };
const titleStyle: React.CSSProperties = { margin: "8px 0 8px", fontSize: 34, fontWeight: 900, color: "var(--text)" };
const subtitleStyle: React.CSSProperties = { margin: 0, color: "var(--muted)", fontSize: 16 };
const primaryButtonStyle: React.CSSProperties = { border: "none", background: "#6d28d9", color: "#fff", padding: "13px 18px", borderRadius: 14, fontWeight: 900, cursor: "pointer" };
const eventSelectorPanelStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 22,
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
};

const eventSelectStyle: React.CSSProperties = {
  minWidth: 280,
  flex: "0 1 420px",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "#fff",
  color: "var(--text)",
  fontWeight: 900,
  outline: "none",
};

const campaignSelectorStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const campaignButtonStyle: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", padding: 16, borderRadius: 18, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 5, fontWeight: 900, boxShadow: "0 10px 30px rgba(15,23,42,0.04)" };
const campaignHeaderStyle: React.CSSProperties = { border: "1px solid", borderRadius: 22, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" };
const campaignHeaderActionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const campaignBadgeStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 900 };
const templatePanelStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 22, padding: 24, boxShadow: "0 14px 40px rgba(15,23,42,0.05)" };
const templateHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 18 };
const templateActionsStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const templateWarningStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 18,
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(245,158,11,0.28)",
  background: "#fffbeb",
  color: "#92400e",
  fontSize: 13,
  fontWeight: 750,
};

const editorGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(280px, 1.05fr) minmax(280px, 0.95fr)", gap: 18 };
const editorColumnStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const previewColumnStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const fieldLabelStyle: React.CSSProperties = { color: "var(--text)", fontSize: 13, fontWeight: 900 };
const textareaStyle: React.CSSProperties = { width: "100%", minHeight: 300, resize: "vertical", border: "1px solid var(--line)", borderRadius: 16, padding: 14, background: "#ffffff", color: "var(--text)", fontSize: 14, lineHeight: 1.5, outline: "none", fontFamily: "Arial, Helvetica, sans-serif" };
const variablesBoxStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 16, padding: 14, background: "#f8fafc" };
const variablesTitleStyle: React.CSSProperties = { display: "block", marginBottom: 10, color: "var(--text)", fontSize: 13 };
const variablesListStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const chipStyle: React.CSSProperties = { border: "1px solid rgba(109,40,217,0.18)", background: "#ede9fe", color: "#6d28d9", padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, cursor: "pointer" };
const previewHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" };
const previewHelpStyle: React.CSSProperties = { margin: "5px 0 0", color: "var(--muted)", fontSize: 12, fontWeight: 700 };
const previewSelectStyle: React.CSSProperties = { border: "1px solid var(--line)", background: "#fff", color: "var(--text)", borderRadius: 12, padding: "10px 12px", fontWeight: 800 };
const phonePreviewStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 22, padding: 16, background: "linear-gradient(180deg, #f8fafc, #eef2f7)", minHeight: 350 };
const phoneTopStyle: React.CSSProperties = { color: "#166534", fontWeight: 900, marginBottom: 14 };
const messageBubbleStyle: React.CSSProperties = { background: "#dcfce7", color: "#14532d", borderRadius: "18px 18px 18px 6px", padding: 14, whiteSpace: "pre-line", lineHeight: 1.45, fontSize: 14, boxShadow: "0 10px 25px rgba(15,23,42,0.06)" };
const statsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 };
const metricCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "0 14px 40px rgba(15,23,42,0.05)" };
const metricLabelStyle: React.CSSProperties = { margin: 0, color: "var(--muted)", fontSize: 14, fontWeight: 800 };
const metricValueStyle: React.CSSProperties = { display: "block", marginTop: 8, fontSize: 36, fontWeight: 900, color: "var(--text)" };
const metricDetailStyle: React.CSSProperties = { margin: "8px 0 0", color: "var(--muted)", fontSize: 13 };
const panelStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 22, padding: 24, boxShadow: "0 14px 40px rgba(15,23,42,0.05)" };
const panelHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const panelTitleStyle: React.CSSProperties = { margin: 0, fontSize: 20, fontWeight: 900, color: "var(--text)" };
const panelTextStyle: React.CSSProperties = { margin: "6px 0 0", color: "var(--muted)" };
const counterStyle: React.CSSProperties = { padding: "9px 13px", borderRadius: 999, background: "rgba(109,40,217,0.08)", color: "#6d28d9", fontSize: 13, fontWeight: 900 };
const tabsStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 };
const tabStyle: React.CSSProperties = { padding: "9px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
const tabActiveStyle: React.CSSProperties = { ...tabStyle, background: "#6d28d9", color: "#fff", border: "1px solid #6d28d9" };
const searchRowStyle: React.CSSProperties = { display: "flex", gap: 10, marginTop: 16 };
const searchInputStyle: React.CSSProperties = { flex: 1, minWidth: 260, padding: 13, borderRadius: 14, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", outline: "none" };
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 };
const cardStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 18, background: "rgba(255,255,255,0.78)", padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" };
const guestInfoStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 280 };
const guestNameStyle: React.CSSProperties = { color: "var(--text)", fontSize: 17, fontWeight: 900 };
const guestMetaStyle: React.CSSProperties = { color: "var(--muted)", fontSize: 13, fontWeight: 700 };
const messagePreviewStyle: React.CSSProperties = { margin: "10px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-line" };
const sentDateStyle: React.CSSProperties = { marginTop: 8, color: "var(--muted)", fontWeight: 800 };
const actionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" };
const whatsappButtonStyle: React.CSSProperties = { border: "none", background: "#16a34a", color: "#fff", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const filaButtonStyle: React.CSSProperties = { border: "1px solid rgba(37,99,235,0.24)", background: "#dbeafe", color: "#1d4ed8", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { border: "1px solid rgba(109,40,217,0.24)", background: "#ede9fe", color: "#6d28d9", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const ghostButtonStyle: React.CSSProperties = { border: "1px solid var(--line)", background: "transparent", color: "var(--text)", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const pendingBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 900 };
const sentBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 900 };
const emptyStyle: React.CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed var(--line)", color: "var(--muted)" };
