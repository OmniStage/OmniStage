"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
  slug: string | null;
  lista_presentes_ativa: boolean | null;
  lista_presentes_mensagem: string | null;
};

type NucleoContato = {
  id: string;
  nome: string;
  tipo: string | null;
  tipo_nucleo: string | null;
};

type VinculoContatoNucleo = {
  id: string;
  tenant_id: string | null;
  grupo_contato_id: string;
  tenant_contato_id: string;
  papel: string | null;
  papel_nucleo: string | null;
  recebe_comunicacao: boolean | null;
  principal_envio: boolean | null;
};

type ContatoBaseConvidado = {
  id: string;
  tipo_contato: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
};

type Convidado = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  tenant_contato_id?: string | null;
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
  status_envio_convite: string | null;
  data_envio_convite: string | null;
  status_envio_lembrete_rsvp: string | null;
  data_envio_lembrete_rsvp: string | null;
  status_envio_cartao: string | null;
  data_envio_cartao: string | null;
  status_checkin: string | null;
  token: string | null;
  evento_id: string | null;
  created_at: string | null;
  legacy_id?: string | number | null;
  origem_importacao?: string | null;
  import_batch_id?: string | null;
  data_hora_rsvp?: string | null;
  data_hora_envio?: string | null;
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

type PresentePreEvento = {
  id: string;
  gift_item_id: string | null;
  convidado_id: string | null;
  token_convite: string | null;
  nome_presenteador: string | null;
  mensagem: string | null;
  valor_presenteado: number | null;
  created_at: string | null;
  origem: string | null;
  status: string | null;
  gift_items?:
    | {
        nome?: string | null;
        tipo?: string | null;
      }
    | {
        nome?: string | null;
        tipo?: string | null;
      }[]
    | null;
};

type PresentePreEventoCard = PresentePreEvento & {
  convidado_nome?: string | null;
  convidado_original_id?: string | null;
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

const mensagemPadraoListaPresentes = `Olá {nome} ✨

A lista de presentes do evento {evento} já está disponível.

Você pode escolher um presente físico, uma experiência especial ou presentear em valor via PIX pelo link abaixo:

{link_lista}

Com carinho 💜`;

function limparTextoWhatsApp(texto: string) {
  return String(texto || "")
    .normalize("NFC")
    // remove caracteres quebrados que já chegam salvos como � no banco/template
    .replace(/\uFFFD/g, "")
    // remove controles invisíveis que podem quebrar URL em alguns navegadores
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function normalizarTelefoneWhatsApp(telefone: string) {
  let numero = String(telefone || "").replace(/\D/g, "");

  // remove todos os DDI 55 repetidos do início
  while (numero.startsWith("55")) {
    numero = numero.slice(2);
  }

  if (!numero) return "";

  return `55${numero}`;
}

function templateWhatsAppEstaQuebrado(template: string | null | undefined) {
  return Boolean(template && /\uFFFD/.test(template));
}

function montarMensagemListaPresentes({
  template,
  nome,
  evento,
  linkLista,
}: {
  template: string | null | undefined;
  nome: string;
  evento: string;
  linkLista: string;
}) {
  // Quando o template salvo no Supabase já vem com �, o emoji original já foi perdido.
  // Para não enviar mensagem quebrada, usamos o padrão do código, onde os emojis estão íntegros.
  const textoBase = templateWhatsAppEstaQuebrado(template)
    ? mensagemPadraoListaPresentes
    : template?.trim() || mensagemPadraoListaPresentes;

  return limparTextoWhatsApp(
    textoBase
      .replaceAll("{nome}", nome || "Convidado")
      .replaceAll("{evento}", evento || "Evento")
      .replaceAll("{link_lista}", linkLista),
  );
}

function criarLinkWhatsApp({
  telefone,
  mensagem,
}: {
  telefone: string;
  mensagem: string;
}) {
  const telefoneFinal = normalizarTelefoneWhatsApp(telefone);

  if (!telefoneFinal) return "";

  const texto = encodeURIComponent(limparTextoWhatsApp(mensagem));

  return `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${texto}`;
}

export default function ConvidadosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [nucleosContatos, setNucleosContatos] = useState<NucleoContato[]>([]);
  const [vinculosContatos, setVinculosContatos] = useState<VinculoContatoNucleo[]>([]);
  const [contatosBasePorId, setContatosBasePorId] = useState<Map<string, ContatoBaseConvidado>>(new Map());
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [presentesPreEvento, setPresentesPreEvento] = useState<PresentePreEvento[]>([]);
  const [form, setForm] = useState<ConvidadoForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const formReturnScrollYRef = useRef(0);
  const [busca, setBusca] = useState("");
  const [filtroRsvp, setFiltroRsvp] = useState("todos");
  const [filtroEnvio, setFiltroEnvio] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [systemDark, setSystemDark] = useState(false);
  const [envioConvitePendenteConfirmacao, setEnvioConvitePendenteConfirmacao] =
    useState<Convidado | null>(null);
  const [confirmandoEnvioConvite, setConfirmandoEnvioConvite] = useState(false);
  const [convidadoPendenteExclusao, setConvidadoPendenteExclusao] =
    useState<Convidado | null>(null);
  const [excluindoConvidado, setExcluindoConvidado] = useState(false);

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
      const statusConviteFiltro = getStatusConviteExibicao(convidado) || "pendente";
      const envioOk =
        filtroEnvio === "todos" ||
        (filtroEnvio === "pendente" &&
          statusConviteFiltro !== "enviado" &&
          statusConviteFiltro !== "enviado_manual" &&
          statusConviteFiltro !== "erro") ||
        (filtroEnvio === "enviado" &&
          (statusConviteFiltro === "enviado" ||
            statusConviteFiltro === "enviado_manual")) ||
        (filtroEnvio === "enviado_manual" &&
          statusConviteFiltro === "enviado_manual") ||
        (filtroEnvio === "erro" && statusConviteFiltro === "erro");
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
          convidado.token,
          convidado.mae,
          convidado.idade_crianca,
          convidado.tamanho_chinelo,
          convidado.contato_principal ? "contato principal" : "",
          convidado.recebe_convite ? "recebe convite" : "",
          convidado.tipo_convite,
          convidado.status_rsvp,
          convidado.status_envio,
          convidado.status_envio_convite,
          getStatusConviteExibicao(convidado),
          convidado.legacy_id,
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

  const nucleoSelecionadoConvite = useMemo(() => {
    const grupoAtual = form.grupo.trim().toLowerCase();

    if (!grupoAtual) return null;

    return (
      nucleosContatos.find(
        (nucleo) => nucleo.nome.trim().toLowerCase() === grupoAtual,
      ) || null
    );
  }, [form.grupo, nucleosContatos]);

  const tipoNucleoConvite = nucleoSelecionadoConvite
    ? labelTipoNucleoConvite(getTipoNucleoConvite(nucleoSelecionadoConvite))
    : form.tipo_convite === "grupo" && form.grupo.trim()
      ? "Núcleo manual"
      : "";

  const nucleosContatosPorId = useMemo(() => {
    return new Map(nucleosContatos.map((nucleo) => [nucleo.id, nucleo]));
  }, [nucleosContatos]);

  const vinculosContatosPorPessoa = useMemo(() => {
    const mapa = new Map<string, VinculoContatoNucleo[]>();

    vinculosContatos.forEach((vinculo) => {
      const atual = mapa.get(vinculo.tenant_contato_id) || [];
      mapa.set(vinculo.tenant_contato_id, [...atual, vinculo]);
    });

    return mapa;
  }, [vinculosContatos]);

  const convidadoEmEdicao = useMemo(() => {
    if (!editandoId) return null;
    return convidados.find((convidado) => convidado.id === editandoId) || null;
  }, [convidados, editandoId]);

  const vinculosNucleoConvidadoAtual = useMemo(() => {
    const contatoId = convidadoEmEdicao?.tenant_contato_id;

    if (!contatoId) return [];

    return vinculosContatosPorPessoa.get(contatoId) || [];
  }, [convidadoEmEdicao?.tenant_contato_id, vinculosContatosPorPessoa]);

  const convidadoTemNucleosVinculados = vinculosNucleoConvidadoAtual.length > 0;

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

  const presentesDiretosPorConvidado = useMemo(() => {
    const mapa = new Map<string, PresentePreEventoCard[]>();

    presentesPreEvento.forEach((presente) => {
      if (!presente.convidado_id) return;

      const atual = mapa.get(presente.convidado_id) || [];
      mapa.set(presente.convidado_id, [...atual, presente]);
    });

    return mapa;
  }, [presentesPreEvento]);

  const presentesHistoricoPorConvidado = useMemo(() => {
    const convidadosPorId = new Map(convidados.map((convidado) => [convidado.id, convidado]));
    const mapa = new Map<string, PresentePreEventoCard[]>();

    presentesPreEvento.forEach((presente) => {
      if (!presente.convidado_id) return;

      const convidadoDoPresente = convidadosPorId.get(presente.convidado_id);
      if (!convidadoDoPresente) return;

      const grupoDoPresente = (convidadoDoPresente.grupo || "").trim();
      const donoHistorico = grupoDoPresente
        ? convidados.find(
            (item) =>
              item.evento_id === convidadoDoPresente.evento_id &&
              (item.grupo || "").trim() === grupoDoPresente &&
              item.contato_principal,
          ) ||
          convidados.find(
            (item) =>
              item.evento_id === convidadoDoPresente.evento_id &&
              (item.grupo || "").trim() === grupoDoPresente &&
              item.recebe_convite,
          ) ||
          convidadoDoPresente
        : convidadoDoPresente;

      const presenteComContexto: PresentePreEventoCard = {
        ...presente,
        convidado_nome: convidadoDoPresente.nome,
        convidado_original_id: convidadoDoPresente.id,
      };

      const atual = mapa.get(donoHistorico.id) || [];
      mapa.set(donoHistorico.id, [...atual, presenteComContexto]);
    });

    return mapa;
  }, [convidados, presentesPreEvento]);

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

  function restaurarPosicaoLista() {
    const scrollY = formReturnScrollYRef.current;

    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    });
  }

  function abrirCriacao() {
    formReturnScrollYRef.current = window.scrollY;
    limparFormulario();
    setFormAberto(true);
  }

  function cancelarFormulario() {
    limparFormulario();
    setFormAberto(false);
    restaurarPosicaoLista();
  }

  function gerarToken() {
    return "EVT-" + Math.floor(100000 + Math.random() * 900000);
  }

  function getTipoNucleoConvite(nucleo: NucleoContato) {
  return nucleo.tipo_nucleo || nucleo.tipo || "outro";
}

