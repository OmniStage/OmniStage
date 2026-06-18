"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type TipoEnvio = "save_the_date" | "convite" | "lembrete_rsvp" | "lembrete_evento" | "cartao_evento";
type FiltroStatusEnvio =
  | "a_enviar"
  | "na_fila"
  | "enviados"
  | "com_erro"
  | "card_convidado"
  | "sem_telefone"
  | "todos";

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  responsavel?: string | null;
  responsavel_telefone?: string | null;
  crianca?: boolean | string | number | null;
  email?: string | null;
  grupo: string | null;
  status_rsvp: string | null;
  status_checkin?: string | null;
  token?: string | null;
  tipo_convite?: string | null;
  origem_importacao?: string | null;
  import_batch_id?: string | null;
  legacy_id?: string | number | null;
  status_envio?: string | null;
  data_hora_envio?: string | null;
  contato_principal?: boolean | null;
  recebe_convite?: boolean | null;
  principal_nucleo_nome?: string | null;
  principal_nucleo_telefone?: string | null;

  status_envio_save_the_date?: string | null;
  data_envio_save_the_date?: string | null;

  status_envio_convite?: string | null;
  data_envio_convite?: string | null;

  status_envio_lembrete_rsvp?: string | null;
  data_envio_lembrete_rsvp?: string | null;

  status_envio_lembrete_evento?: string | null;
  data_envio_lembrete_evento?: string | null;

  status_envio_cartao?: string | null;
  data_envio_cartao?: string | null;
};

type Evento = {
  id: string;
  nome: string | null;
  tenant_id: string | null;
};