function labelTipoNucleoConvite(tipo: string | null | undefined) {
  if (tipo === "familia") return "Família";
  if (tipo === "empresa") return "Empresa";
  if (tipo === "politico") return "Político";
  if (tipo === "corporativo") return "Corporativo";
  if (tipo === "igreja") return "Igreja";
  if (tipo === "associacao") return "Associação";
  if (tipo === "fornecedor") return "Fornecedor";
  return "Outro";
}

function labelPapelNucleoConvite(papel: string | null | undefined) {
  if (papel === "pai") return "Pai";
  if (papel === "mae") return "Mãe";
  if (papel === "filho") return "Filho(a)";
  if (papel === "filha") return "Filha";
  if (papel === "aluno") return "Aluno(a)";
  if (papel === "responsavel") return "Responsável";
  if (papel === "conjuge") return "Cônjuge";
  if (papel === "membro") return "Membro";
  return papel || "Membro";
}

function normalizarTelefone(telefone: string | null) {
    if (!telefone) return "";
    return telefone.replace(/\D/g, "");
  }

  function temTelefoneEnvioFormulario(formulario: ConvidadoForm) {
    return Boolean(
      normalizarTelefone(formulario.telefone) ||
        normalizarTelefone(formulario.responsavel_telefone),
    );
  }

  function tipoContatoEhCrianca(tipoContato: string | null | undefined) {
    return String(tipoContato || "").trim().toLowerCase() === "crianca";
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

  function getEventoDoConvidado(convidado: Convidado) {
    const idEvento = convidado.evento_id || eventoId;
    return eventos.find((evento) => evento.id === idEvento) || null;
  }

  function listaPresentesAtiva(convidado: Convidado) {
    const eventoAtual = getEventoDoConvidado(convidado);
    return eventoAtual?.lista_presentes_ativa === true;
  }

  function gerarLinkListaPresentes(convidado: Convidado) {
    const eventoAtual = getEventoDoConvidado(convidado);

    if (eventoAtual?.lista_presentes_ativa !== true) {
      return "";
    }

    const identificador =
      eventoAtual?.slug || eventoAtual?.id || convidado.evento_id || eventoId;

    const token = encodeURIComponent(convidado.token || "");

    if (!identificador) return "";

    const base = `/lista-presentes/${identificador}`;

    if (!token) return base;

    return `${base}?token=${token}`;
  }

  function gerarLinkWhatsAppListaPresentes(convidado: Convidado) {
    const telefone = normalizarTelefone(
      convidado.telefone || convidado.responsavel_telefone,
    );

    if (!telefone) return "";

    const linkLista = `${window.location.origin}${gerarLinkListaPresentes(convidado)}`;
    const eventoAtual = getEventoDoConvidado(convidado);

    const mensagem = montarMensagemListaPresentes({
      template: eventoAtual?.lista_presentes_mensagem,
      nome: convidado.nome || "Convidado",
      evento: eventoAtual?.nome || "Evento",
      linkLista,
    });

    return criarLinkWhatsApp({ telefone, mensagem });
  }

  function getTelefoneEnvioConvidado(convidado: Convidado) {
    return normalizarTelefone(convidado.telefone || convidado.responsavel_telefone);
  }

  function montarMensagemConviteWhatsApp(convidado: Convidado) {
    const eventoAtual = getEventoDoConvidado(convidado);
    const linkConvite = `${window.location.origin}${gerarLinkConvite(convidado)}`;

    return limparTextoWhatsApp(`Olá ${convidado.nome || "Convidado"}

Você está convidado(a) para o evento ${eventoAtual?.nome || ""}.

Acesse seu convite digital e confirme presença:
${linkConvite}

Com carinho,
${eventoAtual?.nome || "OmniStage"}`);
  }

  function gerarLinkWhatsApp(convidado: Convidado) {
    const telefone = getTelefoneEnvioConvidado(convidado);

    if (!telefone) return "";

    return criarLinkWhatsApp({
      telefone,
      mensagem: montarMensagemConviteWhatsApp(convidado),
    });
  }

  function abrirWhatsAppConvitePeloCard(convidado: Convidado) {
    const linkWhatsApp = gerarLinkWhatsApp(convidado);

    if (!linkWhatsApp) {
      alert("Este convidado não tem telefone próprio nem telefone do responsável.");
      return;
    }

    const conviteJaEnviado =
      convidado.status_envio_convite === "enviado" ||
      convidado.status_envio_convite === "enviado_manual" ||
      convidado.status_envio === "enviado" ||
      convidado.status_envio === "enviado_manual";

    if (conviteJaEnviado) {
      const confirmarReenvio = window.confirm(
        "Este convite já está marcado como enviado. Deseja abrir o WhatsApp mesmo assim?",
      );

      if (!confirmarReenvio) return;
    }

    window.open(linkWhatsApp, "_blank", "noopener,noreferrer");
    setEnvioConvitePendenteConfirmacao(convidado);
  }

  async function confirmarEnvioConvitePeloCard() {
    if (!envioConvitePendenteConfirmacao || confirmandoEnvioConvite) return;

    const convidado = envioConvitePendenteConfirmacao;
    const agora = new Date().toISOString();
    const telefone = getTelefoneEnvioConvidado(convidado);
    const mensagem = montarMensagemConviteWhatsApp(convidado);
    const eventoDoConvidado = convidado.evento_id || eventoId;

    if (!tenantId || !eventoDoConvidado) {
      alert("Não foi possível identificar a empresa ou o evento deste convidado.");
      return;
    }

    if (!telefone) {
      alert("Este convidado não tem telefone próprio nem telefone do responsável.");
      return;
    }

    setConfirmandoEnvioConvite(true);

    try {
      const { error } = await supabase
        .from("convidados")
        .update({
          status_envio: "enviado_manual",
          status_envio_convite: "enviado_manual",
          data_envio_convite: agora,
          ...(convidado.status_rsvp === "confirmado"
            ? {
                status_envio_lembrete_rsvp: "nao_necessario",
                data_envio_lembrete_rsvp: null,
              }
            : {}),
        })
        .eq("id", convidado.id)
        .eq("tenant_id", tenantId)
        .eq("evento_id", eventoDoConvidado);

      if (error) {
        throw new Error(error.message);
      }

      await supabase.from("envio_historico").insert({
        evento_id: eventoDoConvidado,
        convidado_id: convidado.id,
        tipo_envio: "convite",
        canal: "whatsapp",
        telefone,
        mensagem,
        status: "enviado",
        detalhe: "Enviado Card Convidado.",
      });

      await supabase
        .from("envio_fila")
        .update({
          status: "enviado",
          processado_em: agora,
          updated_at: agora,
        })
        .eq("evento_id", eventoDoConvidado)
        .eq("convidado_id", convidado.id)
        .eq("tipo_envio", "convite")
        .eq("status", "pendente");

      setConvidados((current) =>
        current.map((item) =>
          item.id === convidado.id
            ? {
                ...item,
                status_envio: "enviado_manual",
                status_envio_convite: "enviado_manual",
                data_envio_convite: agora,
                ...(convidado.status_rsvp === "confirmado"
                  ? {
                      status_envio_lembrete_rsvp: "nao_necessario",
                      data_envio_lembrete_rsvp: null,
                    }
                  : {}),
              }
            : item,
        ),
      );

      setEnvioConvitePendenteConfirmacao(null);
      alert("Convite marcado como Enviado Card Convidado.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao marcar convite como enviado.",
      );
    } finally {
      setConfirmandoEnvioConvite(false);
    }
  }

  function cancelarConfirmacaoEnvioConvitePeloCard() {
    setEnvioConvitePendenteConfirmacao(null);
    setConfirmandoEnvioConvite(false);
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
      .select("id, nome, slug, lista_presentes_ativa, lista_presentes_mensagem")
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

  async function carregarNucleosContatos(tenant: string) {
    const { data, error } = await supabase
      .from("contato_grupos")
      .select("id, nome, tipo, tipo_nucleo")
      .eq("tenant_id", tenant)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar núcleos de contatos:", error.message);
      setNucleosContatos([]);
      return;
    }

    setNucleosContatos((data || []) as NucleoContato[]);
  }

  async function carregarVinculosContatos(tenant: string) {
    const { data, error } = await supabase
      .from("contato_grupo_membros")
      .select(
        `
        id,
        tenant_id,
        grupo_contato_id,
        tenant_contato_id,
        papel,
        papel_nucleo,
        recebe_comunicacao,
        principal_envio
      `,
      )
      .eq("tenant_id", tenant);

    if (error) {
      console.error("Erro ao carregar vínculos dos contatos:", error.message);
      setVinculosContatos([]);
      return;
    }

    setVinculosContatos((data || []) as VinculoContatoNucleo[]);
  }

  async function carregarPresentesPreEvento(evento: string) {
    if (!evento) {
      setPresentesPreEvento([]);
      return;
    }

    const { data, error } = await supabase
      .from("gift_reservations")
      .select(
        `
        id,
        gift_item_id,
        convidado_id,
        token_convite,
        nome_presenteador,
        mensagem,
        valor_presenteado,
        created_at,
        origem,
        status
      `,
      )
      .eq("evento_id", evento)
      .in("status", ["presenteado", "presenteado_evento"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar presentes pré-evento:", error.message);
      setPresentesPreEvento([]);
      return;
    }

    const reservas = (data || []) as PresentePreEvento[];
    const giftItemIds = Array.from(
      new Set(reservas.map((presente) => presente.gift_item_id).filter(Boolean) as string[]),
    );

    if (giftItemIds.length === 0) {
      setPresentesPreEvento(reservas);
      return;
    }

    const { data: giftItemsData, error: giftItemsError } = await supabase
      .from("gift_items")
      .select("id, nome, tipo")
      .in("id", giftItemIds);

    if (giftItemsError) {
      console.error("Erro ao carregar itens dos presentes:", giftItemsError.message);
      setPresentesPreEvento(reservas);
      return;
    }

    const itensPorId = new Map(
      (giftItemsData || []).map((item: any) => [item.id, { nome: item.nome, tipo: item.tipo }]),
    );

    setPresentesPreEvento(
      reservas.map((presente) => ({
        ...presente,
        gift_items: presente.gift_item_id
          ? itensPorId.get(presente.gift_item_id) || null
          : null,
      })),
    );
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
        tenant_contato_id,
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
        status_envio_convite,
        data_envio_convite,
        status_envio_lembrete_rsvp,
        data_envio_lembrete_rsvp,
        status_envio_cartao,
        data_envio_cartao,
        status_checkin,
        token,
        evento_id,
        created_at,
        legacy_id,
        origem_importacao,
        import_batch_id,
        data_hora_rsvp,
        data_hora_envio
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

    const convidadosData = (data || []) as Convidado[];
    const contatosBase = await carregarContatosBaseDosConvidados(tenant, convidadosData);

    setConvidados(normalizarConvidadosImportadosDeContatos(convidadosData, contatosBase));
    await carregarPresentesPreEvento(evento);
  }

  async function carregarContatosBaseDosConvidados(tenant: string, convidadosData: Convidado[]) {
    const contatosIds = Array.from(
      new Set(
        convidadosData
          .map((convidado) => convidado.tenant_contato_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (contatosIds.length === 0) {
      const mapaVazio = new Map<string, ContatoBaseConvidado>();
      setContatosBasePorId(mapaVazio);
      return mapaVazio;
    }

    const { data, error } = await supabase
      .from("tenant_contatos")
      .select("id, tipo_contato, responsavel_nome, responsavel_telefone")
      .eq("tenant_id", tenant)
      .in("id", contatosIds);

    if (error) {
      console.error("Erro ao carregar dados-base dos contatos:", error.message);
      const mapaVazio = new Map<string, ContatoBaseConvidado>();
      setContatosBasePorId(mapaVazio);
      return mapaVazio;
    }

    const mapa = new Map(
      ((data || []) as ContatoBaseConvidado[]).map((contato) => [contato.id, contato]),
    );

    setContatosBasePorId(mapa);
    return mapa;
  }

  function normalizarConvidadosImportadosDeContatos(
    convidadosData: Convidado[],
    contatosBase: Map<string, ContatoBaseConvidado>,
  ) {
    return convidadosData.map((convidado) => {
      if (!convidado.tenant_contato_id) return convidado;

      const contatoBase = contatosBase.get(convidado.tenant_contato_id);
      if (!contatoBase || !tipoContatoEhCrianca(contatoBase.tipo_contato)) return convidado;

      return {
        ...convidado,
        crianca: convidado.crianca || "sim",
        responsavel: convidado.responsavel || contatoBase.responsavel_nome || null,
        responsavel_telefone:
          convidado.responsavel_telefone || contatoBase.responsavel_telefone || null,
      };
    });
  }

  async function iniciarTela() {
    const tenant = await carregarTenant();

    if (tenant) {
      await Promise.all([
        carregarEventos(tenant),
        carregarNucleosContatos(tenant),
        carregarVinculosContatos(tenant),
      ]);
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
      setPresentesPreEvento([]);
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
      const grupoFinal = grupoNormalizado;
      const responsavelNormalizado = form.responsavel.trim();
      const responsavelTelefoneNormalizado = form.responsavel_telefone.trim();
      const maeNormalizada = responsavelNormalizado || form.mae.trim();
      const idadeCriancaNormalizada = form.idade_crianca.trim();
      const criancaSelecionada = form.crianca === "sim" || Boolean(idadeCriancaNormalizada);
      const criancaSemGrupoViaResponsavel =
        criancaSelecionada && !grupoFinal && Boolean(responsavelNormalizado);

      if (conviteEhGrupo && !grupoFinal) {
        alert("Informe o núcleo ou altere o tipo do convite para Individual.");
        return;
      }

      if (criancaSemGrupoViaResponsavel && !responsavelTelefoneNormalizado) {
        alert("Informe o telefone do responsável pelo envio.");
        return;
      }

      const telefonePrincipal = form.telefone.trim();
      const convidadoEditando = editandoId
        ? convidados.find((convidado) => convidado.id === editandoId) || null
        : null;
      const contatoBaseEditando = convidadoEditando?.tenant_contato_id
        ? contatosBasePorId.get(convidadoEditando.tenant_contato_id) || null
        : null;
      const contatoBaseEditandoEhCrianca = tipoContatoEhCrianca(contatoBaseEditando?.tipo_contato);
      const criancaFinal = criancaSelecionada || contatoBaseEditandoEhCrianca;
      const responsavelFinal = responsavelNormalizado || maeNormalizada ||
        (criancaFinal ? contatoBaseEditando?.responsavel_nome || "" : "");
      const responsavelTelefoneFinal = responsavelTelefoneNormalizado ||
        (criancaFinal ? contatoBaseEditando?.responsavel_telefone || "" : "");

      const payload = {
        nome: form.nome.trim(),
        telefone: telefonePrincipal || null,
        email: form.email.trim() || null,
        grupo: grupoFinal || null,
        crianca: criancaFinal || responsavelFinal ? "sim" : form.crianca,
        mae: maeNormalizada || responsavelFinal || null,
        responsavel: responsavelFinal || null,
        responsavel_telefone: responsavelTelefoneFinal || null,
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

      const estavaEditando = Boolean(editandoId);

      limparFormulario();
      setFormAberto(false);
      await carregarConvidados(tenantId, eventoId);
      restaurarPosicaoLista();
      alert(estavaEditando ? "Convidado atualizado." : "Convidado criado.");
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

  function getPapelVinculoContato(vinculo: VinculoContatoNucleo) {
    return vinculo.papel_nucleo || vinculo.papel || "membro";
  }

  function getNucleoPrincipalDoContato(tenantContatoId: string | null | undefined) {
    if (!tenantContatoId) return null;

    const vinculos = vinculosContatosPorPessoa.get(tenantContatoId) || [];
    const vinculoPrincipal =
      vinculos.find((vinculo) => Boolean(vinculo.principal_envio)) ||
      vinculos.find((vinculo) => Boolean(vinculo.recebe_comunicacao)) ||
      vinculos.find((vinculo) => getPapelVinculoContato(vinculo) === "responsavel") ||
      vinculos[0] ||
      null;

    if (!vinculoPrincipal) return null;

    const nucleo = nucleosContatosPorId.get(vinculoPrincipal.grupo_contato_id);
    if (!nucleo) return null;

    return { nucleo, vinculo: vinculoPrincipal };
  }

  function editarConvidado(convidado: Convidado) {
    formReturnScrollYRef.current = window.scrollY;

    const contatoBase = convidado.tenant_contato_id
      ? contatosBasePorId.get(convidado.tenant_contato_id) || null
      : null;
    const contatoBaseEhCrianca = tipoContatoEhCrianca(contatoBase?.tipo_contato);
    const grupoFinal = convidado.grupo || "";
    const contatoPrincipalFinal = convidado.contato_principal ?? false;
    const recebeConviteFinal = convidado.recebe_convite ?? true;
    const responsavelFinal =
      convidado.responsavel || convidado.mae || contatoBase?.responsavel_nome || "";

    setEditandoId(convidado.id);
    setForm({
      nome: convidado.nome || "",
      telefone: convidado.telefone || "",
      email: convidado.email || "",
      grupo: grupoFinal,
      crianca: contatoBaseEhCrianca || convidado.responsavel || convidado.mae
        ? "sim"
        : convidado.crianca || "",
      responsavel: responsavelFinal,
      responsavel_telefone: convidado.responsavel_telefone || contatoBase?.responsavel_telefone || "",
      mae: convidado.mae || "",
      idade_crianca: convidado.idade_crianca
        ? String(convidado.idade_crianca)
        : "",
      tamanho_chinelo: convidado.tamanho_chinelo || "",
      contato_principal: Boolean(contatoPrincipalFinal),
      recebe_convite: Boolean(recebeConviteFinal),
      tipo_convite: convidado.tipo_convite || "individual",
      observacoes: convidado.observacoes || "",
      status_rsvp: convidado.status_rsvp || "pendente",
      status_envio: convidado.status_envio || "pendente",
    });
    setFormAberto(true);
  }

  function solicitarExclusaoConvidado(convidado: Convidado) {
    setConvidadoPendenteExclusao(convidado);
  }

  function cancelarExclusaoConvidado() {
    if (excluindoConvidado) return;
    setConvidadoPendenteExclusao(null);
  }

  async function confirmarExclusaoConvidado() {
    if (!tenantId || !eventoId || !convidadoPendenteExclusao) return;

    setExcluindoConvidado(true);

    try {
      const { error } = await supabase
        .from("convidados")
        .delete()
        .eq("id", convidadoPendenteExclusao.id)
        .eq("tenant_id", tenantId)
        .eq("evento_id", eventoId);

      if (error) {
        throw new Error(error.message);
      }

      setConvidados((current) =>
        current.filter((item) => item.id !== convidadoPendenteExclusao.id),
      );
      setConvidadoPendenteExclusao(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? "Erro ao excluir convidado: " + error.message
          : "Erro ao excluir convidado.",
      );
    } finally {
      setExcluindoConvidado(false);
    }
  }

  function convidadoTemDadosImportados(convidado: Convidado) {
    return Boolean(
      convidado.legacy_id ||
        convidado.origem_importacao ||
        convidado.import_batch_id ||
        convidado.data_hora_rsvp ||
        convidado.data_hora_envio,
    );
  }

  function labelOrigemImportacao(valor: string | null | undefined) {
    if (!valor) return "Importação";

    if (valor === "smart_paste") return "Lista inteligente";
    if (valor === "csv") return "CSV";
    if (valor === "google_sheets") return "Google Sheets";
    if (valor === "vcf") return "VCF";

    return valor;
  }

  function getStatusConviteExibicao(convidado: Convidado) {
    const statusAtual = convidado.status_envio_convite || convidado.status_envio;

    if (statusAtual === "enviado" || statusAtual === "enviado_manual" || statusAtual === "erro") {
      return statusAtual;
    }

    if (convidado.data_envio_convite || convidado.data_hora_envio) {
      return "enviado";
    }

    return statusAtual || "pendente";
  }

  function getDataConviteExibicao(convidado: Convidado) {
    return convidado.data_envio_convite || convidado.data_hora_envio || null;
  }

  function getOrigemConviteExibicao(convidado: Convidado) {
    const statusAtual = convidado.status_envio_convite || convidado.status_envio;

    if (convidado.data_hora_envio && statusAtual !== "enviado") {
      return "Envio importado";
    }

    return undefined;
  }


  function normalizarStatusEnvioConviteCard(convidado: Convidado) {
    const statusAtual = convidado.status_envio_convite || convidado.status_envio;

    if (statusAtual === "enviado" || statusAtual === "enviado_manual") {
      return null;
    }

    if (!getTelefoneEnvioConvidado(convidado)) {
      return null;
    }

    return {
      status_envio: "enviado_manual",
      status_envio_convite: "enviado_manual",
      data_envio_convite: new Date().toISOString(),
      ...(convidado.status_rsvp === "confirmado"
        ? {
            status_envio_lembrete_rsvp: "nao_necessario",
            data_envio_lembrete_rsvp: null,
          }
        : {}),
    };
  }

  async function sincronizarEnviosCardPendentes() {
    if (!tenantId || !eventoId) return;

    const candidatos = convidados.filter((convidado) => {
      const payload = normalizarStatusEnvioConviteCard(convidado);
      return Boolean(payload);
    });

    if (candidatos.length === 0) return;

    const confirmar = window.confirm(
      `Encontramos ${candidatos.length} convidado(s) com telefone/responsável e convite ainda pendente. Deseja marcar como Enviado Card Convidado para remover da fila de envio?`,
    );

    if (!confirmar) return;

    setLoading(true);

    try {
      for (const convidado of candidatos) {
        const payload = normalizarStatusEnvioConviteCard(convidado);
        if (!payload) continue;

        const { error } = await supabase
          .from("convidados")
          .update(payload)
          .eq("id", convidado.id)
          .eq("tenant_id", tenantId)
          .eq("evento_id", convidado.evento_id || eventoId);

        if (error) {
          throw new Error(error.message);
        }
      }

      await carregarConvidados(tenantId, eventoId);
      alert(`${candidatos.length} convidado(s) marcados como Enviado Card Convidado.`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao sincronizar envios pelo card.",
      );
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    if (!formAberto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [formAberto]);

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

            <button
              onClick={sincronizarEnviosCardPendentes}
              disabled={loading || !tenantId || !eventoId}
              style={secondaryButtonStyle}
            >
              Sincronizar enviados pelo card
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
        <div
          style={guestFormOverlayStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-form-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelarFormulario();
            }
          }}
        >
          <section
            style={guestFormModalStyle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={sectionHeaderStyle}>
            <div>
              <div style={sectionKickerStyle}>
                {editandoId ? "Atualizar cadastro" : "Novo cadastro"}
              </div>
              <h2 id="guest-form-title" style={cardTitleStyle}>
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
                  <p>Defina se é adulto ou criança. Quando for criança, informe quem receberá a comunicação.</p>
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

              {form.crianca === "sim" && (
                <div style={responsavelSubBlockStyle}>
                  <div style={subBlockHeaderStyle}>
                    <strong>Responsável pelo envio</strong>
                    <span>
                      Informe o responsável que receberá a comunicação da criança.
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
                  <p>Defina se este convite será individual ou se ficará agrupado em um dos núcleos vinculados ao contato.</p>
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
                        grupo: current.grupo,
                        contato_principal: tipo === "grupo" ? current.contato_principal : false,
                        recebe_convite: tipo === "grupo"
                          ? temTelefoneEnvioFormulario(current) && current.recebe_convite
                          : true,
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="individual">Individual</option>
                    <option value="grupo">Núcleo</option>
                  </select>
                </label>
              </div>

              <div style={nucleosVinculadosConviteWrapperStyle}>
                <div style={nucleosVinculadosConviteHeaderStyle}>
                  <strong>Núcleos vinculados ao contato</strong>
                  <span>No convite individual, o núcleo serve apenas para visualização/filtro. No convite por núcleo, ele agrupa convite e cartão.</span>
                </div>

                {!editandoId && (
                  <div style={emptyStyle}>Salve ou edite um convidado vinculado a um contato para visualizar os núcleos.</div>
                )}

                {editandoId && !convidadoTemNucleosVinculados && (
                  <div style={emptyStyle}>Este contato não possui núcleos vinculados.</div>
                )}

                {convidadoTemNucleosVinculados && (
                  <div style={nucleosVinculadosConviteListStyle}>
                    {vinculosNucleoConvidadoAtual.map((vinculo) => {
                      const nucleo = nucleosContatosPorId.get(vinculo.grupo_contato_id);
                      const nomeNucleo = nucleo?.nome || "Núcleo não encontrado";
                      const nucleoMarcado =
                        form.grupo.trim().toLowerCase() === nomeNucleo.trim().toLowerCase();
                      const convitePorNucleo = form.tipo_convite === "grupo";
                      const temTelefoneSalvo = temTelefoneEnvioFormulario(form);

                      return (
                        <div
                          key={vinculo.id}
                          style={{
                            ...nucleoVinculadoConviteCardStyle,
                            ...(nucleoMarcado ? nucleoVinculadoConviteCardActiveStyle : {}),
                          }}
                        >
                          <div>
                            <strong>{nomeNucleo}</strong>
                            <span style={nucleoVinculadoConviteSubTextStyle}>
                              Relação no núcleo: {labelPapelNucleoConvite(getPapelVinculoContato(vinculo))}
                            </span>
                          </div>

                          <div style={nucleoVinculadoConviteFlagsStyle}>
                            <label style={compactNucleoToggleStyle}>
                              <input
                                type="checkbox"
                                checked={nucleoMarcado}
                                onChange={(event) => {
                                  const checked = event.target.checked;

                                  setForm((current) => {
                                    const convitePorNucleoAtual = current.tipo_convite === "grupo";
                                    const temTelefoneSalvoAtual = temTelefoneEnvioFormulario(current);

                                    return {
                                      ...current,
                                      tipo_convite: current.tipo_convite,
                                      grupo: checked ? nomeNucleo : "",
                                      contato_principal: checked && convitePorNucleoAtual
                                        ? current.contato_principal
                                        : false,
                                      recebe_convite: checked && convitePorNucleoAtual
                                        ? temTelefoneSalvoAtual
                                        : true,
                                    };
                                  });
                                }}
                              />
                              <span>{convitePorNucleo ? "Agrupar convite neste núcleo" : "Visualizar convite neste núcleo"}</span>
                            </label>

                            <label style={compactNucleoToggleStyle}>
                              <input
                                type="checkbox"
                                checked={convitePorNucleo && nucleoMarcado && form.recebe_convite && temTelefoneSalvo}
                                disabled={!convitePorNucleo || !nucleoMarcado || !temTelefoneSalvo}
                                onChange={(event) =>
                                  updateFormBoolean("recebe_convite", event.target.checked)
                                }
                              />
                              <span>Recebe comunicação</span>
                            </label>

                            <label style={compactNucleoToggleStyle}>
                              <input
                                type="checkbox"
                                checked={convitePorNucleo && nucleoMarcado && form.contato_principal}
                                disabled={!convitePorNucleo || !nucleoMarcado}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setForm((current) => ({
                                    ...current,
                                    contato_principal: checked,
                                  }));
                                }}
                              />
                              <span>Principal núcleo</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
                    <option value="enviado_manual">Enviado Card Convidado</option>
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
        </div>
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
            <option value="enviado_manual">Card Convidado</option>
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
            const grupoComNome =
              Boolean(grupo) && !grupo.startsWith("__individual__");
            const todosConvitesIndividuais = integrantes.every(
              (item) => (item.tipo_convite || "individual") === "individual",
            );
            const visualizacaoEmGrupo = grupoComNome && todosConvitesIndividuais;
            const conviteAgrupadoPorNucleo = grupoComNome && !todosConvitesIndividuais;
            const mostrarGrupo = grupoComNome;

            return (
              <article key={grupo} style={groupCardLargeStyle}>
                {mostrarGrupo && (
                  <>
                    <div style={groupCardHeaderStyle}>
                      <div>
                        <span style={groupEyebrowStyle}>
                          {visualizacaoEmGrupo ? "Visualização em grupo" : "Grupo encontrado"}
                        </span>
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
                    const presentesDiretos =
                      presentesDiretosPorConvidado.get(convidado.id) || [];
                    const presentesHistorico =
                      presentesHistoricoPorConvidado.get(convidado.id) || [];
                    const convidadoPresenteouPreEvento =
                      presentesDiretos.length > 0 || presentesHistorico.length > 0;

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
                            {visualizacaoEmGrupo ? (
                              <> · Individual · Visualização em grupo: {grupo}</>
                            ) : conviteAgrupadoPorNucleo ? (
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

                          {convidadoPresenteouPreEvento && (
                            <div style={giftStatusRowStyle}>
                              <span style={giftStatusBadgeStyle}>
                                🎁 Presenteou antes do evento
                              </span>
                            </div>
                          )}

                          {presentesHistorico.length > 0 && (
                            <details style={giftDetailsStyle}>
                              <summary style={giftDetailsSummaryStyle}>
                                <div style={giftDetailsHeaderStyle}>
                                  <span style={giftDetailsBadgeStyle}>Presentes</span>
                                  <strong>Histórico pré-evento</strong>
                                  <span style={giftDetailsHintStyle}>
                                    {presentesHistorico.length} presente
                                    {presentesHistorico.length === 1 ? "" : "s"} · Clique para ver
                                  </span>
                                </div>
                              </summary>

                              <div style={giftDetailsListStyle}>
                                {presentesHistorico.map((presente) => (
                                  <div key={presente.id} style={giftDetailsItemStyle}>
                                    {mostrarGrupo &&
                                      presente.convidado_original_id &&
                                      presente.convidado_original_id !== convidado.id && (
                                        <span style={giftLinkedGuestStyle}>
                                          Integrante vinculado: {presente.convidado_nome || "-"}
                                        </span>
                                      )}

                                    <span>
                                      <strong>Presenteador:</strong>{" "}
                                      {presente.nome_presenteador || "-"}
                                    </span>

                                    <span>
                                      <strong>Presente escolhido:</strong>{" "}
                                      {getNomeGiftItem(presente)}
                                    </span>

                                    <span>
                                      <strong>Valor:</strong>{" "}
                                      {formatarMoedaPresente(presente.valor_presenteado)}
                                    </span>

                                    <span>
                                      <strong>Mensagem:</strong>{" "}
                                      {presente.mensagem || "Sem mensagem"}
                                    </span>

                                    <span>
                                      <strong>Data:</strong>{" "}
                                      {formatarDataHoraCurta(presente.created_at) || "-"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
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

                          {convidadoTemDadosImportados(convidado) && (
                            <details style={importInfoStyle}>
                              <summary style={importInfoSummaryStyle}>
                                <div style={importInfoHeaderStyle}>
                                  <span style={importBadgeStyle}>Dados importados</span>
                                  <strong>Origem / Importação</strong>
                                  <span style={importInfoHintStyle}>Clique para ver histórico</span>
                                </div>
                              </summary>

                              <div style={importInfoGridStyle}>
                                <span>
                                  <strong>Origem:</strong>{" "}
                                  {labelOrigemImportacao(convidado.origem_importacao)}
                                </span>

                                <span>
                                  <strong>ID importação:</strong>{" "}
                                  {convidado.import_batch_id || "-"}
                                </span>

                                <span>
                                  <strong>Legacy ID:</strong>{" "}
                                  {convidado.legacy_id || "-"}
                                </span>

                                {convidado.data_hora_envio && (
                                  <span>
                                    <strong>Envio importado:</strong>{" "}
                                    {formatarDataHoraCurta(convidado.data_hora_envio) || convidado.data_hora_envio}
                                  </span>
                                )}

                                {convidado.data_hora_rsvp && (
                                  <span>
                                    <strong>RSVP importado:</strong>{" "}
                                    {formatarDataHoraCurta(convidado.data_hora_rsvp) || convidado.data_hora_rsvp}
                                  </span>
                                )}
                              </div>
                            </details>
                          )}

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
                              <button
                                type="button"
                                onClick={() => abrirWhatsAppConvitePeloCard(convidado)}
                                style={goldButtonStyle}
                              >
                                WhatsApp
                              </button>
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

                            {listaPresentesAtiva(convidado) && linkWhatsAppListaPresentes ? (
                              <a
                                href={linkWhatsAppListaPresentes}
                                target="_blank"
                                rel="noreferrer"
                                style={giftButtonStyle}
                              >
                                Enviar lista de presentes
                              </a>
                            ) : listaPresentesAtiva(convidado) ? (
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
                            ) : null}

                            {listaPresentesAtiva(convidado) && linkListaPresentes && (
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
  Cartão HTML
</a>

<a
  href={`/cartao/${encodeURIComponent(convidado.token || "")}`}
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

                          <div style={enviosResumoStyle}>
                            <strong style={enviosResumoTituloStyle}>Envios</strong>

                            <EnvioLinha
                              label="Convite"
                              status={getStatusConviteExibicao(convidado)}
                              data={getDataConviteExibicao(convidado)}
                              origem={getOrigemConviteExibicao(convidado)}
                            />

                            <EnvioLinha
                              label="Lembrete RSVP"
                              status={
                                convidado.status_rsvp === "confirmado"
                                  ? "nao_necessario"
                                  : convidado.status_envio_lembrete_rsvp
                              }
                              data={
                                convidado.status_rsvp === "confirmado"
                                  ? null
                                  : convidado.data_envio_lembrete_rsvp
                              }
                            />

                            <EnvioLinha
                              label="Cartão"
                              status={convidado.status_envio_cartao}
                              data={convidado.data_envio_cartao}
                            />

                            {listaPresentesAtiva(convidado) && (
                              <EnvioLinha
                                label="Lista presentes"
                                status="pendente"
                                data={null}
                              />
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: 12,
                              width: "100%",
                              display: "flex",
                              justifyContent: "flex-end",
                            }}
                          >
                            <span style={getCheckinStyle(convidado.status_checkin)}>
                              Check-in: {labelCheckin(convidado.status_checkin)}
                            </span>
                          </div>

                          <div style={rowActionsStyle}>
                            <button
                              onClick={() => editarConvidado(convidado)}
                              style={smallButtonStyle}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => solicitarExclusaoConvidado(convidado)}
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

      {convidadoPendenteExclusao && (
        <div
          style={deleteConfirmOverlayStyle}
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelarExclusaoConvidado();
          }}
        >
          <div style={deleteConfirmModalStyle} onMouseDown={(event) => event.stopPropagation()}>
            <div style={deleteConfirmIconStyle}>!</div>

            <span style={deleteConfirmEyebrowStyle}>Excluir convidado</span>

            <h3 style={deleteConfirmTitleStyle}>
              Excluir {convidadoPendenteExclusao.nome || "este convidado"}?
            </h3>

            <p style={deleteConfirmTextStyle}>
              Esta ação remove o convidado deste evento e não poderá ser desfeita.
              Confirme apenas se este cadastro foi criado por engano.
            </p>

            <div style={deleteConfirmActionsStyle}>
              <button
                type="button"
                onClick={cancelarExclusaoConvidado}
                disabled={excluindoConvidado}
                style={deleteCancelButtonStyle}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarExclusaoConvidado}
                disabled={excluindoConvidado}
                style={
                  excluindoConvidado
                    ? { ...deleteConfirmButtonStyle, opacity: 0.65, cursor: "wait" }
                    : deleteConfirmButtonStyle
                }
              >
                {excluindoConvidado ? "Excluindo..." : "Excluir convidado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {envioConvitePendenteConfirmacao && (
        <div style={sendConfirmOverlayStyle}>
          <div style={sendConfirmModalStyle}>
            <span style={sendConfirmEyebrowStyle}>WhatsApp aberto</span>

            <h3 style={sendConfirmTitleStyle}>
              Você enviou o convite?
            </h3>

            <p style={sendConfirmTextStyle}>
              Confirme apenas se a mensagem foi enviada no WhatsApp para {" "}
              <strong>{envioConvitePendenteConfirmacao.nome || "este convidado"}</strong>.
              Ao confirmar, o sistema marca como enviado, registra o horário e retira este convidado da fila “A enviar”.
            </p>

            <div style={sendConfirmActionsStyle}>
              <button
                type="button"
                onClick={cancelarConfirmacaoEnvioConvitePeloCard}
                disabled={confirmandoEnvioConvite}
                style={sendCancelButtonStyle}
              >
                Não enviei
              </button>

              <button
                type="button"
                onClick={confirmarEnvioConvitePeloCard}
                disabled={confirmandoEnvioConvite}
                style={
                  confirmandoEnvioConvite
                    ? { ...sendConfirmButtonStyle, opacity: 0.65, cursor: "wait" }
                    : sendConfirmButtonStyle
                }
              >
                {confirmandoEnvioConvite ? "Marcando..." : "Sim, marque como enviado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EnvioLinha({
  label,
  status,
  data,
  origem,
}: {
  label: string;
  status: string | null;
  data: string | null;
  origem?: string;
}) {
  const enviado = status === "enviado" || status === "enviado_manual";

  return (
    <div style={envioLinhaStyle}>
      <span style={envioLinhaLabelStyle}>{label}</span>

      <span style={getEnvioStyle(status)}>
        {labelEnvio(status)}
      </span>

      {enviado && data && (
        <small style={envioLinhaDataStyle}>
          {formatarDataHoraCurta(data)}
        </small>
      )}

      {enviado && origem && (
        <small style={envioOrigemCardStyle}>
          {origem}
        </small>
      )}
    </div>
  );
}

function labelRsvp(status: string | null) {
  if (status === "confirmado") return "Confirmado";
  if (status === "nao") return "Não vai";
  return "Pendente";
}

function labelEnvio(status: string | null) {
  if (status === "enviado") return "Enviado";
  if (status === "enviado_manual") return "Enviado Card Convidado";
  if (status === "nao_necessario") return "Não necessário";
  if (status === "erro") return "Erro";
  return "Pendente";
}

function formatarDataHoraCurta(data: string | null) {
  if (!data) return "";

  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarMoedaPresente(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "Valor não informado";
  }

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getNomeGiftItem(presente: PresentePreEventoCard) {
  const item = Array.isArray(presente.gift_items)
    ? presente.gift_items[0]
    : presente.gift_items;

  return item?.nome || "Presente em valor";
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

function labelCheckin(status: string | null) {
  if (status === "entrou") return "Entrou";

  if (status === "entrou_excecao") {
    return "Entrou sem RSVP";
  }

  return "Não entrou";
}

function getCheckinStyle(status: string | null): CSSProperties {
  if (status === "entrou") {
    return {
      ...statusStyle,
      background: "#dcfce7",
      color: "#166534",
      fontWeight: 900,
    };
  }

  if (status === "entrou_excecao") {
    return {
      ...statusStyle,
      background: "#FDE7D8",
      color: "#7C2D12",
      border: "1px solid rgba(124,45,18,0.18)",
      fontWeight: 900,
    };
  }

  return {
    ...statusStyle,
    background: "var(--soft-bg)",
    color: "var(--text-secondary)",
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

  if (status === "enviado_manual") {
    return {
      ...statusStyle,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "nao_necessario") {
    return {
      ...statusStyle,
      background: "#ecfccb",
      color: "#3f6212",
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

function NucleoConviteSelector({
  nucleos,
  value,
  onChange,
}: {
  nucleos: NucleoContato[];
  value: string;
  onChange: (valor: string) => void;
}) {
  const [buscaNucleo, setBuscaNucleo] = useState("");
  const [aberto, setAberto] = useState(false);
  const valorAtual = value.trim();

  function getTipoNucleoSelector(nucleo: NucleoContato) {
    return nucleo.tipo_nucleo || nucleo.tipo || "outro";
  }

  function labelTipoNucleoSelector(tipo: string | null | undefined) {
    if (tipo === "familia") return "Família";
    if (tipo === "empresa") return "Empresa";
    if (tipo === "politico") return "Político";
    if (tipo === "corporativo") return "Corporativo";
    if (tipo === "igreja") return "Igreja";
    if (tipo === "associacao") return "Associação";
    if (tipo === "fornecedor") return "Fornecedor";
    return "Outro";
  }

  const nucleoSelecionado = useMemo(() => {
    const grupoAtual = valorAtual.toLowerCase();

    if (!grupoAtual) return null;

    return (
      nucleos.find((nucleo) => nucleo.nome.trim().toLowerCase() === grupoAtual) || null
    );
  }, [nucleos, valorAtual]);

  const nucleosFiltrados = useMemo(() => {
    const termo = buscaNucleo.trim().toLowerCase();

    if (!termo) return nucleos.slice(0, 8);

    return nucleos
      .filter((nucleo) =>
        [
          nucleo.nome,
          nucleo.tipo,
          nucleo.tipo_nucleo,
          labelTipoNucleoSelector(getTipoNucleoSelector(nucleo)),
        ]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(termo)),
      )
      .slice(0, 12);
  }, [buscaNucleo, nucleos]);

  function selecionarNucleo(nucleo: NucleoContato) {
    onChange(nucleo.nome);
    setBuscaNucleo("");
    setAberto(false);
  }

  return (
    <label style={fieldStyle}>
      <span>Núcleo</span>

      {nucleoSelecionado ? (
        <div style={nucleoSelecionadoConviteStyle}>
          <div>
            <strong>{nucleoSelecionado.nome}</strong>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange("");
              setBuscaNucleo("");
              setAberto(true);
            }}
            style={secondaryButtonStyle}
          >
            Trocar
          </button>
        </div>
      ) : valorAtual ? (
        <div style={nucleoSelecionadoConviteStyle}>
          <div>
            <strong>{valorAtual}</strong>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange("");
              setBuscaNucleo("");
              setAberto(true);
            }}
            style={secondaryButtonStyle}
          >
            Limpar
          </button>
        </div>
      ) : (
        <div style={nucleoSelecionadoConviteStyle}>
          <div>
            <strong>Selecione um núcleo de Contatos</strong>
            <span>{nucleos.length} núcleo(s) disponível(is)</span>
          </div>
        </div>
      )}

      <input
        value={buscaNucleo}
        onFocus={() => setAberto(true)}
        onChange={(event) => {
          setBuscaNucleo(event.target.value);
          setAberto(true);
        }}
        placeholder="Buscar núcleo pelo nome..."
        style={inputStyle}
      />

      {aberto && (
        <div style={nucleoSearchResultListStyle}>
          {nucleosFiltrados.length === 0 && (
            <div style={nucleoEmptySearchResultStyle}>Nenhum núcleo encontrado.</div>
          )}

          {nucleosFiltrados.map((nucleo) => (
            <button
              key={nucleo.id}
              type="button"
              onClick={() => selecionarNucleo(nucleo)}
              style={nucleoSearchResultButtonStyle}
            >
              <strong>{nucleo.nome}</strong>
              <span>{labelTipoNucleoSelector(getTipoNucleoSelector(nucleo))}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
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
    padding: "clamp(14px, 3vw, 24px)",
    overflowX: "hidden",
    background: "var(--page-bg)",
    color: "var(--text)",
    transition: "background 180ms ease, color 180ms ease",
  };
}

const nucleosVinculadosConviteWrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  marginTop: 22,
};

const nucleosVinculadosConviteHeaderStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "#334155",
};

const nucleosVinculadosConviteListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const nucleoVinculadoConviteCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 22,
  background: "#f9fafb",
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const nucleoVinculadoConviteCardActiveStyle: CSSProperties = {
  borderColor: "#c4b5fd",
  background: "#faf5ff",
};

const nucleoVinculadoConviteSubTextStyle: CSSProperties = {
  display: "block",
  marginTop: 6,
  color: "#6b7280",
  fontWeight: 700,
};

const nucleoVinculadoConviteFlagsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const compactNucleoToggleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "10px 14px",
  background: "#ffffff",
  fontWeight: 800,
  color: "#374151",
};

const nucleoSelecionadoConviteStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid var(--border-strong)",
  background: "var(--soft-bg)",
  color: "var(--text-secondary)",
  fontWeight: 850,
  flexWrap: "wrap",
};

const nucleoSearchResultListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  maxHeight: 280,
  overflowY: "auto",
  padding: 10,
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "var(--section-bg)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  marginTop: -10,
  marginBottom: 18,
};

const nucleoSearchResultButtonStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--soft-bg)",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 850,
  textAlign: "left",
  cursor: "pointer",
};

const nucleoEmptySearchResultStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px dashed var(--border-strong)",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 800,
};

const heroCardStyle: CSSProperties = {
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
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
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
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
  boxSizing: "border-box",
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
  maxWidth: "100%",
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
  maxWidth: "100%",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  gap: 12,
  marginBottom: 20,
  width: "100%",
};

const groupCardLargeStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  background: "var(--card-bg)",
  padding: "clamp(16px, 4vw, 26px)",
  borderRadius: "clamp(20px, 4vw, 28px)",
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
  flexWrap: "wrap",
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
  padding: "clamp(14px, 4vw, 18px)",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--soft-bg)",
  flexWrap: "wrap",
  minWidth: 0,
  overflow: "hidden",
};

const groupMemberInfoStyle: CSSProperties = {
  flex: "1 1 320px",
  minWidth: 0,
  maxWidth: "100%",
  overflowWrap: "anywhere",
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
  flex: "0 0 280px",
  minWidth: 260,
  marginLeft: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  textAlign: "right",
};

const rowActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 18,
  flexWrap: "wrap",
  width: "100%",
};

const quickActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
  maxWidth: "100%",
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
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  textAlign: "center",
  whiteSpace: "normal",
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
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  textAlign: "center",
  whiteSpace: "normal",
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

const importInfoStyle: CSSProperties = {
  display: "grid",
  gap: 0,
  marginTop: 12,
  borderRadius: 16,
  border: "1px solid var(--accent-border)",
  background: "linear-gradient(135deg, var(--group-soft), var(--card-bg))",
  color: "var(--text-secondary)",
  fontSize: 12,
  lineHeight: 1.35,
  overflow: "hidden",
};

const importInfoSummaryStyle: CSSProperties = {
  listStyle: "none",
  cursor: "pointer",
  padding: 13,
};

const importInfoHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  color: "var(--text)",
};

const importInfoHintStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 800,
};

const importBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#7c3aed",
  fontSize: 11,
  fontWeight: 900,
};

const importInfoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: "6px 12px",
  padding: "0 13px 13px",
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

const giftStatusRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const giftStatusBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "7px 11px",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#047857",
  fontSize: 12,
  fontWeight: 950,
  border: "1px solid rgba(16,185,129,0.28)",
};

const giftDetailsStyle: CSSProperties = {
  display: "grid",
  gap: 0,
  marginTop: 12,
  borderRadius: 16,
  border: "1px solid rgba(16,185,129,0.28)",
  background: "linear-gradient(135deg, rgba(16,185,129,0.10), var(--card-bg))",
  color: "var(--text-secondary)",
  fontSize: 12,
  lineHeight: 1.35,
  overflow: "hidden",
};

const giftDetailsSummaryStyle: CSSProperties = {
  listStyle: "none",
  cursor: "pointer",
  padding: 13,
};

const giftDetailsHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  color: "var(--text)",
};

const giftDetailsBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#047857",
  fontSize: 11,
  fontWeight: 950,
};

const giftDetailsHintStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 800,
};

const giftDetailsListStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "0 13px 13px",
};

const giftDetailsItemStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  borderRadius: 14,
  background: "var(--card-bg)",
  border: "1px solid var(--border)",
};

const giftLinkedGuestStyle: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: 999,
  background: "var(--group-soft)",
  color: "var(--accent)",
  fontSize: 11,
  fontWeight: 950,
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

const enviosResumoStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 14,
  width: "100%",
  maxWidth: 240,
  marginLeft: "auto",
};

const enviosResumoTituloStyle: CSSProperties = {
  color: "var(--text)",
  fontSize: 15,
  fontWeight: 900,
  textAlign: "left",
};

const envioLinhaStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "128px auto",
  alignItems: "center",
  justifyContent: "start",
  gap: 10,
};

const envioLinhaLabelStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 800,
  textAlign: "left",
};

const envioLinhaDataStyle: CSSProperties = {
  gridColumn: "1 / -1",
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 700,
  marginTop: -3,
  textAlign: "left",
};

const statusStyle: CSSProperties = {
  display: "inline-block",
  padding: "7px 11px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
};

const envioOrigemCardStyle: CSSProperties = {
  gridColumn: "1 / -1",
  justifySelf: "start",
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "7px 11px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 11,
  fontWeight: 900,
  marginTop: -2,
  textAlign: "left",
};

const guestFormOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(12px, 3vw, 28px)",
  background: "rgba(15,23,42,0.38)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  overflow: "hidden",
};

const guestFormModalStyle: CSSProperties = {
  ...sectionStyle,
  width: "min(980px, 100%)",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  overscrollBehavior: "contain",
  boxShadow: "0 28px 90px rgba(15,23,42,0.28)",
  border: "1px solid var(--border-strong)",
};

const sendConfirmOverlayStyle: CSSProperties = {
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

const sendConfirmModalStyle: CSSProperties = {
  width: "min(520px, 100%)",
  borderRadius: 26,
  padding: 24,
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.95)",
  boxShadow: "0 28px 90px rgba(15,23,42,0.26)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sendConfirmEyebrowStyle: CSSProperties = {
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sendConfirmTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 24,
  fontWeight: 950,
};

const sendConfirmTextStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 15,
  lineHeight: 1.5,
  fontWeight: 700,
};

const sendConfirmActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const sendCancelButtonStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.5)",
  background: "#ffffff",
  color: "#334155",
  padding: "12px 15px",
  borderRadius: 999,
  fontWeight: 950,
  cursor: "pointer",
};

const sendConfirmButtonStyle: CSSProperties = {
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
  padding: "12px 16px",
  borderRadius: 999,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(22,163,74,0.22)",
};

const deleteConfirmOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15,23,42,0.42)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const deleteConfirmModalStyle: CSSProperties = {
  width: "min(480px, 100%)",
  borderRadius: 28,
  padding: 24,
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.95)",
  boxShadow: "0 30px 90px rgba(15,23,42,0.30)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const deleteConfirmIconStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  background: "#fee2e2",
  color: "#dc2626",
  fontWeight: 950,
  fontSize: 22,
};

const deleteConfirmEyebrowStyle: CSSProperties = {
  color: "#dc2626",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const deleteConfirmTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const deleteConfirmTextStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 15,
  lineHeight: 1.5,
  fontWeight: 700,
};

const deleteConfirmActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const deleteCancelButtonStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.5)",
  background: "#ffffff",
  color: "#334155",
  padding: "12px 16px",
  borderRadius: 999,
  fontWeight: 950,
  cursor: "pointer",
};

const deleteConfirmButtonStyle: CSSProperties = {
  border: "none",
  background: "#dc2626",
  color: "#ffffff",
  padding: "12px 16px",
  borderRadius: 999,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(220,38,38,0.24)",
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  border: "1px dashed var(--border-strong)",
  color: "var(--muted)",
};