type PrincipalNucleoEnvio = {
  nome: string | null;
  telefone: string | null;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type ItemFila = {
  id?: string;
  convidado_id: string | null;
  tipo_envio: string;
  status: string;
  erro?: string | null;
  agendado_para?: string | null;
};

type CampanhaEnvioRegistro = {
  id: string;
  evento_id: string;
  tenant_id: string | null;
  tipo_envio: TipoEnvio;
  nome: string | null;
  mensagem: string | null;
  midia_url: string | null;
  midia_bucket: string | null;
  midia_path: string | null;
  midia_tipo: string | null;
  midia_nome: string | null;
  midia_tamanho_bytes?: number | null;
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

const ENVIO_MIDIA_BUCKET = "convites";
const CAMPAIGN_ASSETS_BUCKET = "campaign-assets";
const ENVIO_MIDIA_MAX_SIZE_MB = 20;

export default function EnviosPage() {
  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio>("convite");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusEnvio>("a_enviar");
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [templates, setTemplates] = useState<Record<TipoEnvio, string>>({
    save_the_date: campanhas.save_the_date.templatePadrao,
    convite: campanhas.convite.templatePadrao,
    lembrete_rsvp: campanhas.lembrete_rsvp.templatePadrao,
    lembrete_evento: campanhas.lembrete_evento.templatePadrao,
    cartao_evento: campanhas.cartao_evento.templatePadrao,
  });
  const [templatesConfigurados, setTemplatesConfigurados] = useState<Record<TipoEnvio, boolean>>({
    save_the_date: false,
    convite: false,
    lembrete_rsvp: false,
    lembrete_evento: false,
    cartao_evento: false,
  });
  const [loading, setLoading] = useState(true);
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [busca, setBusca] = useState("");
  const [editorAberto, setEditorAberto] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [processandoMassa, setProcessandoMassa] = useState(false);
  const [disparandoFila, setDisparandoFila] = useState(false);

  type ModalAgendamento = {
    aberto: boolean;
    lista: Convidado[];
    dataHora: string;
    agendar: boolean;
  };
  const [modalAgendamento, setModalAgendamento] = useState<ModalAgendamento>({
    aberto: false,
    lista: [],
    dataHora: "",
    agendar: false,
  });

  type ProgressoEnvio = {
    total: number;
    atual: number;
    nomeAtual: string;
    telefoneAtual: string;
    enviados: number;
    erros: number;
    ativo: boolean;
    cancelado: boolean;
  };

  const [progresso, setProgresso] = useState<ProgressoEnvio | null>(null);
  const cancelarEnvioRef = useRef(false);
  const [filaEnvios, setFilaEnvios] = useState<ItemFila[]>([]);
  const [envioPendenteConfirmacao, setEnvioPendenteConfirmacao] = useState<Convidado | null>(null);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const [cancelandoEnvioId, setCancelandoEnvioId] = useState<string | null>(null);
  const [midiasCampanha, setMidiasCampanha] = useState<Record<TipoEnvio, string>>({
    save_the_date: "",
    convite: "",
    lembrete_rsvp: "",
    lembrete_evento: "",
    cartao_evento: "",
  });
  const [campanhasEnvioIds, setCampanhasEnvioIds] = useState<Record<TipoEnvio, string>>({
    save_the_date: "",
    convite: "",
    lembrete_rsvp: "",
    lembrete_evento: "",
    cartao_evento: "",
  });
  const [statusMidiaUltimoEnvio, setStatusMidiaUltimoEnvio] = useState<
    "copiada" | "url_copiada" | "erro" | "sem_midia" | null
  >(null);
  const [uploadingMidia, setUploadingMidia] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(message: string, type: Toast["type"] = "info") {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4500);
  }

  const campanha = campanhas[tipoEnvio];
  const mensagemAtual = templates[tipoEnvio] || campanha.templatePadrao;
  const midiaAtual = (midiasCampanha[tipoEnvio] || "").trim();
  const templateConfigurado = templatesConfigurados[tipoEnvio];

  async function carregarTudo(eventoPreferencialId?: string) {
    setLoading(true);

    const evento = await carregarEventos(eventoPreferencialId);

    if (evento) {
      await Promise.all([
        carregarConvidados(evento.id, evento.tenant_id),
        carregarTemplatesECampanhas(evento.id, evento.tenant_id),
        carregarFila(evento.id),
      ]);
    } else {
      setConvidados([]);
      setFilaEnvios([]);
    }

    setLoading(false);
  }

  async function carregarEventos(eventoPreferencialId?: string) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      toast("Usuário não autenticado. Faça login novamente para carregar os eventos.", "error");
      setEventos([]);
      setEventoAtual(null);
      return null;
    }

    const { data: membro, error: membroError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .in("status", ["ativo", "active", "aprovado"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membroError || !membro?.tenant_id) {
      toast("Não foi possível identificar o cliente vinculado a este usuário.", "error");
      setEventos([]);
      setEventoAtual(null);
      return null;
    }

    const { data, error } = await supabase
      .from("eventos")
      .select("id, nome, tenant_id")
      .eq("tenant_id", membro.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      toast("Erro ao carregar eventos: " + error.message, "error");
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

    await Promise.all([
      carregarConvidados(evento.id, evento.tenant_id),
      carregarTemplatesECampanhas(evento.id, evento.tenant_id),
      carregarFila(evento.id),
    ]);

    setLoading(false);
  }

  async function carregarConvidados(eventoId: string, tenantId?: string | null) {
    const { data, error } = await supabase
      .from("convidados")
      .select(`
        id,
        nome,
        telefone,
        responsavel,
        responsavel_telefone,
        crianca,
        email,
        grupo,
        status_rsvp,
        status_checkin,
        token,
        tipo_convite,
        origem_importacao,
        import_batch_id,
        legacy_id,
        status_envio,
        data_hora_envio,
        contato_principal,
        recebe_convite,
        status_envio_save_the_date,
        data_envio_save_the_date,
        status_envio_convite,
        data_envio_convite,
        status_envio_lembrete_rsvp,
        data_envio_lembrete_rsvp,
        status_envio_lembrete_evento,
        data_envio_lembrete_evento,
        status_envio_cartao,
        data_envio_cartao
      `)
      .eq("evento_id", eventoId)
      .order("grupo", { ascending: true, nullsFirst: false })
      .order("telefone", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) {
      toast("Erro ao carregar convidados: " + error.message, "error");
      return;
    }

    const listaConvidados = (data || []) as Convidado[];
    const principaisPorGrupo = await carregarPrincipaisNucleoEnvio(tenantId, listaConvidados);

    setConvidados(
      listaConvidados.map((convidado) => {
        const grupo = String(convidado.grupo || "").trim();
        const principal = grupo ? principaisPorGrupo[grupo] : null;

        if (!principal) return convidado;

        return {
          ...convidado,
          principal_nucleo_nome: principal.nome,
          principal_nucleo_telefone: principal.telefone,
        };
      })
    );
  }

  async function carregarPrincipaisNucleoEnvio(tenantId: string | null | undefined, listaConvidados: Convidado[]) {
    const grupos = Array.from(
      new Set(
        listaConvidados
          .map((convidado) => String(convidado.grupo || "").trim())
          .filter(Boolean)
      )
    );

    if (!tenantId || grupos.length === 0) {
      return {} as Record<string, PrincipalNucleoEnvio>;
    }

    const { data: nucleos, error: nucleosError } = await supabase
      .from("contato_grupos")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .in("nome", grupos);

    if (nucleosError || !nucleos?.length) {
      if (nucleosError) console.warn("Erro ao carregar núcleos para envio:", nucleosError.message);
      return {} as Record<string, PrincipalNucleoEnvio>;
    }

    const idsNucleos = nucleos.map((nucleo) => nucleo.id).filter(Boolean);

    if (idsNucleos.length === 0) {
      return {} as Record<string, PrincipalNucleoEnvio>;
    }

    const { data: membros, error: membrosError } = await supabase
      .from("contato_grupo_membros")
      .select("grupo_contato_id, tenant_contato_id, recebe_comunicacao, principal_envio")
      .eq("tenant_id", tenantId)
      .in("grupo_contato_id", idsNucleos)
      .eq("principal_envio", true);

    if (membrosError || !membros?.length) {
      if (membrosError) console.warn("Erro ao carregar principais dos núcleos para envio:", membrosError.message);
      return {} as Record<string, PrincipalNucleoEnvio>;
    }

    const idsContatos = Array.from(
      new Set(membros.map((membro) => membro.tenant_contato_id).filter(Boolean))
    );

    if (idsContatos.length === 0) {
      return {} as Record<string, PrincipalNucleoEnvio>;
    }

    const { data: contatos, error: contatosError } = await supabase
      .from("tenant_contatos")
      .select("id, nome, telefone, telefone_normalizado")
      .eq("tenant_id", tenantId)
      .in("id", idsContatos);

    if (contatosError || !contatos?.length) {
      if (contatosError) console.warn("Erro ao carregar contatos principais para envio:", contatosError.message);
      return {} as Record<string, PrincipalNucleoEnvio>;
    }

    const nucleosPorId = new Map(nucleos.map((nucleo) => [nucleo.id, String(nucleo.nome || "").trim()]));
    const contatosPorId = new Map(contatos.map((contato) => [contato.id, contato]));

    const principaisPorGrupo: Record<string, PrincipalNucleoEnvio> = {};

    membros.forEach((membro) => {
      if (membro.recebe_comunicacao === false) return;

      const grupo = nucleosPorId.get(membro.grupo_contato_id);
      const contato = contatosPorId.get(membro.tenant_contato_id);

      if (!grupo || !contato) return;

      const telefone = normalizarTelefone(contato.telefone || contato.telefone_normalizado);

      if (!telefone || principaisPorGrupo[grupo]) return;

      principaisPorGrupo[grupo] = {
        nome: contato.nome || null,
        telefone,
      };
    });

    return principaisPorGrupo;
  }

  async function carregarFila(eventoId: string) {
    const { data, error } = await supabase
      .from("envio_fila")
      .select("id, convidado_id, tipo_envio, status, erro, agendado_para")
      .eq("evento_id", eventoId);

    if (error) {
      console.error("Erro ao carregar fila:", error.message);
      setFilaEnvios([]);
      return;
    }

    setFilaEnvios((data || []) as ItemFila[]);
  }

  async function carregarTemplatesECampanhas(eventoId: string, tenantId?: string | null) {
    const { data: templatesData, error: templatesError } = await supabase
      .from("envio_templates")
      .select("evento_id, tipo_envio, mensagem, ativo, midia_url, midia_bucket, midia_path, midia_tipo, midia_nome, midia_tamanho_bytes")
      .eq("evento_id", eventoId)
      .eq("ativo", true);

    if (templatesError) {
      console.warn("Templates ainda não configurados:", templatesError.message);
    }

    const novosTemplates: Record<TipoEnvio, string> = {
      save_the_date: campanhas.save_the_date.templatePadrao,
      convite: campanhas.convite.templatePadrao,
      lembrete_rsvp: campanhas.lembrete_rsvp.templatePadrao,
      lembrete_evento: campanhas.lembrete_evento.templatePadrao,
      cartao_evento: campanhas.cartao_evento.templatePadrao,
    };

    const novosConfigurados: Record<TipoEnvio, boolean> = {
      save_the_date: false,
      convite: false,
      lembrete_rsvp: false,
      lembrete_evento: false,
      cartao_evento: false,
    };

    const midiasTemplateLegado: Record<TipoEnvio, {
      midia_url?: string | null;
      midia_bucket?: string | null;
      midia_path?: string | null;
      midia_tipo?: string | null;
      midia_nome?: string | null;
      midia_tamanho_bytes?: number | null;
    }> = {
      save_the_date: {},
      convite: {},
      lembrete_rsvp: {},
      lembrete_evento: {},
      cartao_evento: {},
    };

    (templatesData || []).forEach((template) => {
      const tipo = template.tipo_envio as TipoEnvio;
      if (tipo in novosTemplates) {
        novosTemplates[tipo] = template.mensagem || campanhas[tipo].templatePadrao;
        novosConfigurados[tipo] = true;
        midiasTemplateLegado[tipo] = {
          midia_url: template.midia_url || null,
          midia_bucket: template.midia_bucket || null,
          midia_path: template.midia_path || null,
          midia_tipo: template.midia_tipo || null,
          midia_nome: template.midia_nome || null,
          midia_tamanho_bytes: template.midia_tamanho_bytes || null,
        };
      }
    });

    const novasMidias: Record<TipoEnvio, string> = {
      save_the_date: "",
      convite: "",
      lembrete_rsvp: "",
      lembrete_evento: "",
      cartao_evento: "",
    };

    const novosIds: Record<TipoEnvio, string> = {
      save_the_date: "",
      convite: "",
      lembrete_rsvp: "",
      lembrete_evento: "",
      cartao_evento: "",
    };

    const { data: campanhasData, error: campanhasError } = await supabase
      .from("envio_campanhas")
      .select("id, evento_id, tenant_id, tipo_envio, nome, mensagem, midia_url, midia_bucket, midia_path, midia_tipo, midia_nome, midia_tamanho_bytes")
      .eq("evento_id", eventoId)
      .eq("ativo", true)
      .order("criado_em", { ascending: true });

    if (campanhasError) {
      console.warn("Campanhas de envio ainda não configuradas:", campanhasError.message);
    }

    const campanhasPorTipo = new Map<TipoEnvio, CampanhaEnvioRegistro>();

    ((campanhasData || []) as CampanhaEnvioRegistro[]).forEach((campanhaRegistro) => {
      const tipo = campanhaRegistro.tipo_envio as TipoEnvio;
      if (tipo in novasMidias && !campanhasPorTipo.has(tipo)) {
        campanhasPorTipo.set(tipo, campanhaRegistro);
      }
    });

    const tipos = Object.keys(campanhas) as TipoEnvio[];

    for (const tipo of tipos) {
      let campanhaRegistro = campanhasPorTipo.get(tipo);

      if (!campanhaRegistro) {
        const { data: criada, error: criarError } = await supabase
          .from("envio_campanhas")
          .insert({
            evento_id: eventoId,
            tenant_id: tenantId || null,
            tipo_envio: tipo,
            nome: campanhas[tipo].titulo,
            mensagem: novosTemplates[tipo] || campanhas[tipo].templatePadrao,
            midia_url: midiasTemplateLegado[tipo]?.midia_url || null,
            midia_bucket: midiasTemplateLegado[tipo]?.midia_bucket || null,
            midia_path: midiasTemplateLegado[tipo]?.midia_path || null,
            midia_tipo: midiasTemplateLegado[tipo]?.midia_tipo || null,
            midia_nome: midiasTemplateLegado[tipo]?.midia_nome || null,
            midia_tamanho_bytes: midiasTemplateLegado[tipo]?.midia_tamanho_bytes || null,
            ativo: true,
          })
          .select("id, evento_id, tenant_id, tipo_envio, nome, mensagem, midia_url, midia_bucket, midia_path, midia_tipo, midia_nome, midia_tamanho_bytes")
          .single();

        if (criarError) {
          console.warn(`Não foi possível criar campanha padrão para ${tipo}:`, criarError.message);
        } else if (criada) {
          campanhaRegistro = criada as CampanhaEnvioRegistro;
        }
      }

      if (campanhaRegistro?.id) {
        const midiaLegado = midiasTemplateLegado[tipo];
        const deveMigrarMidiaLegado = !campanhaRegistro.midia_url && !!midiaLegado?.midia_url;

        novosIds[tipo] = campanhaRegistro.id;
        novasMidias[tipo] = campanhaRegistro.midia_url || midiaLegado?.midia_url || "";

        if (deveMigrarMidiaLegado) {
          await supabase
            .from("envio_campanhas")
            .update({
              midia_url: midiaLegado.midia_url || null,
              midia_bucket: midiaLegado.midia_bucket || null,
              midia_path: midiaLegado.midia_path || null,
              midia_tipo: midiaLegado.midia_tipo || null,
              midia_nome: midiaLegado.midia_nome || null,
              midia_tamanho_bytes: midiaLegado.midia_tamanho_bytes || null,
              atualizado_em: new Date().toISOString(),
            })
            .eq("id", campanhaRegistro.id);
        }

        if (campanhaRegistro.mensagem && !novosConfigurados[tipo]) {
          novosTemplates[tipo] = campanhaRegistro.mensagem;
          novosConfigurados[tipo] = true;
        }
      }
    }

    setTemplates(novosTemplates);
    setTemplatesConfigurados(novosConfigurados);
    setMidiasCampanha(novasMidias);
    setCampanhasEnvioIds(novosIds);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    setFiltroStatus("a_enviar");
    setBusca("");
    setPreviewId(null);
    setSelecionados({});
  }, [tipoEnvio]);

  const publicoCampanha = useMemo(() => {
    return convidados.filter((convidado) => {
      const confirmadoSemEnvioConvite = isConfirmadoSemEnvioConvite(convidado, campanha);

      return (
        deveAparecerNoModuloEnvios(convidado, campanha, convidados) &&
        (confirmadoSemEnvioConvite || deveEntrarNoPublicoCampanha(convidado, campanha, convidados))
      );
    });
  }, [convidados, campanha]);

  const convidadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return publicoCampanha.filter((convidado) => {
      const statusAtual = getStatusEnvio(convidado, campanha);
      const confirmadoSemEnvioConvite = isConfirmadoSemEnvioConvite(convidado, campanha);
      const enviado = isEnvioConsideradoEnviado(convidado, campanha);
      const enviadoCardConvidado = statusAtual === "enviado_manual" || confirmadoSemEnvioConvite;
      const estaNaFila = convidadoEstaNaFila(filaEnvios, convidado.id, tipoEnvio);
      const telefoneLimpo = getTelefoneEnvio(convidado, convidados);

      const buscaOk =
        !termo ||
        [
          convidado.nome,
          convidado.grupo,
          convidado.telefone,
          convidado.responsavel,
          convidado.responsavel_telefone,
          convidado.email,
          convidado.token,
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      if (!buscaOk) return false;

      if (filtroStatus === "todos") return true;
      if (filtroStatus === "a_enviar") {
        return deveAparecerEmAEnviar(convidado, campanha, filaEnvios, tipoEnvio, convidados);
      }
      if (filtroStatus === "na_fila") return estaNaFila && !enviado;
      if (filtroStatus === "enviados") return enviado;
      if (filtroStatus === "com_erro") return filaEnvios.some((f) => f.convidado_id === convidado.id && f.tipo_envio === tipoEnvio && f.status === "erro");
      if (filtroStatus === "card_convidado") return enviadoCardConvidado;
      if (filtroStatus === "sem_telefone") return !telefoneLimpo;

      return true;
    });
  }, [publicoCampanha, busca, filtroStatus, campanha, filaEnvios, tipoEnvio, convidados]);

  const convidadosSelecionados = useMemo(() => {
    return convidadosFiltrados.filter((convidado) => selecionados[convidado.id]);
  }, [convidadosFiltrados, selecionados]);

  const todosFiltradosSelecionados =
    convidadosFiltrados.length > 0 &&
    convidadosFiltrados.every((convidado) => selecionados[convidado.id]);

  const pendentesComTelefoneFiltrados = useMemo(() => {
    return convidadosFiltrados.filter((convidado) => {
      const telefoneOk = !!getTelefoneEnvio(convidado, convidados);
      const enviado = isEnvioConsideradoEnviado(convidado, campanha);
      const confirmadoSemEnvioConvite = isConfirmadoSemEnvioConvite(convidado, campanha);
      const estaNaFila = convidadoEstaNaFila(filaEnvios, convidado.id, tipoEnvio);
      return deveAparecerEmAEnviar(convidado, campanha, filaEnvios, tipoEnvio, convidados);
    });
  }, [convidadosFiltrados, campanha, filaEnvios, tipoEnvio]);

  const convidadoPreview = useMemo(() => {
    if (previewId) {
      return convidados.find((convidado) => convidado.id === previewId) || convidadosFiltrados[0] || publicoCampanha[0];
    }

    return convidadosFiltrados[0] || publicoCampanha[0];
  }, [previewId, convidados, convidadosFiltrados, publicoCampanha]);

  const previewMensagem = convidadoPreview
    ? montarMensagem(mensagemAtual, convidadoPreview, eventoAtual, convidados)
    : mensagemAtual;

  const stats = useMemo(() => {
    const total = publicoCampanha.length;
    const enviados = publicoCampanha.filter((c) => isEnvioConsideradoEnviado(c, campanha)).length;
    const enviadosCardConvidado = publicoCampanha.filter((c) => {
      const statusAtual = getStatusEnvio(c, campanha);
      return statusAtual === "enviado_manual" || isConfirmadoSemEnvioConvite(c, campanha);
    }).length;
    const semTelefone = publicoCampanha.filter((c) => !getTelefoneEnvio(c, convidados)).length;
    const naFila = publicoCampanha.filter((c) => convidadoEstaNaFila(filaEnvios, c.id, tipoEnvio)).length;
    const aEnviar = publicoCampanha.filter((c) =>
      deveAparecerEmAEnviar(c, campanha, filaEnvios, tipoEnvio, convidados)
    ).length;
    const comErro = filaEnvios.filter((f) => f.tipo_envio === tipoEnvio && f.status === "erro").length;

    return { total, enviados, enviadosCardConvidado, aEnviar, semTelefone, naFila, comErro };
  }, [publicoCampanha, campanha, filaEnvios, tipoEnvio, convidados]);

  async function salvarTemplate() {
    if (!eventoAtual?.id) {
      toast("Selecione ou carregue um evento antes de salvar a mensagem.", "warning");
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

    if (error) {
      setSalvandoTemplate(false);
      toast("Erro ao salvar mensagem: " + error.message, "error");
      return;
    }

    const campanhaId = await garantirCampanhaEnvioAtual();

    if (campanhaId) {
      const { error: campanhaError } = await supabase
        .from("envio_campanhas")
        .update({
          mensagem: mensagemAtual,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", campanhaId);

      if (campanhaError) {
        setSalvandoTemplate(false);
        toast("Mensagem salva no template, mas houve erro ao atualizar a campanha: " + campanhaError.message, "warning");
        return;
      }
    }

    setSalvandoTemplate(false);

    setTemplatesConfigurados((current) => ({
      ...current,
      [tipoEnvio]: true,
    }));

    toast("Mensagem salva com sucesso.", "success");
  }

  function restaurarTemplatePadrao() {
    if (!window.confirm("Restaurar a mensagem padrão desta campanha?")) return;

    setTemplates((current) => ({
      ...current,
      [tipoEnvio]: campanha.templatePadrao,
    }));
  }

  function toggleSelecionado(convidadoId: string) {
    setSelecionados((current) => ({
      ...current,
      [convidadoId]: !current[convidadoId],
    }));
  }

  function toggleSelecionarTodosFiltrados() {
    if (todosFiltradosSelecionados) {
      setSelecionados({});
      return;
    }

    const novoMapa: Record<string, boolean> = {};

    convidadosFiltrados.forEach((convidado) => {
      novoMapa[convidado.id] = true;
    });

    setSelecionados(novoMapa);
  }

  function adicionarListaNaFila(lista: Convidado[]) {
    if (!eventoAtual?.id) {
      toast("Selecione um evento antes de adicionar à fila.", "warning");
      return;
    }

    if (!eventoAtual.tenant_id) {
      toast("Este evento está sem tenant_id. Atualize o cadastro do evento antes de adicionar à fila.", "warning");
      return;
    }

    const elegiveis = lista.filter((convidado) =>
      deveAparecerEmAEnviar(convidado, campanha, filaEnvios, tipoEnvio, convidados)
    );

    if (elegiveis.length === 0) {
      toast("Nenhum convidado elegível para adicionar à fila.", "warning");
      return;
    }

    const dataHoje = new Date().toISOString().slice(0, 10);

    setModalAgendamento({ aberto: true, lista: elegiveis, dataHora: dataHoje, agendar: false });
  }

  async function confirmarAdicionarFila() {
    if (!eventoAtual?.id || !eventoAtual.tenant_id) return;

    const { lista, agendar, dataHora } = modalAgendamento;
    // Converte data escolhida para 09:00 horário de Brasília (UTC-3)
    const agendadoPara = agendar && dataHora
      ? new Date(`${dataHora}T09:00:00-03:00`).toISOString()
      : null;

    setModalAgendamento((m) => ({ ...m, aberto: false }));
    setProcessandoMassa(true);

    const linhas = lista.map((convidado) => ({
      tenant_id: eventoAtual.tenant_id,
      evento_id: eventoAtual.id,
      convidado_id: convidado.id,
      tipo_envio: tipoEnvio,
      canal: "whatsapp",
      telefone: getTelefoneEnvio(convidado, convidados),
      mensagem: montarMensagem(mensagemAtual, convidado, eventoAtual, convidados),
      status: agendadoPara ? "agendado" : "pendente",
      agendado_para: agendadoPara,
    }));

    const { error } = await supabase.from("envio_fila").insert(linhas);

    if (error) {
      setProcessandoMassa(false);
      toast("Erro ao adicionar envios à fila: " + error.message, "error");
      return;
    }

    const historico = lista.map((convidado) => ({
      evento_id: eventoAtual.id,
      convidado_id: convidado.id,
      tipo_envio: tipoEnvio,
      canal: "whatsapp",
      telefone: getTelefoneEnvio(convidado, convidados),
      mensagem: montarMensagem(mensagemAtual, convidado, eventoAtual, convidados),
      status: "pendente",
      detalhe: agendadoPara
        ? `Agendado para ${new Date(agendadoPara).toLocaleString("pt-BR")}.`
        : "Adicionado à fila por ação em massa.",
    }));

    await supabase.from("envio_historico").insert(historico);
    await carregarFila(eventoAtual.id);

    setSelecionados({});
    setProcessandoMassa(false);
    toast(
      agendadoPara
        ? `${lista.length} envio(s) agendados para ${new Date(agendadoPara).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.`
        : `${lista.length} envio(s) adicionados à fila.`,
      "success"
    );
  }

  async function dispararFila() {
    if (disparandoFila) return;
    if (!eventoAtual?.id) return;

    // Buscar itens pendentes com nome do convidado
    const { data: itensFila, error: filaError } = await supabase
      .from("envio_fila")
      .select("id, telefone, convidado_id, tipo_envio")
      .eq("evento_id", eventoAtual.id)
      .in("status", ["pendente", "agendado"])
      .order("created_at", { ascending: true });

    if (filaError || !itensFila || itensFila.length === 0) {
      toast("Nenhum envio na fila para disparar.", "warning");
      return;
    }

    // Buscar nomes dos convidados
    const ids = itensFila.map((i) => i.convidado_id).filter(Boolean);
    const { data: convidadosNomes } = await supabase
      .from("convidados")
      .select("id, nome")
      .in("id", ids);

    const nomesPorId: Record<string, string> = {};
    (convidadosNomes || []).forEach((c) => { nomesPorId[c.id] = c.nome || "Sem nome"; });

    if (!confirm(`Disparar ${itensFila.length} envio(s) via WhatsApp agora?\n\nO processo pode levar alguns minutos. Não feche esta janela.`)) return;

    cancelarEnvioRef.current = false;
    setDisparandoFila(true);
    setProgresso({ total: itensFila.length, atual: 0, nomeAtual: "", telefoneAtual: "", enviados: 0, erros: 0, ativo: true, cancelado: false });

    let enviados = 0;
    let erros = 0;

    for (let i = 0; i < itensFila.length; i++) {
      if (cancelarEnvioRef.current) {
        setProgresso((p) => p ? { ...p, ativo: false, cancelado: true } : null);
        break;
      }

      const item = itensFila[i];
      const nome = nomesPorId[item.convidado_id] || item.telefone || "Convidado";

      setProgresso((p) => p ? { ...p, atual: i + 1, nomeAtual: nome, telefoneAtual: item.telefone || "" } : null);

      try {
        const res = await fetch("/api/envios/processar-um", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Erro desconhecido");
        enviados++;
        setProgresso((p) => p ? { ...p, enviados } : null);
      } catch (err: any) {
        erros++;
        setProgresso((p) => p ? { ...p, erros } : null);
      }

      // Delay aleatório entre 12 e 25 segundos (exceto no último)
      if (i < itensFila.length - 1 && !cancelarEnvioRef.current) {
        const delay = 12000 + Math.random() * 13000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setProgresso((p) => p ? { ...p, ativo: false } : null);
    setDisparandoFila(false);
    if (eventoAtual?.id) await carregarFila(eventoAtual.id);
  }

  function inserirVariavel(variavel: string) {
    const textarea = document.getElementById("editor-mensagem") as HTMLTextAreaElement | null;
    const textoAtual = templates[tipoEnvio] || "";

    if (!textarea) {
      setTemplates((current) => ({
        ...current,
        [tipoEnvio]: `${textoAtual}${textoAtual.endsWith(" ") || textoAtual.length === 0 ? "" : " "}${variavel}`,
      }));
      return;
    }

    const inicio = textarea.selectionStart ?? textoAtual.length;
    const fim = textarea.selectionEnd ?? textoAtual.length;

    const novoTexto =
      textoAtual.substring(0, inicio) +
      variavel +
      textoAtual.substring(fim);

    setTemplates((current) => ({
      ...current,
      [tipoEnvio]: novoTexto,
    }));

    window.setTimeout(() => {
      textarea.focus();
      const novaPosicao = inicio + variavel.length;
      textarea.selectionStart = novaPosicao;
      textarea.selectionEnd = novaPosicao;
    }, 0);
  }

  async function marcarComoEnviado(convidado: Convidado) {
    const agora = new Date().toISOString();
    const convidadosRepresentados = getConvidadosRepresentadosNoCard(convidado, convidados);
    const convidadosParaAtualizar = convidadosRepresentados.length > 0 ? convidadosRepresentados : [convidado];
    const idsParaAtualizar = Array.from(new Set(convidadosParaAtualizar.map((item) => item.id)));

    const payload = {
      [campanha.statusColumn]: "enviado",
      [campanha.dataColumn]: agora,
    };

    const { error } = await supabase.from("convidados").update(payload).in("id", idsParaAtualizar);

    if (error) {
      toast("Erro ao marcar como enviado: " + error.message, "error");
      return;
    }

    setConvidados((current) =>
      current.map((item) =>
        idsParaAtualizar.includes(item.id)
          ? {
              ...item,
              [campanha.statusColumn]: "enviado",
              [campanha.dataColumn]: agora,
            }
          : item
      )
    );

    if (eventoAtual?.id) {
      await supabase
        .from("envio_fila")
        .update({
          status: "enviado",
          processado_em: agora,
          updated_at: agora,
        })
        .eq("evento_id", eventoAtual.id)
        .in("convidado_id", idsParaAtualizar)
        .eq("tipo_envio", tipoEnvio)
        .eq("status", "pendente");

      await carregarFila(eventoAtual.id);
    }

    await Promise.all(
      convidadosParaAtualizar.map((item) =>
        registrarHistoricoEnvio(
          item,
          "enviado",
          item.id === convidado.id
            ? "Marcado manualmente como enviado."
            : `Marcado como enviado junto do card agrupado de ${convidado.nome || "convidado"}.`
        )
      )
    );
  }

  async function removerDaFila(convidado: Convidado) {
    if (!eventoAtual?.id) return;

    const confirmar = window.confirm(
      `Retirar ${convidado.nome || "este convidado"} da fila de envio?`
    );

    if (!confirmar) return;

    const agora = new Date().toISOString();

    const { error } = await supabase
      .from("envio_fila")
      .update({
        status: "cancelado",
        erro: "Removido manualmente da fila pelo operador.",
        updated_at: agora,
      })
      .eq("evento_id", eventoAtual.id)
      .eq("convidado_id", convidado.id)
      .eq("tipo_envio", tipoEnvio)
      .eq("status", "pendente");

    if (error) {
      toast("Erro ao retirar da fila: " + error.message, "error");
      return;
    }

    setFilaEnvios((current) =>
      current.filter(
        (item) =>
          !(
            item.convidado_id === convidado.id &&
            item.tipo_envio === tipoEnvio &&
            item.status === "pendente"
          ),
      ),
    );

    await carregarFila(eventoAtual.id);

    await registrarHistoricoEnvio(
      convidado,
      "pendente",
      "Convidado removido manualmente da fila de envio."
    );
  }

  async function tentarNovamente(convidado: Convidado) {
    if (!eventoAtual?.id) return;

    const { error } = await supabase
      .from("envio_fila")
      .update({ status: "pendente", erro: null, processado_em: null })
      .eq("evento_id", eventoAtual.id)
      .eq("convidado_id", convidado.id)
      .eq("tipo_envio", tipoEnvio)
      .eq("status", "erro");

    if (error) {
      toast("Erro ao recolocar na fila: " + error.message, "error");
      return;
    }

    await carregarFila(eventoAtual.id);
    toast(`${convidado.nome || "Convidado"} recolocado na fila`, "success");
  }

  async function cancelarEnvioConfirmado(convidado: Convidado) {
    if (!eventoAtual?.id) return;

    const confirmar = window.confirm(
      `Cancelar o envio marcado para ${convidado.nome || "este convidado"}? Ele voltará para pendente desta campanha.`
    );

    if (!confirmar) return;

    setCancelandoEnvioId(convidado.id);

    const payload = {
      [campanha.statusColumn]: "pendente",
      [campanha.dataColumn]: null,
    };

    const { error } = await supabase
      .from("convidados")
      .update(payload)
      .eq("id", convidado.id);

    if (error) {
      setCancelandoEnvioId(null);
      toast("Erro ao cancelar envio: " + error.message, "error");
      return;
    }

    const agora = new Date().toISOString();

    await supabase
      .from("envio_fila")
      .update({
        status: "pendente",
        processado_em: null,
        updated_at: agora,
      })
      .eq("evento_id", eventoAtual.id)
      .eq("convidado_id", convidado.id)
      .eq("tipo_envio", tipoEnvio);

    setConvidados((current) =>
      current.map((item) =>
        item.id === convidado.id
          ? {
              ...item,
              [campanha.statusColumn]: "pendente",
              [campanha.dataColumn]: null,
            }
          : item
      )
    );

    await carregarFila(eventoAtual.id);
    await registrarHistoricoEnvio(
      convidado,
      "pendente",
      "Envio cancelado pelo operador e retornado para pendente."
    );

    setCancelandoEnvioId(null);
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
      telefone: getTelefoneEnvio(convidado, convidados),
      mensagem: montarMensagem(mensagemAtual, convidado, eventoAtual, convidados),
      status,
      detalhe: detalhe || null,
    });
  }

  async function adicionarFilaEnvio(convidado: Convidado) {
    if (!eventoAtual?.id) {
      toast("Selecione um evento antes de adicionar à fila.", "warning");
      return;
    }

    if (!eventoAtual.tenant_id) {
      toast("Este evento está sem tenant_id. Atualize o cadastro do evento antes de adicionar à fila.", "warning");
      return;
    }

    const telefone = getTelefoneEnvio(convidado, convidados);

    if (!telefone) {
      toast("Este convidado não tem telefone cadastrado.", "warning");
      return;
    }

    if (convidadoEstaNaFila(filaEnvios, convidado.id, tipoEnvio)) {
      toast("Este convidado já está na fila desta campanha.", "warning");
      return;
    }

    const dataHoje = new Date().toISOString().slice(0, 10);
    setModalAgendamento({ aberto: true, lista: [convidado], dataHora: dataHoje, agendar: false });
  }


  async function garantirCampanhaEnvioAtual() {
    if (!eventoAtual?.id) return null;

    const existente = campanhasEnvioIds[tipoEnvio];
    if (existente) return existente;

    const { data: existenteData, error: buscarError } = await supabase
      .from("envio_campanhas")
      .select("id")
      .eq("evento_id", eventoAtual.id)
      .eq("tipo_envio", tipoEnvio)
      .eq("ativo", true)
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (buscarError) {
      toast("Erro ao localizar campanha de envio: " + buscarError.message, "error");
      return null;
    }

    if (existenteData?.id) {
      setCampanhasEnvioIds((current) => ({ ...current, [tipoEnvio]: existenteData.id }));
      return existenteData.id as string;
    }

    const { data: criada, error: criarError } = await supabase
      .from("envio_campanhas")
      .insert({
        evento_id: eventoAtual.id,
        tenant_id: eventoAtual.tenant_id || null,
        tipo_envio: tipoEnvio,
        nome: campanha.titulo,
        mensagem: mensagemAtual,
        ativo: true,
      })
      .select("id")
      .single();

    if (criarError || !criada?.id) {
      toast("Erro ao criar campanha de envio: " + (criarError?.message || "campanha não retornada."), "error");
      return null;
    }

    setCampanhasEnvioIds((current) => ({ ...current, [tipoEnvio]: criada.id }));
    return criada.id as string;
  }

  async function salvarMidiaCampanha(params: {
    publicUrl: string;
    path?: string | null;
    file?: File | null;
  }) {
    const campanhaId = await garantirCampanhaEnvioAtual();

    if (!campanhaId) return false;

    const { error } = await supabase
      .from("envio_campanhas")
      .update({
        mensagem: mensagemAtual,
        midia_url: params.publicUrl || null,
        midia_bucket: params.publicUrl ? CAMPAIGN_ASSETS_BUCKET : null,
        midia_path: params.path || null,
        midia_tipo: params.file?.type || (params.publicUrl ? inferirMimeTypePorUrl(params.publicUrl) : null),
        midia_nome: params.file?.name || null,
        midia_tamanho_bytes: params.file?.size || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", campanhaId);

    if (error) {
      toast("Erro ao salvar a mídia da campanha: " + error.message, "error");
      return false;
    }

    setTemplatesConfigurados((current) => ({
      ...current,
      [tipoEnvio]: true,
    }));

    return true;
  }


  async function uploadMidiaCampanha(file: File | null) {
    if (!file) return;

    if (!eventoAtual?.id) {
      toast("Selecione um evento antes de fazer upload da mídia.", "warning");
      return;
    }

    if (!file.type.startsWith("image/") && file.type !== "video/mp4") {
      toast("Use uma imagem, GIF ou vídeo MP4 curto.", "warning");
      return;
    }

    const limiteBytes = ENVIO_MIDIA_MAX_SIZE_MB * 1024 * 1024;

    if (file.size > limiteBytes) {
      toast(`A mídia precisa ter no máximo ${ENVIO_MIDIA_MAX_SIZE_MB} MB.`, "warning");
      return;
    }

    setUploadingMidia(true);

    try {
      const campanhaId = await garantirCampanhaEnvioAtual();
      if (!campanhaId) return;

      const extensao = obterExtensaoArquivo(file.name, file.type);
      const tenantPath = normalizarSegmentoStorage(eventoAtual.tenant_id || "sem-tenant");
      const eventoPath = normalizarSegmentoStorage(eventoAtual.id);
      const pastaTipoEnvio = normalizarSegmentoStorage(tipoEnvio);
      const campanhaPath = normalizarSegmentoStorage(campanhaId);
      const nomeArquivo = `${Date.now()}-${normalizarNomeArquivo(file.name || `midia.${extensao}`)}`;
      const path = `${tenantPath}/${eventoPath}/${pastaTipoEnvio}/${campanhaPath}/${nomeArquivo}`;

      const { error: uploadError } = await supabase.storage
        .from(CAMPAIGN_ASSETS_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || inferirMimeTypePorUrl(file.name),
        });

      if (uploadError) {
        toast(`Erro ao fazer upload da mídia: ${uploadError.message}. Verifique se o bucket "${CAMPAIGN_ASSETS_BUCKET}" existe e está público no Supabase Storage.`, "error");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(CAMPAIGN_ASSETS_BUCKET)
        .getPublicUrl(path);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        toast("Upload concluído, mas não foi possível gerar a URL pública da mídia.", "warning");
        return;
      }

      const salvouMidia = await salvarMidiaCampanha({
        publicUrl,
        path,
        file,
      });

      if (!salvouMidia) return;

      setMidiasCampanha((current) => ({
        ...current,
        [tipoEnvio]: publicUrl,
      }));
    } finally {
      setUploadingMidia(false);
    }
  }

  async function removerMidiaCampanha() {
    if (!eventoAtual?.id) {
      setMidiasCampanha((current) => ({
        ...current,
        [tipoEnvio]: "",
      }));
      setStatusMidiaUltimoEnvio(null);
      return;
    }

    const confirmar = window.confirm("Remover a mídia desta campanha de envio?");

    if (!confirmar) return;

    const campanhaId = await garantirCampanhaEnvioAtual();

    if (!campanhaId) return;

    const { error } = await supabase
      .from("envio_campanhas")
      .update({
        midia_url: null,
        midia_bucket: null,
        midia_path: null,
        midia_tipo: null,
        midia_nome: null,
        midia_tamanho_bytes: null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", campanhaId);

    if (error) {
      toast("Erro ao remover mídia: " + error.message, "error");
      return;
    }

    setMidiasCampanha((current) => ({
      ...current,
      [tipoEnvio]: "",
    }));
    setStatusMidiaUltimoEnvio(null);
  }

  async function salvarUrlManualMidiaCampanha(url: string) {
    const publicUrl = url.trim();

    setMidiasCampanha((current) => ({
      ...current,
      [tipoEnvio]: publicUrl,
    }));

    if (!publicUrl) {
      await removerMidiaCampanha();
      return;
    }

    await salvarMidiaCampanha({
      publicUrl,
      path: null,
      file: null,
    });
  }

  async function copiarLinkMidiaCampanha() {
    if (!midiaAtual) {
      toast("Não existe mídia para copiar.", "warning");
      return;
    }

    await navigator.clipboard.writeText(midiaAtual);
    setStatusMidiaUltimoEnvio("url_copiada");
    toast("Link da mídia copiado.", "success");
  }

  function abrirMidiaCampanha() {
    if (!midiaAtual) {
      toast("Não existe mídia para abrir.", "warning");
      return;
    }

    window.open(midiaAtual, "_blank", "noopener,noreferrer");
  }

  async function copiarImagemEstaticaCampanha() {
    if (!midiaAtual) {
      toast("Não existe imagem para copiar.", "warning");
      return;
    }

    if (!isImagemEstaticaCopiavel(midiaAtual)) {
      toast("Use este botão apenas para imagem estática (.png, .jpg, .jpeg ou .webp). Para GIF/MP4, use Copiar link ou Abrir mídia.", "warning");
      return;
    }

    const campanhaId = campanhasEnvioIds[tipoEnvio];
    const status = await copiarMidiaParaClipboard(midiaAtual, campanhaId || undefined);
    setStatusMidiaUltimoEnvio(status);

    if (status === "copiada") {
      toast("Imagem copiada. Cole no WhatsApp com Ctrl+V ou Cmd+V.", "success");
    } else if (status === "url_copiada") {
      toast("Não foi possível copiar a imagem diretamente; o link foi copiado.", "warning");
    } else {
      toast("Não foi possível copiar a imagem.", "error");
    }
  }

  async function copiarMidiaParaClipboard(url: string, campanhaId?: string) {
    const midiaUrl = url.trim();

    if (!midiaUrl) return "sem_midia" as const;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard não disponível neste navegador.");
      }

      if (typeof ClipboardItem === "undefined") {
        await navigator.clipboard.writeText(midiaUrl);
        return "url_copiada" as const;
      }

      const proxyUrl = campanhaId
        ? `/api/campaign-assets/proxy?campanha_id=${encodeURIComponent(campanhaId)}`
        : midiaUrl;

      const headers: Record<string, string> = {};

      if (campanhaId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const response = await fetch(proxyUrl, { headers });

      if (!response.ok) {
        throw new Error("Não foi possível baixar a mídia para copiar.");
      }

      const blob = await response.blob();
      const mimeType = blob.type || inferirMimeTypePorUrl(midiaUrl);
      const arquivo = mimeType ? new Blob([blob], { type: mimeType }) : blob;

      await navigator.clipboard.write([
        new ClipboardItem({
          [arquivo.type || "image/png"]: arquivo,
        }),
      ]);

      return "copiada" as const;
    } catch (error) {
      try {
        await navigator.clipboard.writeText(midiaUrl);
        return "url_copiada" as const;
      } catch (clipboardError) {
        console.error("Erro ao copiar mídia para o WhatsApp", error, clipboardError);
        return "erro" as const;
      }
    }
  }

  async function abrirWhatsApp(convidado: Convidado, statusMidia?: "copiada" | "url_copiada" | "erro" | "sem_midia") {
    const telefone = getTelefoneEnvio(convidado, convidados);

    if (!telefone) {
      toast("Este convidado não tem telefone cadastrado.", "warning");
      return;
    }

    const mensagem = montarMensagem(mensagemAtual, convidado, eventoAtual, convidados);
    const link = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    const detalheMidia =
      statusMidia === "copiada"
        ? " Mídia copiada para colar manualmente no WhatsApp."
        : statusMidia === "url_copiada"
          ? " URL da mídia copiada para colar manualmente no WhatsApp."
          : statusMidia === "erro"
            ? " Não foi possível copiar a mídia automaticamente."
            : "";

    registrarHistoricoEnvio(convidado, "pendente", `WhatsApp aberto para envio manual.${detalheMidia}`);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function iniciarEnvioWhatsApp(convidado: Convidado) {
    const telefone = getTelefoneEnvio(convidado, convidados);

    if (!telefone) {
      toast("Este convidado não tem telefone cadastrado.", "warning");
      return;
    }

    const statusMidia = midiaAtual ? await copiarMidiaParaClipboard(midiaAtual, campanhasEnvioIds[tipoEnvio] || undefined) : "sem_midia";

    setStatusMidiaUltimoEnvio(statusMidia);
    await abrirWhatsApp(convidado, statusMidia);
    setEnvioPendenteConfirmacao(convidado);
  }

  async function confirmarEnvioWhatsApp() {
    if (!envioPendenteConfirmacao || confirmandoEnvio) return;

    setConfirmandoEnvio(true);
    await marcarComoEnviado(envioPendenteConfirmacao);
    setConfirmandoEnvio(false);
    setEnvioPendenteConfirmacao(null);
  }

  async function cancelarConfirmacaoEnvio() {
    if (envioPendenteConfirmacao) {
      await registrarHistoricoEnvio(
        envioPendenteConfirmacao,
        "erro",
        "Envio cancelado pelo operador após abrir o WhatsApp."
      );
    }

    setEnvioPendenteConfirmacao(null);
    setConfirmandoEnvio(false);
  }

  async function copiarMensagem(convidado: Convidado) {
    await navigator.clipboard.writeText(montarMensagem(mensagemAtual, convidado, eventoAtual, convidados));
    toast("Mensagem copiada.", "success");
  }

  return (
    <div style={pageStyle}>
      {modalAgendamento.aberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", width: 400, maxWidth: "92vw", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 600, color: "#111" }}>Agendar envio</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#666" }}>
              {modalAgendamento.lista.length === 1
                ? `1 convidado será adicionado à fila.`
                : `${modalAgendamento.lista.length} convidados serão adicionados à fila.`}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#111" }}>
                <input
                  type="radio"
                  name="agendamento"
                  checked={!modalAgendamento.agendar}
                  onChange={() => setModalAgendamento((m) => ({ ...m, agendar: false }))}
                  style={{ accentColor: "#6d28d9" }}
                />
                Enviar imediatamente
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#111" }}>
                <input
                  type="radio"
                  name="agendamento"
                  checked={modalAgendamento.agendar}
                  onChange={() => setModalAgendamento((m) => ({ ...m, agendar: true }))}
                  style={{ accentColor: "#6d28d9" }}
                />
                Agendar para um dia específico
              </label>

              {modalAgendamento.agendar && (
                <div style={{ marginLeft: 24, display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    type="date"
                    value={modalAgendamento.dataHora}
                    onChange={(e) => setModalAgendamento((m) => ({ ...m, dataHora: e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111", outline: "none" }}
                  />
                  <small style={{ color: "#6d28d9", fontSize: 12 }}>
                    Os envios serão distribuídos automaticamente a partir das 9h com 15s de intervalo entre cada mensagem.
                  </small>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setModalAgendamento((m) => ({ ...m, aberto: false }))}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", color: "#444" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAdicionarFila}
                disabled={modalAgendamento.agendar && !modalAgendamento.dataHora}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: modalAgendamento.agendar && !modalAgendamento.dataHora ? "#c4b5fd" : "#6d28d9",
                  color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500
                }}
              >
                {modalAgendamento.agendar ? "Agendar" : "Adicionar à fila"}
              </button>
            </div>
          </div>
        </div>
      )}

      {progresso && (
        <div style={progressoOverlayStyle}>
          <div style={progressoModalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ color: "#6d28d9", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {progresso.cancelado ? "Envio cancelado" : progresso.ativo ? "Enviando via WhatsApp..." : "Envio concluído"}
                </span>
                <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 900, color: "var(--text)" }}>
                  {progresso.cancelado
                    ? `Cancelado após ${progresso.enviados} envio(s)`
                    : progresso.ativo
                    ? `Enviando para ${progresso.nomeAtual}`
                    : `${progresso.enviados} mensagem(ns) enviada(s)`}
                </h2>
                {progresso.telefoneAtual && progresso.ativo && (
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14, fontWeight: 700 }}>
                    {progresso.telefoneAtual}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 15, fontWeight: 900, color: "var(--muted)", flexShrink: 0 }}>
                {progresso.atual} / {progresso.total}
              </span>
            </div>

            <div style={progressoBarBgStyle}>
              <div
                style={{
                  ...progressoBarFillStyle,
                  width: `${Math.round((progresso.atual / progresso.total) * 100)}%`,
                  background: progresso.cancelado ? "#dc2626" : progresso.ativo ? "#6d28d9" : "#16a34a",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12, fontSize: 14, fontWeight: 800 }}>
              <span style={{ color: "#16a34a" }}>✓ {progresso.enviados} enviados</span>
              {progresso.erros > 0 && <span style={{ color: "#dc2626" }}>✕ {progresso.erros} erros</span>}
              {progresso.ativo && !progresso.cancelado && (
                <span style={{ color: "var(--muted)" }}>
                  Aguardando intervalo seguro entre envios...
                </span>
              )}
            </div>

            {!progresso.ativo ? (
              <button
                onClick={() => { setProgresso(null); }}
                style={{ ...primaryButtonStyle, alignSelf: "flex-end" }}
              >
                Fechar
              </button>
            ) : (
              <button
                onClick={() => { cancelarEnvioRef.current = true; }}
                style={{ ...cancelButtonStyle, alignSelf: "flex-end" }}
              >
                Cancelar envio
              </button>
            )}
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div style={toastContainerStyle}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                ...toastBaseStyle,
                background:
                  t.type === "success" ? "#166534" :
                  t.type === "error" ? "#991b1b" :
                  t.type === "warning" ? "#78350f" :
                  "#1e3a8a",
              }}
            >
              <span style={{ flex: 1 }}>
                {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : t.type === "warning" ? "⚠ " : "ℹ "}
                {t.message}
              </span>
              <button
                onClick={() => setToasts((c) => c.filter((x) => x.id !== t.id))}
                style={toastCloseStyle}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

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
          background: var(--card-strong);
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

        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
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
          <h2 style={{ ...panelTitleStyle, color: "#0f172a" }}>{campanha.titulo}</h2>
          <p style={{ ...panelTextStyle, color: "#334155" }}>{campanha.descricao}</p>
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
                id="editor-mensagem"
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

              <div style={mediaBoxStyle}>
                <div>
                  <strong style={variablesTitleStyle}>Mídia da campanha</strong>
                  <p style={mediaHelpStyle}>
                    Faça upload da imagem/GIF do convite. Imagens PNG/JPG/WebP podem ser copiadas com controle por campanha; GIF/MP4 devem ser enviados por link ou abertos manualmente.
                  </p>
                </div>

                <div style={mediaUploadRowStyle}>
                  <label style={mediaUploadButtonStyle}>
                    {uploadingMidia ? "Enviando mídia..." : midiaAtual ? "Trocar mídia" : "Fazer upload da mídia"}
                    <input
                      type="file"
                      accept="image/*,video/mp4,.gif"
                      disabled={uploadingMidia}
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        event.target.value = "";
                        uploadMidiaCampanha(file);
                      }}
                      style={hiddenFileInputStyle}
                    />
                  </label>

                  {midiaAtual && (
                    <>
                      <button type="button" onClick={copiarLinkMidiaCampanha} style={mediaActionButtonStyle}>
                        Copiar link / GIF
                      </button>
                      <button type="button" onClick={abrirMidiaCampanha} style={mediaActionButtonStyle}>
                        Abrir mídia
                      </button>
                      {isImagemEstaticaCopiavel(midiaAtual) && (
                        <button type="button" onClick={copiarImagemEstaticaCampanha} style={mediaActionButtonStyle}>
                          Copiar imagem
                        </button>
                      )}
                      <button type="button" onClick={removerMidiaCampanha} style={mediaRemoveButtonStyle}>
                        Remover mídia
                      </button>
                    </>
                  )}
                </div>

                <input
                  value={midiasCampanha[tipoEnvio]}
                  onChange={(event) =>
                    setMidiasCampanha((current) => ({
                      ...current,
                      [tipoEnvio]: event.target.value,
                    }))
                  }
                  onBlur={(event) => salvarUrlManualMidiaCampanha(event.target.value)}
                  placeholder="URL pública da mídia após upload"
                  style={mediaInputStyle}
                />

                {midiaAtual && (
                  <div style={mediaPreviewBoxStyle}>
                    {midiaAtual.toLowerCase().split("?")[0].endsWith(".mp4") ? (
                      <video src={midiaAtual} controls muted style={mediaPreviewImageStyle} />
                    ) : (
                      <img src={midiaAtual} alt="Prévia da mídia da campanha" style={mediaPreviewImageStyle} />
                    )}
                    <span style={mediaPreviewTextStyle}>
                      PNG/JPG: use “Copiar imagem” para colar no WhatsApp. GIF/MP4: use “Copiar link / GIF” ou “Abrir mídia”, pois o WhatsApp pode colar GIF como imagem estática quando copiado pelo navegador.
                    </span>
                  </div>
                )}
              </div>

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
        <MetricCard label="A enviar" value={stats.aEnviar} detail="Com telefone, não enviado e fora da fila" />
        <MetricCard label="Na fila" value={stats.naFila} detail="Prontos para envio manual" />
        <MetricCard label="Enviados" value={stats.enviados} detail="Inclui manual, card e importados" />
        <MetricCard label="Card Convidado" value={stats.enviadosCardConvidado} detail="Enviados pelo card do convidado" />
        <MetricCard label="Sem telefone" value={stats.semTelefone} detail="Precisam revisão" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Fila de envio</h2>
            <p style={panelTextStyle}>
              Adicione convidados à fila, abra o WhatsApp, envie a mensagem configurada e depois marque como enviado.
            </p>
          </div>

          <span style={counterStyle}>{convidadosFiltrados.length} itens</span>
        </div>

        <div style={tabsStyle}>
          {[
            { key: "a_enviar", label: "A enviar" },
            { key: "na_fila", label: "Na fila" },
            { key: "enviados", label: "Enviados" },
            { key: "com_erro", label: `Com erro${stats.comErro > 0 ? ` (${stats.comErro})` : ""}` },
            { key: "card_convidado", label: "Card Convidado" },
            { key: "sem_telefone", label: "Sem telefone" },
            { key: "todos", label: "Todos" },
          ].map((tab) => {
            const active = filtroStatus === tab.key;
            const isErro = tab.key === "com_erro";

            return (
              <button
                key={tab.key}
                onClick={() => setFiltroStatus(tab.key as FiltroStatusEnvio)}
                style={
                  active
                    ? isErro
                      ? { ...tabActiveStyle, background: "#dc2626", border: "1px solid #dc2626" }
                      : tabActiveStyle
                    : isErro && stats.comErro > 0
                    ? { ...tabStyle, border: "1px solid rgba(220,38,38,0.4)", color: "#dc2626", background: "var(--red-soft)" }
                    : tabStyle
                }
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

        <div style={bulkBarStyle}>
          <label style={selectAllStyle}>
            <input
              type="checkbox"
              checked={todosFiltradosSelecionados}
              onChange={toggleSelecionarTodosFiltrados}
            />
            Selecionar todos da lista filtrada
          </label>

          <div style={bulkActionsStyle}>
            <span style={bulkCountStyle}>
              {convidadosSelecionados.length} selecionado(s)
            </span>

            <button
              className="envio-action"
              onClick={() => adicionarListaNaFila(convidadosSelecionados)}
              disabled={processandoMassa || convidadosSelecionados.length === 0}
              style={
                convidadosSelecionados.length === 0
                  ? { ...filaButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                  : filaButtonStyle
              }
            >
              {processandoMassa ? "Processando..." : "Adicionar selecionados à fila"}
            </button>

            <button
              className="envio-action"
              onClick={() => adicionarListaNaFila(pendentesComTelefoneFiltrados)}
              disabled={processandoMassa || pendentesComTelefoneFiltrados.length === 0}
              style={
                pendentesComTelefoneFiltrados.length === 0
                  ? { ...primaryButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                  : primaryButtonStyle
              }
            >
              Adicionar todos pendentes filtrados
            </button>

            <button
              className="envio-action"
              onClick={dispararFila}
              disabled={disparandoFila || filaEnvios.filter((f) => f.status === "pendente" || f.status === "agendado").length === 0}
              style={{
                ...primaryButtonStyle,
                background: disparandoFila ? "#666" : "#25D366",
                color: "#fff",
                opacity: filaEnvios.filter((f) => f.status === "pendente" || f.status === "agendado").length === 0 ? 0.45 : 1,
                cursor: filaEnvios.filter((f) => f.status === "pendente" || f.status === "agendado").length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {disparandoFila ? "Enviando..." : `Envio automático (${filaEnvios.filter((f) => f.status === "pendente" || f.status === "agendado").length} na fila)`}
            </button>
          </div>
        </div>

        <div style={listStyle}>
          {convidadosFiltrados.map((convidado) => {
            const telefoneOk = !!getTelefoneEnvio(convidado, convidados);
            const envioViaResponsavel = isEnvioViaResponsavel(convidado, convidados);
            const telefoneExibicao = getTelefoneEnvio(convidado, convidados);
            const statusAtual = getStatusEnvio(convidado, campanha);
            const envioImportado = isEnvioImportado(convidado, campanha);
            const enviado = isEnvioConsideradoEnviado(convidado, campanha);
            const confirmadoSemEnvioConvite = isConfirmadoSemEnvioConvite(convidado, campanha);
            const enviadoCardConvidado = statusAtual === "enviado_manual" || confirmadoSemEnvioConvite;
            const estaNaFila = convidadoEstaNaFila(filaEnvios, convidado.id, tipoEnvio);
            const itemNaFila = filaEnvios.find(
              (f) => f.convidado_id === convidado.id && f.tipo_envio === tipoEnvio && (f.status === "pendente" || f.status === "agendado")
            );
            const estaAgendado = itemNaFila?.status === "agendado";
            const dataAgendamento = itemNaFila?.agendado_para;
            const dataEnvio = getDataEnvio(convidado, campanha);
            const itemComErro = filaEnvios.find(
              (f) => f.convidado_id === convidado.id && f.tipo_envio === tipoEnvio && f.status === "erro"
            );

            return (
              <article key={convidado.id} className="envio-card" style={cardStyle}>
                <label style={rowCheckboxStyle}>
                  <input
                    type="checkbox"
                    checked={!!selecionados[convidado.id]}
                    onChange={() => toggleSelecionado(convidado.id)}
                  />
                </label>

                <div style={guestInfoStyle}>
                  <strong style={guestNameStyle}>{formatarTituloCardEnvio(convidado, convidados)}</strong>
                  <span style={guestMetaStyle}>
                    {convidado.grupo || "Sem grupo"} · {telefoneExibicao || "Sem telefone"}
                  </span>

                  {envioViaResponsavel && (
                    <span style={responsavelBadgeStyle}>
                      Envio via responsável: {convidado.responsavel || getPrincipalNucleoEnvio(convidado, convidados)?.nome || "Responsável"}
                      {getConvidadosVinculadosAoResponsavel(convidado, convidados).length > 1
                        ? ` · ${getConvidadosVinculadosAoResponsavel(convidado, convidados).length} convidados vinculados`
                        : ""}
                    </span>
                  )}

                  <p style={messagePreviewStyle}>{montarMensagem(mensagemAtual, convidado, eventoAtual, convidados)}</p>

                  {dataEnvio && (
                    <small style={sentDateStyle}>
                      Enviado em {formatarData(dataEnvio)}
                    </small>
                  )}

                  {estaAgendado && dataAgendamento && (
                    <small style={{ color: "#7c3aed", fontSize: "0.78rem", marginTop: 4, display: "block" }}>
                      Agendado para {new Date(dataAgendamento).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </small>
                  )}

                  {itemComErro && (
                    <small style={{ color: "#dc2626", fontSize: "0.78rem", marginTop: 4, display: "block" }}>
                      ✕ Falha: {itemComErro.erro || "Erro desconhecido"}
                    </small>
                  )}
                </div>

                <div style={actionsStyle}>
                  <span
                    style={
                      itemComErro
                        ? { ...pendingBadgeStyle, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }
                        : envioImportado
                          ? sentImportedBadgeStyle
                          : enviadoCardConvidado
                            ? sentCardConvidadoBadgeStyle
                            : enviado
                              ? sentBadgeStyle
                            : estaAgendado
                              ? { ...filaBadgeStyle, background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd" }
                              : estaNaFila
                                ? filaBadgeStyle
                                : pendingBadgeStyle
                    }
                  >
                    {itemComErro
                      ? "Com erro"
                      : envioImportado
                        ? "Envio importado"
                        : enviadoCardConvidado
                          ? "Enviado Card Convidado"
                          : enviado
                            ? "Enviado"
                          : estaAgendado
                            ? "Agendado"
                          : estaNaFila
                            ? "Na fila"
                            : "A enviar"}
                  </span>

                  <button
                    className="envio-action"
                    onClick={() => iniciarEnvioWhatsApp(convidado)}
                    disabled={!telefoneOk}
                    style={
                      telefoneOk
                        ? estaNaFila
                          ? enviarFilaButtonStyle
                          : whatsappButtonStyle
                        : { ...whatsappButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                    }
                  >
                    {estaNaFila ? "Enviar WhatsApp" : "WhatsApp"}
                  </button>

                  <button
                    className="envio-action"
                    onClick={() => copiarMensagem(convidado)}
                    style={secondaryButtonStyle}
                  >
                    Copiar mensagem
                  </button>

                  {estaNaFila && !enviado ? (
                    <button
                      className="envio-action"
                      onClick={() => removerDaFila(convidado)}
                      style={removeFilaButtonStyle}
                    >
                      Retirar da fila
                    </button>
                  ) : (
                    <button
                      className="envio-action"
                      onClick={() => adicionarFilaEnvio(convidado)}
                      disabled={!telefoneOk || enviado}
                      style={
                        telefoneOk && !enviado
                          ? filaButtonStyle
                          : { ...filaButtonStyle, opacity: 0.45, cursor: "not-allowed" }
                      }
                    >
                      Adicionar à fila
                    </button>
                  )}

                  {enviado ? (
                    <button
                      className="envio-action"
                      onClick={() => cancelarEnvioConfirmado(convidado)}
                      disabled={cancelandoEnvioId === convidado.id}
                      style={
                        cancelandoEnvioId === convidado.id
                          ? { ...cancelButtonStyle, opacity: 0.55, cursor: "wait" }
                          : cancelButtonStyle
                      }
                    >
                      {cancelandoEnvioId === convidado.id ? "Cancelando..." : "Cancelar envio"}
                    </button>
                  ) : (
                    <button
                      className="envio-action"
                      onClick={() => marcarComoEnviado(convidado)}
                      style={secondaryButtonStyle}
                    >
                      Marcar enviado
                    </button>
                  )}

                  {itemComErro && (
                    <button
                      className="envio-action"
                      onClick={() => tentarNovamente(convidado)}
                      style={{ ...filaButtonStyle, background: "#dc2626", borderColor: "#dc2626" }}
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && convidadosFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum convidado encontrado com estes filtros.</div>
          )}
        </div>
      </section>

      {envioPendenteConfirmacao && (
        <div style={sendConfirmOverlayStyle}>
          <div style={sendConfirmModalStyle}>
            <span style={sendConfirmEyebrowStyle}>WhatsApp aberto</span>

            <h3 style={sendConfirmTitleStyle}>
              Você enviou a mensagem?
            </h3>

            <p style={sendConfirmTextStyle}>
              Confirme apenas se a mensagem foi enviada no WhatsApp para{" "}
              <strong>{envioPendenteConfirmacao.nome || "este convidado"}</strong>.
              Se você abriu o WhatsApp mas não enviou, cancele para manter o convidado na fila.
            </p>

            {statusMidiaUltimoEnvio === "copiada" && (
              <div style={mediaStatusSuccessStyle}>
                Mídia copiada. No WhatsApp, cole com Ctrl+V ou Cmd+V antes de enviar.
              </div>
            )}

            {statusMidiaUltimoEnvio === "url_copiada" && (
              <div style={mediaStatusWarningStyle}>
                Não foi possível copiar o arquivo da mídia; a URL foi copiada. Cole no WhatsApp se quiser enviar o link.
              </div>
            )}

            {statusMidiaUltimoEnvio === "erro" && (
              <div style={mediaStatusErrorStyle}>
                Não foi possível copiar a mídia automaticamente. Envie a imagem manualmente e depois confirme.
              </div>
            )}

            <div style={sendConfirmActionsStyle}>
              <button
                type="button"
                onClick={cancelarConfirmacaoEnvio}
                disabled={confirmandoEnvio}
                style={sendCancelButtonStyle}
              >
                Cancelar envio
              </button>

              <button
                type="button"
                onClick={confirmarEnvioWhatsApp}
                disabled={confirmandoEnvio}
                style={
                  confirmandoEnvio
                    ? { ...sendConfirmButtonStyle, opacity: 0.65, cursor: "wait" }
                    : sendConfirmButtonStyle
                }
              >
                {confirmandoEnvio ? "Marcando..." : "Sim, marque como enviado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function inferirMimeTypePorUrl(url: string) {
  const limpa = url.split("?")[0].toLowerCase();

  if (limpa.endsWith(".gif")) return "image/gif";
  if (limpa.endsWith(".webp")) return "image/webp";
  if (limpa.endsWith(".jpg") || limpa.endsWith(".jpeg")) return "image/jpeg";
  if (limpa.endsWith(".png")) return "image/png";
  if (limpa.endsWith(".mp4")) return "video/mp4";

  return "image/png";
}

function obterExtensaoArquivo(nome: string, mimeType: string) {
  const extensaoNome = nome.split(".").pop()?.toLowerCase();

  if (extensaoNome && /^[a-z0-9]+$/.test(extensaoNome)) {
    return extensaoNome;
  }

  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";

  return "png";
}

function normalizarNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizarSegmentoStorage(valor: string) {
  return normalizarNomeArquivo(valor || "sem-identificacao") || "sem-identificacao";
}

const campanhas: Record<TipoEnvio, Campanha> = {
  save_the_date: {
    key: "save_the_date",
    titulo: "1. Save the Date",
    subtitulo: "Primeiro contato",
    descricao:
      "Apresentação da OmniStage e aviso antecipado da data do evento. Peça aos convidados para salvar o número.",
    statusColumn: "status_envio_save_the_date",
    dataColumn: "data_envio_save_the_date",
    cor: "#0ea5e9",
    corSuave: "#e0f2fe",
    filtrarPublico: (convidado) => !!getTelefoneEnvio(convidado),
    templatePadrao: `Olá {{nome}}! 👋

Salve este número — sou a OmniStage, assessoria responsável pelo evento {{evento}}.

📅 Save the Date: em breve você receberá mais informações e seu convite oficial.

OmniStage — Gestão de Eventos`,
  },

  convite: {
    key: "convite",
    titulo: "2. Envio do convite",
    subtitulo: "Primeiro contato",
    descricao:
      "Envio inicial do convite digital para todos os convidados com telefone.",
    statusColumn: "status_envio_convite",
    dataColumn: "data_envio_convite",
    cor: "#6d28d9",
    corSuave: "#ede9fe",
    filtrarPublico: (convidado) => !!getTelefoneEnvio(convidado),
    templatePadrao: `Olá {{nome}} ✨

Você está convidado(a) para o evento {{evento}}.

Pedimos com gentileza que confirme sua presença no link:
{{link_convite}}

Com carinho,
Pedro e Família.`,
  },

  lembrete_rsvp: {
    key: "lembrete_rsvp",
    titulo: "3. Confirmação pendente",
    subtitulo: "Lembrete RSVP",
    descricao:
      "Lembrete para convidados que ainda estão com RSVP pendente.",
    statusColumn: "status_envio_lembrete_rsvp",
    dataColumn: "data_envio_lembrete_rsvp",
    cor: "#f59e0b",
    corSuave: "#fef3c7",
    filtrarPublico: (convidado) =>
      convidado.status_rsvp === "pendente" && !!getTelefoneEnvio(convidado),
    templatePadrao: `Olá {{nome}} ✨

Passando para lembrar que você ainda não confirmou presença no evento {{evento}}.

Para confirmar, acesse seu convite digital:
{{link_convite}}

Sua confirmação é muito importante para organizarmos tudo com carinho.

Com carinho,
OmniStage`,
  },

  lembrete_evento: {
    key: "lembrete_evento",
    titulo: "4. Evento está chegando",
    subtitulo: "Lembrete final",
    descricao: "Lembrete enviado próximo ao evento para todos os convidados confirmados.",
    statusColumn: "status_envio_lembrete_evento",
    dataColumn: "data_envio_lembrete_evento",
    cor: "#ea580c",
    corSuave: "#ffedd5",
    filtrarPublico: (convidado) =>
      isRsvpConfirmado(convidado.status_rsvp) && !!getTelefoneEnvio(convidado),
    templatePadrao: `Olá {{nome}}! 🎉

O evento {{evento}} está chegando!

Estamos ansiosos para celebrar com você. Lembre-se de trazer seu cartão de entrada.

Qualquer dúvida, estamos à disposição.

OmniStage — Gestão de Eventos`,
  },

  cartao_evento: {
    key: "cartao_evento",
    titulo: "5. Cartão do evento",
    subtitulo: "Entrada / QR Code",
    descricao:
      "Envio do cartão de entrada para convidados confirmados.",
    statusColumn: "status_envio_cartao",
    dataColumn: "data_envio_cartao",
    cor: "#16a34a",
    corSuave: "#dcfce7",
    filtrarPublico: (convidado) =>
      isRsvpConfirmado(convidado.status_rsvp) &&
      deveReceberCartaoEvento(convidado) &&
      recebeComunicacaoNesteEvento(convidado) &&
      !!getTelefoneEnvio(convidado) &&
      !!convidado.token,
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
  { key: "{{nome}}", description: "Nome do destinatário/convidado" },
  { key: "{{convidados}}", description: "Lista de convidados vinculados ao responsável" },
  { key: "{{grupo}}", description: "Grupo ou família do convidado" },
  { key: "{{evento}}", description: "Nome do evento" },
  { key: "{{nome_evento}}", description: "Nome do evento" },
  { key: "{{telefone}}", description: "Telefone cadastrado" },
  { key: "{{email}}", description: "E-mail cadastrado" },
  { key: "{{token}}", description: "Token do convite/cartão" },
  { key: "{{link_convite}}", description: "Link do convite digital" },
  { key: "{{link_cartao}}", description: "Link do cartão de entrada" },
];

function convidadoEstaNaFila(
  fila: ItemFila[],
  convidadoId: string,
  tipo: TipoEnvio
) {
  return fila.some(
    (item) =>
      item.convidado_id === convidadoId &&
      item.tipo_envio === tipo &&
      (item.status === "pendente" || item.status === "agendado")
  );
}

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

function normalizarStatusEnvio(status: string | null | undefined) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function isRsvpConfirmado(status: string | null | undefined) {
  const normalizado = normalizarStatusEnvio(status);

  return (
    normalizado === "confirmado" ||
    normalizado === "confirmada" ||
    normalizado === "confirmou" ||
    normalizado === "sim" ||
    normalizado.includes("confirm")
  );
}

function isRsvpAusente(status: string | null | undefined) {
  const normalizado = normalizarStatusEnvio(status);

  return (
    normalizado === "ausente" ||
    normalizado === "ausencia" ||
    normalizado === "nao_vai" ||
    normalizado === "nao_comparecera" ||
    normalizado.includes("ausent")
  );
}

function isRsvpPendente(status: string | null | undefined) {
  return !isRsvpConfirmado(status) && !isRsvpAusente(status);
}

function deveReceberCartaoEvento(convidado: Convidado) {
  const grupo = String(convidado.grupo || "").trim();

  return convidado.contato_principal === true || grupo.length === 0;
}

function isStatusImportado(status: string | null | undefined) {
  const normalizado = normalizarStatusEnvio(status);
  return normalizado.includes("import");
}

function isStatusEnviado(status: string | null | undefined) {
  const normalizado = normalizarStatusEnvio(status);

  return (
    normalizado === "enviado" ||
    normalizado === "enviado_manual" ||
    normalizado === "manual_enviado" ||
    normalizado === "envio_importado" ||
    normalizado === "enviado_importado" ||
    normalizado === "convite_importado" ||
    normalizado === "importado" ||
    normalizado.includes("import")
  );
}

function isEnvioImportado(convidado: Convidado, campanha: Campanha) {
  if (campanha.key !== "convite") return false;

  const statusAtual = getStatusEnvio(convidado, campanha);
  const statusGeral = convidado.status_envio;
  const dataEnvio = getDataEnvio(convidado, campanha);
  const dataEnvioImportada = convidado.data_hora_envio;

  return (
    isStatusImportado(statusAtual) ||
    isStatusImportado(statusGeral) ||
    (!!convidado.origem_importacao &&
      (!!dataEnvio || !!dataEnvioImportada || isStatusEnviado(statusGeral)))
  );
}

function isEnvioConsideradoEnviado(convidado: Convidado, campanha: Campanha) {
  const statusAtual = getStatusEnvio(convidado, campanha);
  const dataEnvio = getDataEnvio(convidado, campanha);

  if (campanha.key === "convite") {
    const statusGeral = convidado.status_envio;
    const envioImportado = isEnvioImportado(convidado, campanha);

    return isStatusEnviado(statusAtual) || isStatusEnviado(statusGeral) || envioImportado || !!dataEnvio;
  }

  return isStatusEnviado(statusAtual) || !!dataEnvio;
}


function isConfirmadoSemEnvioConvite(convidado: Convidado, campanha: Campanha) {
  if (campanha.key !== "convite") return false;

  return isRsvpConfirmado(convidado.status_rsvp) && !isEnvioConsideradoEnviado(convidado, campanha);
}

function getDataEnvio(convidado: Convidado, campanha: Campanha) {
  const dataCampanha = convidado[campanha.dataColumn] as string | null | undefined;

  if (dataCampanha) return dataCampanha;

  if (campanha.key === "convite" && convidado.data_hora_envio) {
    return convidado.data_hora_envio;
  }

  return dataCampanha;
}

function normalizarTelefone(telefone: string | null | undefined) {
  return (telefone || "").replace(/\D/g, "");
}

function getTelefoneEnvio(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const telefoneProprio = normalizarTelefone(convidado.telefone);
  if (telefoneProprio) return telefoneProprio;

  // Convite individual ou núcleo: quando o convidado não tem telefone,
  // mas possui responsável direto preenchido, o envio deve ir para o responsável,
  // mesmo que o núcleo não esteja marcado para visualização/agrupamento.
  const telefoneResponsavelDireto = normalizarTelefone(convidado.responsavel_telefone);
  if (telefoneResponsavelDireto) return telefoneResponsavelDireto;

  // Último fallback: convidados adultos/crianças sem telefone e sem responsável direto
  // usam o principal do núcleo/CRM, mesmo que esse principal não seja convidado do evento.
  return normalizarTelefone(getPrincipalNucleoEnvio(convidado, todosConvidados)?.telefone);
}

function getPrincipalNucleoEnvio(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const grupo = String(convidado.grupo || "").trim();

  if (!grupo) return null;

  const membrosMesmoGrupo = todosConvidados.filter((item) => {
    return String(item.grupo || "").trim() === grupo;
  });

  const principalNoEvento =
    membrosMesmoGrupo.find((item) => {
      return item.id !== convidado.id && item.contato_principal === true && recebeComunicacaoNesteEvento(item) && !!normalizarTelefone(item.telefone);
    }) || null;

  if (principalNoEvento) return principalNoEvento;

  const telefonePrincipalCrm = normalizarTelefone(convidado.principal_nucleo_telefone);

  if (telefonePrincipalCrm) {
    return {
      id: `principal-crm-${grupo}`,
      nome: convidado.principal_nucleo_nome || "Responsável",
      telefone: telefonePrincipalCrm,
      grupo,
      status_rsvp: null,
      recebe_convite: true,
      contato_principal: true,
    } as Convidado;
  }

  return null;
}

function recebeComunicacaoNesteEvento(convidado: Convidado) {
  const valor = convidado.recebe_convite as boolean | string | number | null | undefined;

  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor !== 0;

  const normalizado = String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["false", "nao", "no", "0", "desmarcado"].includes(normalizado)) {
    return false;
  }

  // Registros antigos podem estar com NULL. Só bloqueia quando estiver explicitamente desmarcado.
  return true;
}

function isEnvioViaResponsavel(convidado: Convidado, todosConvidados: Convidado[] = []) {
  return (
    !normalizarTelefone(convidado.telefone) &&
    (!!normalizarTelefone(convidado.responsavel_telefone) || !!getPrincipalNucleoEnvio(convidado, todosConvidados))
  );
}

function normalizarTipoConvite(tipo: string | null | undefined) {
  return String(tipo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function isConvidadoCrianca(convidado: Convidado) {
  const valor = convidado.crianca as boolean | string | number | null | undefined;

  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;

  const normalizado = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalizado === "sim" || normalizado === "true" || normalizado === "1" || normalizado === "crianca";
}

function isConviteIndividualSemTelefoneComResponsavelDireto(convidado: Convidado) {
  const tipoConvite = normalizarTipoConvite(convidado.tipo_convite);

  return (
    tipoConvite === "individual" &&
    !normalizarTelefone(convidado.telefone) &&
    !!normalizarTelefone(convidado.responsavel_telefone)
  );
}

function isDependenteGrupoComEnvioViaResponsavel(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const tipoConvite = normalizarTipoConvite(convidado.tipo_convite);
  const ehConviteIndividual = tipoConvite === "individual";
  const temTelefoneProprio = !!normalizarTelefone(convidado.telefone);
  const temResponsavelEnvio =
    !!String(convidado.responsavel || "").trim() ||
    !!normalizarTelefone(convidado.responsavel_telefone);
  const temPrincipalNucleoEnvio = !!getPrincipalNucleoEnvio(convidado, todosConvidados);

  // Convite individual sem telefone e com responsável direto deve aparecer como card próprio,
  // usando o telefone do responsável. Não agrupa por núcleo e não depende de
  // "Visualizar convite neste núcleo" estar marcado.
  if (ehConviteIndividual && !temTelefoneProprio && temResponsavelEnvio) {
    return false;
  }

  // Convite em núcleo ou dependente sem telefone e sem envio próprio:
  // agrupa por responsável/principal para evitar mensagens duplicadas.
  return !temTelefoneProprio && !ehConviteIndividual && (temResponsavelEnvio || temPrincipalNucleoEnvio);
}

function getChaveEnvioResponsavelGrupo(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const grupo = String(convidado.grupo || "").trim();
  const principalNucleo = getPrincipalNucleoEnvio(convidado, todosConvidados);
  const telefoneResponsavel =
    normalizarTelefone(convidado.responsavel_telefone) || normalizarTelefone(principalNucleo?.telefone);
  const responsavel = String(convidado.responsavel || principalNucleo?.nome || "").trim().toLowerCase();

  if (!grupo || !telefoneResponsavel) return "";

  return `${grupo}__${telefoneResponsavel}__${responsavel}`;
}

function ordenarConvidadosParaEnvioNucleo(convidados: Convidado[]) {
  return [...convidados].sort((a, b) => {
    const principalA = a.contato_principal ? 1 : 0;
    const principalB = b.contato_principal ? 1 : 0;

    if (principalA !== principalB) {
      return principalB - principalA;
    }

    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
  });
}

function isRepresentanteEnvioResponsavelGrupo(convidado: Convidado, todosConvidados: Convidado[] = []) {
  if (!isDependenteGrupoComEnvioViaResponsavel(convidado, todosConvidados)) return true;

  const chave = getChaveEnvioResponsavelGrupo(convidado, todosConvidados);
  if (!chave) return true;

  const dependentesMesmoResponsavel = ordenarConvidadosParaEnvioNucleo(
    todosConvidados.filter((item) => {
      return (
        isDependenteGrupoComEnvioViaResponsavel(item, todosConvidados) &&
        recebeComunicacaoNesteEvento(item) &&
        getChaveEnvioResponsavelGrupo(item, todosConvidados) === chave
      );
    })
  );

  return dependentesMesmoResponsavel[0]?.id === convidado.id;
}

function getConvidadosVinculadosAoResponsavel(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const chave = getChaveEnvioResponsavelGrupo(convidado, todosConvidados);

  if (!chave || !isDependenteGrupoComEnvioViaResponsavel(convidado, todosConvidados)) {
    return [convidado];
  }

  return ordenarConvidadosParaEnvioNucleo(
    todosConvidados.filter((item) => {
      return (
        isDependenteGrupoComEnvioViaResponsavel(item, todosConvidados) &&
        recebeComunicacaoNesteEvento(item) &&
        getChaveEnvioResponsavelGrupo(item, todosConvidados) === chave
      );
    })
  );
}

function getConvidadosRepresentadosNoCard(convidado: Convidado, todosConvidados: Convidado[] = []) {
  return getConvidadosVinculadosAoResponsavel(convidado, todosConvidados).filter((item) =>
    recebeComunicacaoNesteEvento(item)
  );
}

function getNomesConvidadosVinculados(convidado: Convidado, todosConvidados: Convidado[] = []) {
  return getConvidadosRepresentadosNoCard(convidado, todosConvidados)
    .map((item) => String(item.nome || "").trim())
    .filter(Boolean);
}

function formatarNomeConviteInteligente(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const nomes = getNomesConvidadosVinculados(convidado, todosConvidados);

  if (nomes.length === 0) return convidado.nome || "";
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;

  return `${nomes[0]} e família`;
}

function formatarTituloCardEnvio(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const nomes = getNomesConvidadosVinculados(convidado, todosConvidados);

  if (nomes.length === 0) return convidado.nome || "Sem nome";
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;

  return `${nomes[0]} + ${nomes.length - 1} convidados`;
}

function aplicarPluralizacaoAutomatica(template: string, quantidadeConvidados: number) {
  let texto = template;

  if (quantidadeConvidados > 1) {
    texto = texto
      .replace(/Você\(s\)\s+estão\s+convidado\(s\)/gi, "Vocês estão convidados")
      .replace(/Você\s+está\s+convidado\(a\)/gi, "Vocês estão convidados")
      .replace(/Você\s+está\s+convidado/gi, "Vocês estão convidados")
      .replace(/Você\s+está\s+convidada/gi, "Vocês estão convidados")
      .replace(/confirme\s+sua\s+presença/gi, "confirmem suas presenças")
      .replace(/confirme\s+a\s+sua\s+presença/gi, "confirmem as suas presenças")
      .replace(/confirmar\s+sua\s+presença/gi, "confirmar suas presenças");
  } else {
    texto = texto
      .replace(/Você\(s\)\s+estão\s+convidado\(s\)/gi, "Você está convidado(a)")
      .replace(/Vocês\s+estão\s+convidados/gi, "Você está convidado(a)")
      .replace(/confirmem\s+suas\s+presenças/gi, "confirme sua presença")
      .replace(/confirmem\s+as\s+suas\s+presenças/gi, "confirme a sua presença")
      .replace(/confirmar\s+suas\s+presenças/gi, "confirmar sua presença");
  }

  return texto;
}

function deveEntrarNoPublicoCampanha(
  convidado: Convidado,
  campanha: Campanha,
  todosConvidados: Convidado[] = []
) {
  const telefoneOk = !!getTelefoneEnvio(convidado, todosConvidados);

  if (campanha.key === "convite") {
    const envioIndividualViaResponsavel = isConviteIndividualSemTelefoneComResponsavelDireto(convidado);

    return (
      recebeComunicacaoNesteEvento(convidado) &&
      (telefoneOk || envioIndividualViaResponsavel)
    );
  }

  if (campanha.key === "lembrete_rsvp") {
    return (
      isRsvpPendente(convidado.status_rsvp) &&
      telefoneOk &&
      isEnvioConsideradoEnviado(convidado, campanhas.convite)
    );
  }

  if (campanha.key === "cartao_evento") {
    return (
      isRsvpConfirmado(convidado.status_rsvp) &&
      deveReceberCartaoEvento(convidado) &&
      recebeComunicacaoNesteEvento(convidado) &&
      telefoneOk &&
      !!convidado.token
    );
  }

  return campanha.filtrarPublico(convidado);
}

function deveAparecerNoModuloEnvios(
  convidado: Convidado,
  campanha: Campanha,
  todosConvidados: Convidado[] = []
) {
  // Regra de comunicação do evento:
  // se "Receber comunicação deste evento" estiver desmarcado, este convidado não gera envio próprio.
  if (!recebeComunicacaoNesteEvento(convidado)) {
    return false;
  }

  // Convite individual sem telefone, mas com responsável direto e telefone do responsável,
  // deve aparecer como card próprio. Esta regra NÃO depende de Visualizar/Agrupar convite no núcleo.
  if (isConviteIndividualSemTelefoneComResponsavelDireto(convidado)) {
    return true;
  }

  // Crianças/dependentes em convite por núcleo com envio via responsável devem aparecer uma única vez
  // por responsável + grupo. Assim evita dois cards e duas mensagens para o mesmo WhatsApp.
  if (isDependenteGrupoComEnvioViaResponsavel(convidado, todosConvidados)) {
    return isRepresentanteEnvioResponsavelGrupo(convidado, todosConvidados);
  }

  return true;
}

function deveAparecerEmAEnviar(
  convidado: Convidado,
  campanha: Campanha,
  filaEnvios: ItemFila[],
  tipoEnvio: TipoEnvio,
  todosConvidados: Convidado[] = []
) {
  const telefoneOk = !!getTelefoneEnvio(convidado, todosConvidados);
  const enviado = isEnvioConsideradoEnviado(convidado, campanha);
  const estaNaFila = convidadoEstaNaFila(filaEnvios, convidado.id, tipoEnvio);

  if (!telefoneOk || enviado || estaNaFila) {
    return false;
  }

  if (campanha.key === "save_the_date") {
    return true;
  }

  if (campanha.key === "convite") {
    return isRsvpPendente(convidado.status_rsvp);
  }

  if (campanha.key === "lembrete_rsvp") {
    return (
      isRsvpPendente(convidado.status_rsvp) &&
      isEnvioConsideradoEnviado(convidado, campanhas.convite) &&
      !isEnvioConsideradoEnviado(convidado, campanha)
    );
  }

  if (campanha.key === "lembrete_evento") {
    return (
      isRsvpConfirmado(convidado.status_rsvp) &&
      isEnvioConsideradoEnviado(convidado, campanhas.convite) &&
      !isEnvioConsideradoEnviado(convidado, campanha)
    );
  }

  if (campanha.key === "cartao_evento") {
    return isRsvpConfirmado(convidado.status_rsvp) && !!convidado.token;
  }

  return true;
}

function extrairTokens(token: string | null | undefined) {
  return String(token || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolverTokenIndividualDoCard(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const tokens = extrairTokens(convidado.token);

  if (tokens.length <= 1) {
    return tokens[0] || String(convidado.token || "").trim();
  }

  const grupo = String(convidado.grupo || "").trim();
  const membrosMesmoGrupo = todosConvidados.filter((item) => {
    const mesmoGrupo = grupo
      ? String(item.grupo || "").trim() === grupo
      : !String(item.grupo || "").trim();

    return mesmoGrupo && !!String(item.token || "").trim();
  });

  const indiceNoGrupo = membrosMesmoGrupo.findIndex((item) => item.id === convidado.id);

  if (indiceNoGrupo >= 0 && tokens[indiceNoGrupo]) {
    return tokens[indiceNoGrupo];
  }

  const tokenUnicoEmOutroRegistro = todosConvidados.find((item) => {
    if (item.id !== convidado.id) return false;
    return extrairTokens(item.token).length === 1;
  });

  if (tokenUnicoEmOutroRegistro?.token) {
    return String(tokenUnicoEmOutroRegistro.token).trim();
  }

  return tokens[0] || String(convidado.token || "").trim();
}

function resolverTokenConvite(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const tipoConvite = normalizarTipoConvite(convidado.tipo_convite);

  if (tipoConvite === "individual") {
    return resolverTokenIndividualDoCard(convidado, todosConvidados);
  }

  return String(convidado.token || "").trim();
}

function gerarLinkConvite(convidado: Convidado, todosConvidados: Convidado[] = []) {
  const token = encodeURIComponent(resolverTokenConvite(convidado, todosConvidados));
  if (typeof window === "undefined") return `/c/${token}`;
  return `${window.location.origin}/c/${token}`;
}

function gerarLinkCartao(convidado: Convidado) {
  const token = encodeURIComponent(convidado.token || "");

  if (typeof window === "undefined") {
    return `/cartao/${token}`;
  }

  return `${window.location.origin}/cartao/${token}`;
}

function montarMensagem(
  template: string,
  convidado: Convidado,
  evento?: Evento | null,
  todosConvidados: Convidado[] = []
) {
  const nomeEvento = evento?.nome || "";
  const tokenConvite = resolverTokenConvite(convidado, todosConvidados);
  const convidadosVinculados = getConvidadosRepresentadosNoCard(convidado, todosConvidados);
  const quantidadeConvidados = Math.max(convidadosVinculados.length, 1);
  const nomeDestinatario = formatarNomeConviteInteligente(convidado, todosConvidados);
  const listaConvidados = convidadosVinculados
    .map((item) => `• ${item.nome || "Convidado sem nome"}`)
    .join("\n");

  return aplicarPluralizacaoAutomatica(template, quantidadeConvidados)
    .replaceAll("{{nome}}", nomeDestinatario)
    .replaceAll("{{convidados}}", listaConvidados || convidado.nome || "")
    .replaceAll("{{convidados_nucleo}}", listaConvidados || convidado.nome || "")
    .replaceAll("{{grupo}}", convidado.grupo || "")
    .replaceAll("{{evento}}", nomeEvento)
    .replaceAll("{{nome_evento}}", nomeEvento)
    .replaceAll("{{telefone}}", getTelefoneEnvio(convidado, todosConvidados) || "")
    .replaceAll("{{email}}", convidado.email || "")
    .replaceAll("{{token}}", tokenConvite)
    .replaceAll("{{link_convite}}", gerarLinkConvite(convidado, todosConvidados))
    .replaceAll("{{link_cartao}}", gerarLinkCartao(convidado));
}


function isImagemEstaticaCopiavel(url: string) {
  const caminho = url.split("?")[0].toLowerCase();
  return (
    caminho.endsWith(".png") ||
    caminho.endsWith(".jpg") ||
    caminho.endsWith(".jpeg") ||
    caminho.endsWith(".webp")
  );
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
  padding: 24,
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
  padding: "16px 17px",
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 19,
  fontWeight: 900,
  outline: "none",
};

const campaignSelectorStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const campaignButtonStyle: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", padding: 19, borderRadius: 20, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 6, fontSize: 19, lineHeight: 1.25, fontWeight: 900, boxShadow: "0 10px 30px rgba(15,23,42,0.04)" };
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
  background: "var(--yellow-soft)",
  color: "var(--yellow)",
  fontSize: 13,
  fontWeight: 750,
};

const editorGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(280px, 1.05fr) minmax(280px, 0.95fr)", gap: 18 };
const editorColumnStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const previewColumnStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const fieldLabelStyle: React.CSSProperties = { color: "var(--text)", fontSize: 16, fontWeight: 900 };
const textareaStyle: React.CSSProperties = { width: "100%", minHeight: 300, resize: "vertical", border: "1px solid var(--line)", borderRadius: 16, padding: 14, background: "var(--card)", color: "var(--text)", fontSize: 14, lineHeight: 1.5, outline: "none", fontFamily: "Arial, Helvetica, sans-serif" };
const variablesBoxStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 16, padding: 14, background: "var(--card-strong)" };
const variablesTitleStyle: React.CSSProperties = { display: "block", marginBottom: 10, color: "var(--text)", fontSize: 13 };
const variablesListStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const chipStyle: React.CSSProperties = { border: "1px solid rgba(109,40,217,0.18)", background: "var(--primary-soft)", color: "var(--primary)", padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, cursor: "pointer" };
const previewHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" };
const previewHelpStyle: React.CSSProperties = { margin: "5px 0 0", color: "var(--muted)", fontSize: 12, fontWeight: 700 };
const previewSelectStyle: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", borderRadius: 12, padding: "10px 12px", fontWeight: 800 };
const phonePreviewStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 22, padding: 16, background: "var(--card-strong)", minHeight: 350 };
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
const panelTextStyle: React.CSSProperties = { margin: "7px 0 0", color: "var(--muted)", fontSize: 19, lineHeight: 1.35 };
const counterStyle: React.CSSProperties = { padding: "9px 13px", borderRadius: 999, background: "rgba(109,40,217,0.08)", color: "#6d28d9", fontSize: 13, fontWeight: 900 };
const tabsStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 };
const tabStyle: React.CSSProperties = { padding: "9px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
const tabActiveStyle: React.CSSProperties = { ...tabStyle, background: "#6d28d9", color: "#fff", border: "1px solid #6d28d9" };
const searchRowStyle: React.CSSProperties = { display: "flex", gap: 10, marginTop: 16 };
const searchInputStyle: React.CSSProperties = { flex: 1, minWidth: 260, padding: 13, borderRadius: 14, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", outline: "none" };
const bulkBarStyle: React.CSSProperties = {   display: "flex",   justifyContent: "space-between",   alignItems: "center",   gap: 14,   flexWrap: "wrap",   marginTop: 16,   padding: 14,   borderRadius: 18,   border: "1px solid var(--line)",   background: "var(--card-strong)", };  const selectAllStyle: React.CSSProperties = {   display: "flex",   alignItems: "center",   gap: 9,   color: "var(--text)",   fontWeight: 850,   cursor: "pointer", };  const bulkActionsStyle: React.CSSProperties = {   display: "flex",   alignItems: "center",   gap: 8,   flexWrap: "wrap", };  const bulkCountStyle: React.CSSProperties = {   padding: "8px 11px",   borderRadius: 999,   background: "rgba(109,40,217,0.08)",   color: "#6d28d9",   fontSize: 12,   fontWeight: 900, };  const rowCheckboxStyle: React.CSSProperties = {   display: "flex",   alignItems: "flex-start",   paddingTop: 4,   cursor: "pointer", };  const listStyle: React.CSSProperties = {   display: "flex",   flexDirection: "column",   gap: 12,   marginTop: 16, };
const cardStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 18, background: "var(--card)", padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" };
const guestInfoStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 280 };
const guestNameStyle: React.CSSProperties = { color: "var(--text)", fontSize: 17, fontWeight: 900 };
const guestMetaStyle: React.CSSProperties = { color: "var(--muted)", fontSize: 13, fontWeight: 700 };
const responsavelBadgeStyle: React.CSSProperties = { width: "fit-content", marginTop: 2, padding: "6px 9px", borderRadius: 999, background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid rgba(109,40,217,0.18)", fontSize: 12, fontWeight: 900 };
const messagePreviewStyle: React.CSSProperties = { margin: "10px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-line" };
const sentDateStyle: React.CSSProperties = { marginTop: 8, color: "var(--muted)", fontWeight: 800 };
const actionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" };
const mediaBoxStyle: React.CSSProperties = { marginTop: 18, padding: 18, borderRadius: 24, border: "1px solid var(--line)", background: "var(--card-strong)", display: "grid", gap: 12 };
const mediaHelpStyle: React.CSSProperties = { margin: "6px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.45 };
const mediaInputStyle: React.CSSProperties = { width: "100%", border: "1px solid var(--line)", borderRadius: 16, padding: "13px 15px", fontSize: 15, color: "var(--text)", background: "var(--card)", outline: "none" };
const mediaUploadRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const mediaUploadButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 999, padding: "12px 16px", background: "#6d28d9", color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer" };
const mediaActionButtonStyle: React.CSSProperties = { border: "1px solid #bfdbfe", borderRadius: 999, padding: "11px 15px", background: "#eff6ff", color: "#1d4ed8", fontSize: 14, fontWeight: 900, cursor: "pointer" };
const mediaRemoveButtonStyle: React.CSSProperties = { border: "1px solid rgba(220,38,38,0.24)", borderRadius: 999, padding: "11px 15px", background: "var(--red-soft)", color: "var(--red)", fontSize: 14, fontWeight: 900, cursor: "pointer" };
const hiddenFileInputStyle: React.CSSProperties = { display: "none" };
const mediaPreviewBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, border: "1px solid #dbeafe", background: "#eff6ff" };
const mediaPreviewImageStyle: React.CSSProperties = { width: 92, height: 92, borderRadius: 16, objectFit: "cover", background: "#fff", border: "1px solid #dbeafe" };
const mediaPreviewTextStyle: React.CSSProperties = { color: "#1e3a8a", fontSize: 13, fontWeight: 800, lineHeight: 1.45 };
const mediaStatusSuccessStyle: React.CSSProperties = { padding: "12px 14px", borderRadius: 16, background: "var(--green-soft)", color: "var(--green)", fontWeight: 900, fontSize: 14, lineHeight: 1.45 };
const mediaStatusWarningStyle: React.CSSProperties = { padding: "12px 14px", borderRadius: 16, background: "var(--yellow-soft)", color: "var(--yellow)", fontWeight: 900, fontSize: 14, lineHeight: 1.45 };
const mediaStatusErrorStyle: React.CSSProperties = { padding: "12px 14px", borderRadius: 16, background: "var(--red-soft)", color: "var(--red)", fontWeight: 900, fontSize: 14, lineHeight: 1.45 };

const whatsappButtonStyle: React.CSSProperties = { border: "none", background: "#16a34a", color: "#fff", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const enviarFilaButtonStyle: React.CSSProperties = { border: "none", background: "#2563eb", color: "#fff", padding: "10px 15px", borderRadius: 999, fontWeight: 950, cursor: "pointer", boxShadow: "0 10px 24px rgba(37,99,235,0.22)" };
const filaButtonStyle: React.CSSProperties = { border: "1px solid rgba(37,99,235,0.24)", background: "var(--primary-soft)", color: "var(--primary)", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const removeFilaButtonStyle: React.CSSProperties = { border: "1px solid rgba(220,38,38,0.24)", background: "var(--red-soft)", color: "var(--red)", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { border: "1px solid rgba(109,40,217,0.24)", background: "var(--primary-soft)", color: "var(--primary)", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const cancelButtonStyle: React.CSSProperties = { border: "1px solid rgba(220,38,38,0.24)", background: "var(--red-soft)", color: "var(--red)", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const ghostButtonStyle: React.CSSProperties = { border: "1px solid var(--line)", background: "transparent", color: "var(--text)", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const pendingBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "var(--yellow-soft)", color: "var(--yellow)", fontSize: 12, fontWeight: 900 };
const filaBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "var(--primary-soft)", color: "var(--primary)", fontSize: 12, fontWeight: 900 };
const sentBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "var(--green-soft)", color: "var(--green)", fontSize: 12, fontWeight: 900 };
const sentImportedBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "#e0f2fe", color: "#075985", fontSize: 12, fontWeight: 900 };
const sentCardConvidadoBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "var(--primary-soft)", color: "var(--primary)", fontSize: 12, fontWeight: 900 };

const sendConfirmOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15,23,42,0.36)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const sendConfirmModalStyle: React.CSSProperties = {
  width: "min(520px, 100%)",
  borderRadius: 26,
  padding: 24,
  background: "var(--card)",
  border: "1px solid var(--line)",
  boxShadow: "0 28px 90px rgba(15,23,42,0.26)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sendConfirmEyebrowStyle: React.CSSProperties = {
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sendConfirmTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 24,
  fontWeight: 950,
};

const sendConfirmTextStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--muted)",
  fontSize: 15,
  lineHeight: 1.5,
  fontWeight: 700,
};

const sendConfirmActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const sendCancelButtonStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--muted)",
  padding: "12px 15px",
  borderRadius: 999,
  fontWeight: 950,
  cursor: "pointer",
};

const sendConfirmButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
  padding: "12px 16px",
  borderRadius: 999,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(22,163,74,0.22)",
};

const emptyStyle: React.CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed var(--line)", color: "var(--muted)" };

const progressoOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 99998,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15,23,42,0.5)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const progressoModalStyle: React.CSSProperties = {
  width: "min(560px, 100%)",
  borderRadius: 28,
  padding: 28,
  background: "var(--card)",
  border: "1px solid var(--line)",
  boxShadow: "0 32px 100px rgba(15,23,42,0.3)",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const progressoBarBgStyle: React.CSSProperties = {
  height: 10,
  borderRadius: 999,
  background: "var(--line)",
  overflow: "hidden",
};

const progressoBarFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  transition: "width 0.4s ease, background 0.3s ease",
};

const toastContainerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 28,
  right: 28,
  zIndex: 99999,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxWidth: 400,
  pointerEvents: "none",
};

const toastBaseStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "14px 16px",
  borderRadius: 16,
  color: "#fff",
  fontWeight: 750,
  fontSize: 14,
  lineHeight: 1.45,
  boxShadow: "0 20px 60px rgba(15,23,42,0.3)",
  pointerEvents: "all",
  animation: "toastIn 0.25s cubic-bezier(.2,.8,.2,1)",
};

const toastCloseStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
  flexShrink: 0,
  marginTop: 1,
};
