"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { aplicarMascaraTelefone, telefoneParaExibir, telefoneParaStorage } from "@/lib/phone";

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
  nome?: string | null;
  telefone?: string | null;
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
  grupo_envio: string | null;
  crianca: string | null;
  mae: string | null;
  responsavel: string | null;
  responsavel_telefone: string | null;
  idade_crianca: number | null;
  tamanho_chinelo: string | null;
  relacao_evento: string | null;
  tag_envio: string | null;
  contato_principal: boolean | null;
  recebe_convite: boolean | null;
  tipo_convite: string | null;
  observacoes: string | null;
  status_rsvp: string | null;
  status_envio: string | null;
  status_envio_save_the_date?: string | null;
  data_envio_save_the_date?: string | null;
  status_envio_convite: string | null;
  data_envio_convite: string | null;
  status_envio_lembrete_rsvp: string | null;
  data_envio_lembrete_rsvp: string | null;
  status_envio_lembrete_evento?: string | null;
  data_envio_lembrete_evento?: string | null;
  status_envio_cartao: string | null;
  data_envio_cartao: string | null;
  status_envio_album?: string | null;
  data_envio_album?: string | null;
  status_checkin: string | null;
  token: string | null;
  evento_id: string | null;
  created_at: string | null;
  legacy_id?: string | number | null;
  origem_importacao?: string | null;
  import_batch_id?: string | null;
  data_hora_rsvp?: string | null;
  data_resposta?: string | null;
  data_hora_envio?: string | null;
  data_checkin?: string | null;
};

type ConvidadoForm = {
  nome: string;
  telefone: string;
  email: string;
  grupo: string;
  grupo_envio: string;
  crianca: string;
  responsavel: string;
  responsavel_telefone: string;
  mae: string;
  idade_crianca: string;
  tamanho_chinelo: string;
  relacao_evento: string[];
  tag_envio: string;
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
  raw_data?: {
    crm_status?: string;
    crm_exists?: boolean;
    evento_status?: string;
    event_exists?: boolean;
    matched_by?: string;
  };
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
  grupo_envio: "",
  crianca: "",
  responsavel: "",
  responsavel_telefone: "",
  mae: "",
  idade_crianca: "",
  tamanho_chinelo: "",
  relacao_evento: [],
  tag_envio: "",
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

function EditarRespInline({ nomeInicial, telefoneInicial, onSalvar, onCancelar }: {
  nomeInicial: string;
  telefoneInicial: string;
  onSalvar: (nome: string, telefone: string) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(() => telefoneParaExibir(telefoneInicial));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 20px", borderRadius: 16, border: "1.5px solid #c4b5fd", background: "#faf5ff" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do responsável" style={{ flex: 2, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 600, outline: "none", background: "#fff" }} />
        <input value={telefone} onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))} placeholder="(11) 99999-9999" style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff" }} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancelar} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 10, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
        <button type="button" onClick={() => onSalvar(nome.trim(), telefoneParaStorage(telefone))} disabled={!nome.trim() && !telefone.trim()} style={{ background: "#6d28d9", color: "#fff", border: "none", borderRadius: 10, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Salvar</button>
      </div>
    </div>
  );
}

export default function ConvidadosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [permiteCrm, setPermiteCrm] = useState(false);
  const [novoResp, setNovoResp] = useState<{ nome: string; telefone: string } | null>(null);
  const [editandoRespIdx, setEditandoRespIdx] = useState<number | null>(null);
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
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const vcfInputRef = useRef<HTMLInputElement | null>(null);
  const [relacoesEvento, setRelacoesEvento] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState("");
  const [toast, setToast] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroRsvp, setFiltroRsvp] = useState("todos");
  const [filtroEnvio, setFiltroEnvio] = useState("todos");
  const [filtroPerfilConvidado, setFiltroPerfilConvidado] = useState("todos");
  const [filtroPerfilConvite, setFiltroPerfilConvite] = useState("todos");
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
  const [importConfirmLoading, setImportConfirmLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importBatchId, setImportBatchId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"texto" | "excel" | "vcf">("texto");
  const [importVcfContacts, setImportVcfContacts] = useState<VcfContact[]>([]);
  const [importVcfFileName, setImportVcfFileName] = useState<string | null>(null);
  const [importExcelFileName, setImportExcelFileName] = useState<string | null>(null);
  const [importSheetHeaders, setImportSheetHeaders] = useState<string[]>([]);
  const [importSheetRows, setImportSheetRows] = useState<string[][]>([]);

  const importacaoConfig = useMemo(() => {
    try {
      const raw = window.localStorage.getItem("omnistage-importacao");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          permitido: parsed.permitido ?? true,
          texto: parsed.texto ?? true,
          excel: parsed.excel ?? true,
          sheets: parsed.sheets ?? false,
          vcf: parsed.vcf ?? true,
        };
      }
    } catch {}
    return { permitido: true, texto: true, excel: true, sheets: false, vcf: true };
  }, []);

  function showToast(mensagem: string, tipo: "sucesso" | "erro" = "sucesso") {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3500);
  }

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
      const criancaNormalizada = String(convidado.crianca || "").trim().toLowerCase();
      const perfilConvidadoOk =
        filtroPerfilConvidado === "todos" ||
        (filtroPerfilConvidado === "crianca" && criancaNormalizada === "sim") ||
        (filtroPerfilConvidado === "adulto" && criancaNormalizada !== "sim");

      const tipoConviteNormalizado = String(convidado.tipo_convite || "individual")
        .trim()
        .toLowerCase();
      const perfilConviteOk =
        filtroPerfilConvite === "todos" ||
        (filtroPerfilConvite === "grupo" && tipoConviteNormalizado === "grupo") ||
        (filtroPerfilConvite === "individual" && tipoConviteNormalizado !== "grupo");

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

      return rsvpOk && envioOk && perfilConvidadoOk && perfilConviteOk && buscaOk;
    });

    // Se há busca ativa: expandir para incluir todos do mesmo grupo quando qualquer membro bate
    if (termo) {
      const gruposComMatch = new Set(
        filtrados.map((c) => String(c.grupo || "").trim()).filter(Boolean)
      );
      if (gruposComMatch.size > 0) {
        const idsJaIncluidos = new Set(filtrados.map((c) => c.id));
        const extras = convidados.filter((c) => {
          const grupo = String(c.grupo || "").trim();
          return !!grupo && gruposComMatch.has(grupo) && !idsJaIncluidos.has(c.id);
        });
        filtrados.push(...extras);
      }
    }

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
  }, [convidados, busca, filtroRsvp, filtroEnvio, filtroPerfilConvidado, filtroPerfilConvite]);

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
    setNovaTag("");
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
  if (papel === "crianca") return "Criança";
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
    const tipoConvite = String(convidado.tipo_convite || "individual")
      .trim()
      .toLowerCase();
    const tokenDoCard = String(convidado.token || "").trim();

    // REGRA PRINCIPAL:
    // Tipo do convite INDIVIDUAL sempre abre o convite individual do card clicado.
    // Não importa se existe grupo/núcleo no cadastro ou se a visualização em grupo está marcada.
    if (tipoConvite === "individual") {
      return `/c/${encodeURIComponent(tokenDoCard)}`;
    }

    const grupo = (convidado.grupo || "").trim();

    // Sem grupo/núcleo, não existe como agrupar: usa o token do próprio card.
    if (!grupo) {
      return `/c/${encodeURIComponent(tokenDoCard)}`;
    }

    // Só agrupa quando o tipo do convite NÃO é individual.
    const integrantesGrupo = convidados.filter((item) => {
      const tipoItem = String(item.tipo_convite || "individual")
        .trim()
        .toLowerCase();

      return (
        item.evento_id === convidado.evento_id &&
        (item.grupo || "").trim() === grupo &&
        tipoItem !== "individual"
      );
    });

    const tokens = integrantesGrupo
      .map((item) => String(item.token || "").trim())
      .filter(Boolean)
      .map((token) => encodeURIComponent(token))
      .join(",");

    return `/c/${tokens || encodeURIComponent(tokenDoCard)}`;
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

    const vinculos = (data || []) as VinculoContatoNucleo[];
    setVinculosContatos(vinculos);

    // Carrega contatos que são principal_envio em algum núcleo (podem não ser convidados)
    const idsPrincipais = Array.from(new Set(
      vinculos.filter((v) => v.principal_envio).map((v) => v.tenant_contato_id).filter(Boolean)
    ));
    if (idsPrincipais.length > 0) {
      const { data: contatosPrincipais } = await supabase
        .from("tenant_contatos")
        .select("id, nome, telefone, tipo_contato, responsavel_nome, responsavel_telefone")
        .eq("tenant_id", tenant)
        .in("id", idsPrincipais);
      if (contatosPrincipais?.length) {
        setContatosBasePorId((prev) => {
          const novo = new Map(prev);
          for (const c of contatosPrincipais as ContatoBaseConvidado[]) novo.set(c.id, c);
          return novo;
        });
      }
    }
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
        status_envio_save_the_date,
        data_envio_save_the_date,
        status_envio_convite,
        data_envio_convite,
        status_envio_lembrete_rsvp,
        data_envio_lembrete_rsvp,
        status_envio_lembrete_evento,
        data_envio_lembrete_evento,
        status_envio_cartao,
        data_envio_cartao,
        status_envio_album,
        data_envio_album,
        status_checkin,
        token,
        evento_id,
        created_at,
        legacy_id,
        origem_importacao,
        import_batch_id,
        data_hora_rsvp,
        data_resposta,
        data_hora_envio,
        data_checkin,
        relacao_evento,
        tag_envio
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

    const normalized = normalizarConvidadosImportadosDeContatos(convidadosData, contatosBase);
    setConvidados(normalized);
    // Coleta relações únicas para sugestão no form
    const relacoes = [...new Set(normalized.flatMap((c) => c.relacao_evento ? c.relacao_evento.split(",").map((t: string) => t.trim()).filter(Boolean) : []))] as string[];
    setRelacoesEvento(relacoes);
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
      .select("id, nome, telefone, tipo_contato, responsavel_nome, responsavel_telefone")
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

    setContatosBasePorId((prev) => new Map([...prev, ...mapa]));
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
      const criancaSelecionada = form.crianca === "sim";
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
      const criancaFinal = criancaSelecionada;
      const responsavelDoNucleo = criancaFinal
        ? await buscarResponsavelPrincipalDoNucleo(convidadoEditando?.tenant_contato_id)
        : null;
      const responsavelFinal =
        responsavelNormalizado ||
        maeNormalizada ||
        (criancaFinal ? contatoBaseEditando?.responsavel_nome || "" : "") ||
        responsavelDoNucleo?.nome ||
        "";
      const responsavelTelefoneFinal =
        responsavelTelefoneNormalizado ||
        (criancaFinal ? contatoBaseEditando?.responsavel_telefone || "" : "") ||
        responsavelDoNucleo?.telefone ||
        "";

      const payload = {
        nome: form.nome.trim(),
        telefone: telefoneParaStorage(telefonePrincipal) || null,
        email: form.email.trim() || null,
        grupo: grupoFinal || null,
        crianca: criancaFinal ? "sim" : "",
        mae: criancaFinal ? maeNormalizada || responsavelFinal || null : null,
        responsavel: criancaFinal ? responsavelFinal || null : null,
        responsavel_telefone: criancaFinal ? responsavelTelefoneFinal || null : null,
        idade_crianca: criancaFinal && idadeCriancaNormalizada
          ? Number(idadeCriancaNormalizada)
          : null,
        tamanho_chinelo: form.tamanho_chinelo.trim() || null,
        relacao_evento: form.relacao_evento.length > 0 ? form.relacao_evento.join(",") : null,
        tag_envio: form.tag_envio || "Convidado(a)",
        contato_principal: conviteEhGrupo && !criancaSemGrupoViaResponsavel ? form.contato_principal : false,
        recebe_convite: criancaFinal && responsavelFinal
          ? true
          : criancaSemGrupoViaResponsavel
            ? true
            : conviteEhGrupo
              ? form.recebe_convite || form.contato_principal
              : true,
        tipo_convite: conviteEhGrupo ? "grupo" : "individual",
        grupo_envio: form.grupo_envio.trim() || null,
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

      // Sincronizar responsável no tenant_contatos vinculado
      const convidadoAtual = editandoId
        ? convidados.find((c) => c.id === editandoId)
        : null;
      const contatoIdParaSync = convidadoAtual?.tenant_contato_id;
      if (contatoIdParaSync) {
        const updateCrm: Record<string, unknown> = {
          tipo_contato: criancaFinal ? "crianca" : "adulto",
        };
        if (criancaFinal && (responsavelFinal || responsavelTelefoneFinal)) {
          updateCrm.responsavel_nome = responsavelFinal || null;
          updateCrm.responsavel_telefone = telefoneParaStorage(responsavelTelefoneFinal) || null;
        }
        await supabase
          .from("tenant_contatos")
          .update(updateCrm)
          .eq("id", contatoIdParaSync)
          .eq("tenant_id", tenantId);
      }

      const estavaEditando = Boolean(editandoId);

      limparFormulario();
      setFormAberto(false);
      await carregarConvidados(tenantId, eventoId);
      restaurarPosicaoLista();
      showToast(estavaEditando ? "Convidado atualizado com sucesso." : "Convidado criado com sucesso.", "sucesso");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro ao salvar convidado.", "erro");
    } finally {
      setLoading(false);
    }
  }

  function importNormalizePhone(phone: string | null) {
    if (!phone) return null;
    const onlyNumbers = phone.replace(/\D/g, "");
    return onlyNumbers || null;
  }

  function importDecodeVcfValue(value: string) {
    return value.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\s+/g, " ").trim();
  }

  function importParseVCF(vcfText: string): VcfContact[] {
    const contacts: VcfContact[] = [];
    const normalizedText = vcfText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
    const blocks = normalizedText.split(/END:VCARD/i).map((b) => b.trim()).filter(Boolean);

    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      const fnLine = lines.find((line) => /^FN/i.test(line));
      const nLine = lines.find((line) => /^N[:;]/i.test(line));
      const telLine = lines.find((line) => /^TEL/i.test(line));
      let rawName = "";
      if (fnLine) rawName = fnLine.split(":").slice(1).join(":");
      if (!rawName && nLine) {
        rawName = nLine.split(":").slice(1).join(":").split(";").filter(Boolean).reverse().join(" ");
      }
      const rawPhone = telLine ? telLine.split(":").slice(1).join(":") : "";
      let nome = importDecodeVcfValue(rawName);
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
      contacts.push({ nome, telefone: importNormalizePhone(rawPhone), grupo });
    }
    return contacts;
  }

  function importNormalizarTextoBusca(value: string) {
    return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();
  }

  function importLinhaPareceCabecalho(row: string[]) {
    const termos = ["id", "nome", "convidado", "telefone", "whatsapp", "celular", "mae", "crianca", "idade", "grupo", "familia", "status", "rsvp", "envio"];
    return row.reduce((score, cell) => {
      const normalized = importNormalizarTextoBusca(cell);
      if (!normalized) return score;
      const exact = termos.includes(normalized);
      const partial = termos.some((term) => normalized.includes(term));
      return score + (exact ? 2 : partial ? 1 : 0);
    }, 0);
  }

  function importPrepararMatriz(matrix: string[][]) {
    const validRows = matrix.map((row) => row.map((value) => String(value ?? "").trim())).filter((row) => row.some((v) => v));
    if (validRows.length === 0) return { headers: [] as string[], rows: [] as string[][] };
    let headerIndex = 0;
    let bestScore = -1;
    validRows.slice(0, 12).forEach((row, index) => {
      const score = importLinhaPareceCabecalho(row);
      if (score > bestScore) { bestScore = score; headerIndex = index; }
    });
    const headers = validRows[headerIndex].map((h, i) => (h ? h : `Coluna ${i + 1}`));
    const rows = validRows.slice(headerIndex + 1).filter((row) => row.some((v) => v));
    return { headers, rows };
  }

  function importParseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && next === '"' && insideQuotes) { current += '"'; i++; }
      else if (char === '"') { insideQuotes = !insideQuotes; }
      else if ((char === "," || char === ";" || char === "\t") && !insideQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());
    return values;
  }

  function importParseCsvText(csvText: string) {
    const matrix = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean).map(importParseCsvLine);
    return importPrepararMatriz(matrix);
  }

  function importSugerirMapeamento(headers: string[]) {
    function findHeader(terms: string[]) {
      const normalizedTerms = terms.map(importNormalizarTextoBusca);
      return headers.find((h) => normalizedTerms.some((t) => importNormalizarTextoBusca(h) === t)) ||
        headers.find((h) => normalizedTerms.some((t) => importNormalizarTextoBusca(h).includes(t))) || "";
    }
    return {
      legacy_id: findHeader(["legacy_id", "id legado", "codigo", "cod"]),
      grupo: findHeader(["grupo", "familia", "família"]),
      nome: findHeader(["nome", "convidado"]),
      telefone: findHeader(["telefone", "whatsapp", "celular"]),
      email: findHeader(["email", "e-mail"]),
      crianca: findHeader(["crianca", "criança"]),
      mae: findHeader(["mae", "mãe"]),
      idade_crianca: findHeader(["idade_crianca", "idade criança", "idade"]),
      tipo_contato: findHeader(["tipo_contato", "tipo contato"]),
      responsavel_nome: findHeader(["responsavel_nome", "responsavel", "responsável"]),
      responsavel_telefone: findHeader(["responsavel_telefone", "telefone responsavel"]),
      tipo_nucleo: findHeader(["tipo_nucleo", "tipo de nucleo"]),
      nucleo: findHeader(["nucleo", "núcleo"]),
      relacao_nucleo: findHeader(["relacao_nucleo"]),
      relacao_responsavel_nucleo: findHeader(["relacao_responsavel_nucleo"]),
      relacao_evento: findHeader(["relacao_evento"]),
      recebe_comunicacao: findHeader(["recebe_comunicacao", "recebe comunicação", "recebe convite"]),
      principal_envio: findHeader(["principal_envio", "contato principal"]),
      status_rsvp: findHeader(["status_rsvp", "rsvp"]),
      status_envio: findHeader(["status_envio"]),
      data_hora_rsvp: findHeader(["data_resposta"]),
      data_hora_envio: findHeader(["data_hora_envio"]),
    };
  }

  function importGetColumnValue(row: string[], headers: string[], headerName: string) {
    if (!headerName) return "";
    const index = headers.indexOf(headerName);
    return index < 0 ? "" : row[index] || "";
  }

  function importMontarMappedRowsExcel(headers: string[], rows: string[][]): MappedRow[] {
    const mapping = importSugerirMapeamento(headers);
    if (!mapping.nome) return [];
    return rows.map((row) => ({
      legacy_id: importGetColumnValue(row, headers, mapping.legacy_id),
      grupo: importGetColumnValue(row, headers, mapping.grupo),
      nome: importGetColumnValue(row, headers, mapping.nome),
      telefone: importGetColumnValue(row, headers, mapping.telefone),
      email: importGetColumnValue(row, headers, mapping.email),
      crianca: importGetColumnValue(row, headers, mapping.crianca),
      mae: importGetColumnValue(row, headers, mapping.mae),
      idade_crianca: importGetColumnValue(row, headers, mapping.idade_crianca),
      tipo_contato: importGetColumnValue(row, headers, mapping.tipo_contato),
      responsavel_nome: importGetColumnValue(row, headers, mapping.responsavel_nome),
      responsavel_telefone: importGetColumnValue(row, headers, mapping.responsavel_telefone),
      tipo_nucleo: importGetColumnValue(row, headers, mapping.tipo_nucleo),
      nucleo: importGetColumnValue(row, headers, mapping.nucleo),
      relacao_nucleo: importGetColumnValue(row, headers, mapping.relacao_nucleo),
      relacao_responsavel_nucleo: importGetColumnValue(row, headers, mapping.relacao_responsavel_nucleo),
      relacao_evento: importGetColumnValue(row, headers, mapping.relacao_evento),
      recebe_comunicacao: importGetColumnValue(row, headers, mapping.recebe_comunicacao),
      principal_envio: importGetColumnValue(row, headers, mapping.principal_envio),
      status_rsvp: importGetColumnValue(row, headers, mapping.status_rsvp) || "pendente",
      status_envio: importGetColumnValue(row, headers, mapping.status_envio),
      data_hora_rsvp: importGetColumnValue(row, headers, mapping.data_hora_rsvp),
      data_hora_envio: importGetColumnValue(row, headers, mapping.data_hora_envio),
    })).filter((row) => row.nome.trim().length > 0);
  }

  function importMontarMappedRowsVcf(contacts: VcfContact[]): MappedRow[] {
    return contacts.filter((c) => c.nome.trim()).map((c) => ({
      legacy_id: "", grupo: c.grupo || "", nome: c.nome, telefone: c.telefone || "",
      email: "", crianca: "", mae: "", idade_crianca: "", tipo_contato: "adulto",
      responsavel_nome: "", responsavel_telefone: "", tipo_nucleo: "", nucleo: c.grupo || "",
      relacao_nucleo: "", relacao_responsavel_nucleo: "", relacao_evento: "",
      recebe_comunicacao: "", principal_envio: "", status_rsvp: "pendente",
      status_envio: "", data_hora_rsvp: "", data_hora_envio: "",
    }));
  }

  async function handleExcelUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
    if (!isCsv && !isExcel) { alert("Envie uma planilha .xlsx, .xls ou .csv."); return; }

    try {
      let headers: string[] = [];
      let rows: string[][] = [];
      if (isCsv) {
        const content = await file.text();
        const parsed = importParseCsvText(content);
        headers = parsed.headers;
        rows = parsed.rows;
      } else {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) { alert("Nenhuma aba encontrada na planilha."); return; }
        const worksheet = workbook.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "", raw: false });
        const parsed = importPrepararMatriz(matrix);
        headers = parsed.headers;
        rows = parsed.rows;
      }
      if (headers.length === 0 || rows.length === 0) { alert("Nenhuma linha encontrada na planilha."); return; }
      const mapping = importSugerirMapeamento(headers);
      if (!mapping.nome) { alert("Não foi possível identificar a coluna de Nome. Verifique o cabeçalho da planilha."); return; }

      setImportSheetHeaders(headers);
      setImportSheetRows(rows);
      setImportExcelFileName(file.name);
      setImportMode("excel");
      setImportPreview([]);
      setImportBatchId(null);
      if (excelInputRef.current) excelInputRef.current.value = "";
    } catch {
      alert("Erro ao ler a planilha. Confira se o arquivo está em .xlsx, .xls ou .csv.");
    }
  }

  async function handleVcfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isVcf = file.name.toLowerCase().endsWith(".vcf") || file.type === "text/vcard" || file.type === "text/x-vcard" || file.type === "text/plain";
    if (!isVcf) { alert("Envie um arquivo .vcf válido."); return; }

    try {
      const content = await file.text();
      const contacts = importParseVCF(content);
      if (contacts.length === 0) { alert("Nenhum contato encontrado no arquivo .vcf."); return; }

      setImportVcfContacts(contacts);
      setImportVcfFileName(file.name);
      setImportMode("vcf");
      setImportPreview([]);
      setImportBatchId(null);
      if (vcfInputRef.current) vcfInputRef.current.value = "";
    } catch {
      alert("Erro ao ler o arquivo .vcf.");
    }
  }

  async function gerarPreviewImportacao() {
    if (!tenantId || !eventoId) {
      alert("Selecione um evento antes de importar convidados.");
      return;
    }

    let payload: Record<string, unknown> = { tenantId, eventoId, action: "preview" };

    if (importMode === "texto") {
      if (!importText.trim()) { alert("Cole uma lista de convidados antes de continuar."); return; }
      payload.text = importText;
    } else if (importMode === "excel") {
      if (importSheetRows.length === 0) { alert("Carregue uma planilha antes de continuar."); return; }
      const mappedRows = importMontarMappedRowsExcel(importSheetHeaders, importSheetRows);
      if (mappedRows.length === 0) { alert("Nenhuma linha válida encontrada. Verifique se a coluna Nome existe."); return; }
      payload.mappedRows = mappedRows;
    } else if (importMode === "vcf") {
      if (importVcfContacts.length === 0) { alert("Carregue um arquivo .vcf antes de continuar."); return; }
      const mappedRows = importMontarMappedRowsVcf(importVcfContacts);
      if (mappedRows.length === 0) { alert("Nenhum contato válido no arquivo .vcf."); return; }
      payload.mappedRows = mappedRows;
    }

    setImportLoading(true);

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

      setImportBatchId(result.batchId);
      setImportPreview(result.preview || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao importar lista.");
    } finally {
      setImportLoading(false);
    }
  }

  async function confirmarImportacao() {
    if (!importBatchId || !tenantId || !eventoId) return;

    const novosIds = importPreview
      .filter((row) => !row.is_duplicate)
      .map((row) => row.id);

    if (novosIds.length === 0) {
      alert("Todos os convidados desta prévia já existem no evento.");
      return;
    }

    setImportConfirmLoading(true);

    try {
      const response = await fetch("/api/admin/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          eventoId,
          action: "confirm",
          batchId: importBatchId,
          selectedIds: novosIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao confirmar importação.");
      }

      alert(`${result.inserted ?? novosIds.length} convidados importados com sucesso!`);
      setImportAberto(false);
      setImportText("");
      setImportPreview([]);
      setImportBatchId(null);
      if (tenantId && eventoId) await carregarConvidados(tenantId, eventoId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao confirmar importação.");
    } finally {
      setImportConfirmLoading(false);
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

  async function buscarResponsavelPrincipalDoNucleo(
    tenantContatoId: string | null | undefined,
  ): Promise<{ nome: string; telefone: string } | null> {
    if (!tenantId || !tenantContatoId) return null;

    const vinculosDaCrianca = vinculosContatosPorPessoa.get(tenantContatoId) || [];
    const gruposIds = Array.from(
      new Set(vinculosDaCrianca.map((vinculo) => vinculo.grupo_contato_id).filter(Boolean)),
    );

    if (gruposIds.length === 0) return null;

    const { data: membrosData, error: membrosError } = await supabase
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
      .eq("tenant_id", tenantId)
      .in("grupo_contato_id", gruposIds);

    if (membrosError) {
      console.error("Erro ao buscar responsável do núcleo:", membrosError.message);
      return null;
    }

    const membros = ((membrosData || []) as VinculoContatoNucleo[]).filter(
      (membro) => membro.tenant_contato_id !== tenantContatoId,
    );
    const contatosIds = Array.from(
      new Set(membros.map((membro) => membro.tenant_contato_id).filter(Boolean)),
    );

    if (contatosIds.length === 0) return null;

    const { data: contatosData, error: contatosError } = await supabase
      .from("tenant_contatos")
      .select("id, nome, telefone, tipo_contato, responsavel_nome, responsavel_telefone")
      .eq("tenant_id", tenantId)
      .in("id", contatosIds);

    if (contatosError) {
      console.error("Erro ao carregar contatos do núcleo:", contatosError.message);
      return null;
    }

    const contatosPorId = new Map(
      ((contatosData || []) as ContatoBaseConvidado[]).map((contato) => [contato.id, contato]),
    );

    const candidatos = membros
      .map((membro) => ({ membro, contato: contatosPorId.get(membro.tenant_contato_id) || null }))
      .filter(({ contato }) => {
        if (!contato) return false;
        if (tipoContatoEhCrianca(contato.tipo_contato)) return false;
        return Boolean(String(contato.telefone || "").replace(/\D/g, ""));
      })
      .sort((a, b) => {
        const score = (item: { membro: VinculoContatoNucleo }) => {
          const papel = getPapelVinculoContato(item.membro);
          if (item.membro.principal_envio) return 0;
          if (item.membro.recebe_comunicacao) return 1;
          if (papel === "responsavel") return 2;
          if (papel === "mae" || papel === "pai") return 3;
          return 4;
        };

        return score(a) - score(b);
      });

    const selecionado = candidatos[0]?.contato;
    if (!selecionado?.nome) return null;

    return {
      nome: selecionado.nome,
      telefone: selecionado.telefone || "",
    };
  }

  async function editarConvidado(convidado: Convidado) {
    formReturnScrollYRef.current = window.scrollY;

    const contatoBase = convidado.tenant_contato_id
      ? contatosBasePorId.get(convidado.tenant_contato_id) || null
      : null;
    const contatoBaseEhCrianca = tipoContatoEhCrianca(contatoBase?.tipo_contato);
    const grupoFinal = convidado.grupo || "";
    const contatoPrincipalFinal = convidado.contato_principal ?? false;
    const recebeConviteFinal = convidado.recebe_convite ?? true;
    const responsavelDoNucleo = contatoBaseEhCrianca
      ? await buscarResponsavelPrincipalDoNucleo(convidado.tenant_contato_id)
      : null;
    const responsavelFinal =
      convidado.responsavel ||
      convidado.mae ||
      contatoBase?.responsavel_nome ||
      responsavelDoNucleo?.nome ||
      "";
    const responsavelTelefoneFinal =
      convidado.responsavel_telefone ||
      contatoBase?.responsavel_telefone ||
      responsavelDoNucleo?.telefone ||
      "";

    setEditandoId(convidado.id);
    setForm({
      nome: convidado.nome || "",
      telefone: telefoneParaExibir(convidado.telefone || ""),
      email: convidado.email || "",
      grupo: grupoFinal,
      grupo_envio: convidado.grupo_envio || "",
      crianca: convidado.crianca === "sim" || Boolean(convidado.mae) ? "sim" : "",
      responsavel: responsavelFinal,
      responsavel_telefone: responsavelTelefoneFinal,
      mae: convidado.mae || "",
      idade_crianca: convidado.idade_crianca
        ? String(convidado.idade_crianca)
        : "",
      tamanho_chinelo: convidado.tamanho_chinelo || "",
      relacao_evento: convidado.relacao_evento ? convidado.relacao_evento.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      tag_envio: convidado.tag_envio || "",
      contato_principal: Boolean(contatoPrincipalFinal),
      recebe_convite: Boolean((contatoBaseEhCrianca || convidado.crianca === "sim") && responsavelFinal ? true : recebeConviteFinal),
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
    const foiEnviado = statusAtual === "enviado" || statusAtual === "enviado_manual" || !!(convidado.data_envio_convite || convidado.data_hora_envio);

    if (statusAtual === "erro") return "erro";

    // Sem telefone próprio → exibir status via quem envia
    if (!convidado.telefone || !String(convidado.telefone).trim()) {
      const grupo = String(convidado.grupo || "").trim();
      if (grupo) {
        // Caso 1a: contato_principal com telefone no mesmo grupo (campo direto)
        const principal = convidados.find(
          (c) => c.id !== convidado.id && c.contato_principal === true && !!c.telefone && String(c.grupo || "").trim() === grupo
        );
        if (principal) {
          const sprincipal = principal.status_envio_convite || principal.status_envio;
          const principalEnviou = sprincipal === "enviado" || sprincipal === "enviado_manual" || !!(principal.data_envio_convite || principal.data_hora_envio);
          return principalEnviou ? "enviado_via_principal" : "pendente_via_principal";
        }
        // Caso 1b: buscar principal via contato_grupos + contato_grupo_membros
        const nucleoDoGrupo = nucleosContatos.find((n) => n.nome === grupo);
        if (nucleoDoGrupo) {
          const membroPrincipal = vinculosContatos.find(
            (v) => v.grupo_contato_id === nucleoDoGrupo.id && v.principal_envio === true
          );
          if (membroPrincipal) {
            const principalConvidado = convidados.find(
              (c) => c.tenant_contato_id === membroPrincipal.tenant_contato_id && !!c.telefone
            );
            if (principalConvidado) {
              const sp = principalConvidado.status_envio_convite || principalConvidado.status_envio;
              const principalEnviou = sp === "enviado" || sp === "enviado_manual" || !!(principalConvidado.data_envio_convite || principalConvidado.data_hora_envio);
              return principalEnviou ? "enviado_via_principal" : "pendente_via_principal";
            }
            // Principal existe nos contatos mas não está na lista de convidados → usa foiEnviado do próprio
            return foiEnviado ? "enviado_via_principal" : "pendente_via_principal";
          }
        }
        // Caso 2: responsável externo com grupo
        const temResponsavelNucleo = !!normalizarTelefone(convidado.responsavel_telefone) || !!String(convidado.responsavel || "").trim();
        if (temResponsavelNucleo) {
          return foiEnviado ? "enviado_via_principal" : "pendente_via_principal";
        }
      }
      // Caso 3: criança com responsável externo sem grupo de núcleo
      const temResponsavelDireto = !!normalizarTelefone(convidado.responsavel_telefone) || !!String(convidado.responsavel || "").trim();
      if (temResponsavelDireto) {
        return foiEnviado ? "enviado_via_responsavel" : "pendente_via_responsavel";
      }
    }

    if (foiEnviado) return statusAtual === "enviado_manual" ? "enviado_manual" : "enviado";

    return statusAtual || "pendente";
  }

  function getDataConviteExibicao(convidado: Convidado) {
    if (!convidado.telefone || !String(convidado.telefone).trim()) {
      const grupo = String(convidado.grupo || "").trim();
      if (grupo) {
        // Principal direto nos convidados
        const principal = convidados.find(
          (c) => c.id !== convidado.id && c.contato_principal === true && !!c.telefone && String(c.grupo || "").trim() === grupo
        );
        if (principal) return principal.data_envio_convite || principal.data_hora_envio || null;
        // Principal via contato_grupos
        const nucleoDoGrupo = nucleosContatos.find((n) => n.nome === grupo);
        if (nucleoDoGrupo) {
          const membroPrincipal = vinculosContatos.find(
            (v) => v.grupo_contato_id === nucleoDoGrupo.id && v.principal_envio === true
          );
          if (membroPrincipal) {
            const principalConvidado = convidados.find(
              (c) => c.tenant_contato_id === membroPrincipal.tenant_contato_id && !!c.telefone
            );
            if (principalConvidado) return principalConvidado.data_envio_convite || principalConvidado.data_hora_envio || null;
          }
        }
      }
    }
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
    setPermiteCrm(window.localStorage.getItem("omnistage-permite-crm") === "true");
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      setSystemDark(media.matches);
    };

    updateTheme();
    media.addEventListener("change", updateTheme);

    // Sync with global html[data-theme] set by the sidebar
    const syncGlobalTheme = () => {
      const htmlTheme = document.documentElement.getAttribute("data-theme");
      if (htmlTheme === "dark") setThemeMode("dark");
      else if (htmlTheme === "light") setThemeMode("light");
      else setThemeMode("auto");
    };

    syncGlobalTheme();

    const observer = new MutationObserver(syncGlobalTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      media.removeEventListener("change", updateTheme);
      observer.disconnect();
    };
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
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(16px);} to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: toast.tipo === "sucesso" ? "#16a34a" : "#dc2626",
          color: "#fff", padding: "14px 24px", borderRadius: 14,
          fontWeight: 600, fontSize: 15, zIndex: 9999,
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", gap: 10,
          animation: "fadeInUp 0.3s ease",
        }}>
          {toast.tipo === "sucesso" ? "✓" : "✕"} {toast.mensagem}
        </div>
      )}
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

            {importacaoConfig.permitido && (
              <button
                onClick={() => setImportAberto((current) => !current)}
                style={secondaryButtonStyle}
              >
                Importar lista
              </button>
            )}

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

      {importAberto && importacaoConfig.permitido && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={cardTitleStyle}>Importar lista de convidados</h2>
            <button
              onClick={() => {
                setImportAberto(false);
                setImportText("");
                setImportPreview([]);
                setImportBatchId(null);
                setImportVcfContacts([]);
                setImportVcfFileName(null);
                setImportExcelFileName(null);
                setImportSheetHeaders([]);
                setImportSheetRows([]);
                setImportMode("texto");
              }}
              style={secondaryButtonStyle}
            >
              Fechar
            </button>
          </div>

          {/* Abas de modo */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {importacaoConfig.texto && (
              <button
                onClick={() => { setImportMode("texto"); setImportPreview([]); setImportBatchId(null); }}
                style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: importMode === "texto" ? "2px solid var(--accent)" : "2px solid transparent", color: importMode === "texto" ? "var(--accent)" : "var(--muted)", fontWeight: importMode === "texto" ? 700 : 400, cursor: "pointer", fontSize: 14 }}
              >
                Texto
              </button>
            )}
            {importacaoConfig.excel && (
              <button
                onClick={() => { setImportMode("excel"); setImportPreview([]); setImportBatchId(null); }}
                style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: importMode === "excel" ? "2px solid var(--accent)" : "2px solid transparent", color: importMode === "excel" ? "var(--accent)" : "var(--muted)", fontWeight: importMode === "excel" ? 700 : 400, cursor: "pointer", fontSize: 14 }}
              >
                Excel / CSV
              </button>
            )}
            {importacaoConfig.vcf && (
              <button
                onClick={() => { setImportMode("vcf"); setImportPreview([]); setImportBatchId(null); }}
                style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: importMode === "vcf" ? "2px solid var(--accent)" : "2px solid transparent", color: importMode === "vcf" ? "var(--accent)" : "var(--muted)", fontWeight: importMode === "vcf" ? 700 : 400, cursor: "pointer", fontSize: 14 }}
              >
                Contatos (.vcf)
              </button>
            )}
          </div>

          {/* Modo texto */}
          {importMode === "texto" && importacaoConfig.texto && (
            <>
              <p style={{ color: "var(--muted)", marginTop: 0 }}>
                Cole uma lista com nomes, telefones, grupos ou quantidades. Ex:
                Maria +1, Família Silva (4), João - 21999999999.
              </p>
              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={`Maria Silva\nJoão Santos - 11999990000\nFamília Costa (4)\nAna +1`}
                style={{ ...textareaStyle, minHeight: 180, marginTop: 12 }}
              />
            </>
          )}

          {/* Modo Excel/CSV */}
          {importMode === "excel" && importacaoConfig.excel && (
            <div style={{ marginTop: 8 }}>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                style={{ display: "none" }}
              />

              {/* Passos guiados */}
              <div style={{ display: "grid", gap: 12 }}>
                {/* Passo 1 */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, background: "var(--soft-bg)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>1</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>Baixe o modelo de planilha</strong>
                    <p style={{ color: "var(--muted)", margin: "0 0 10px", fontSize: 13 }}>
                      Use nosso modelo com as colunas corretas: Nome, Telefone, Grupo, Família e mais.
                    </p>
                    <a
                      href="/api/import/template"
                      download="modelo-convidados-omnistage.xlsx"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
                    >
                      ↓ Baixar modelo .xlsx
                    </a>
                  </div>
                </div>

                {/* Passo 2 */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, background: "var(--soft-bg)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>2</div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 4 }}>Preencha os dados</strong>
                    <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>
                      Preencha pelo menos a coluna <strong>Nome</strong>. Telefone e grupo são opcionais mas recomendados.
                      Salve o arquivo no formato <strong>.xlsx</strong>.
                    </p>
                  </div>
                </div>

                {/* Passo 3 — upload */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, background: "var(--soft-bg)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>3</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>Envie o arquivo preenchido</strong>
                    {importExcelFileName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>✓ <strong>{importExcelFileName}</strong> — {importSheetRows.length} linha(s)</span>
                        <button onClick={() => excelInputRef.current?.click()} style={{ ...secondaryButtonStyle, padding: "4px 10px", fontSize: 12 }}>Trocar</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => excelInputRef.current?.click()}
                        style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "20px 16px", borderRadius: 10, border: "2px dashed var(--border)", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, justifyContent: "center" }}
                      >
                        <span style={{ fontSize: 22 }}>📎</span> Selecionar planilha .xlsx / .xls / .csv
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modo VCF */}
          {importMode === "vcf" && importacaoConfig.vcf && (
            <div style={{ marginTop: 4 }}>
              <p style={{ color: "var(--muted)", marginTop: 0 }}>
                Exporte seus contatos do celular em .vcf e importe aqui. Nome e telefone são detectados automaticamente.
              </p>
              <input
                ref={vcfInputRef}
                type="file"
                accept=".vcf,text/vcard,text/x-vcard"
                onChange={handleVcfUpload}
                style={{ display: "none" }}
              />
              <button onClick={() => vcfInputRef.current?.click()} style={secondaryButtonStyle}>
                Escolher arquivo .vcf
              </button>
              {importVcfFileName && (
                <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 13 }}>
                  ✓ {importVcfFileName} — {importVcfContacts.length} contato(s) carregado(s)
                  {importVcfContacts.filter((c) => !c.telefone).length > 0 && (
                    <span style={{ color: "#d97706" }}>
                      {" "}· {importVcfContacts.filter((c) => !c.telefone).length} sem telefone
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0 }}>
                  Prévia — {importPreview.filter((r) => !r.is_duplicate).length} novos
                  {importPreview.filter((r) => r.is_duplicate).length > 0 && (
                    <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                      · {importPreview.filter((r) => r.is_duplicate).length} já existem
                    </span>
                  )}
                </h3>
                <button
                  onClick={confirmarImportacao}
                  disabled={importConfirmLoading || importPreview.filter((r) => !r.is_duplicate).length === 0}
                  style={buttonStyle}
                >
                  {importConfirmLoading ? "Importando..." : "Confirmar importação"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {importPreview.map((item) => {
                  const crmNovo = !item.raw_data?.crm_exists;
                  const jaNoEvento = item.is_duplicate;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        border: jaNoEvento
                          ? "1px solid rgba(239,68,68,0.4)"
                          : "1px solid var(--border)",
                        background: jaNoEvento
                          ? "rgba(239,68,68,0.06)"
                          : "var(--soft-bg)",
                        opacity: jaNoEvento ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong>{item.nome || item.name}</strong>
                        {!jaNoEvento && crmNovo && (
                          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "rgba(34,197,94,0.12)", color: "#166534", fontWeight: 600 }}>
                            Novo contato
                          </span>
                        )}
                        {!jaNoEvento && !crmNovo && (
                          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "rgba(59,130,246,0.12)", color: "#1d4ed8", fontWeight: 600 }}>
                            Contato existente
                          </span>
                        )}
                        {jaNoEvento && (
                          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "rgba(239,68,68,0.12)", color: "#b91c1c", fontWeight: 600 }}>
                            Já no evento
                          </span>
                        )}
                      </div>

                      <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>
                        {item.telefone || item.phone || "Sem telefone"}
                        {item.grupo && <> · {item.grupo}</>}
                        {(item.crianca === "sim" || item.mae) && (
                          <> · Criança{item.responsavel_telefone || item.mae ? ` · Resp: ${item.responsavel_telefone || item.mae}` : ""}</>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
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
                    onChange={(event) => updateForm("telefone", aplicarMascaraTelefone(event.target.value))}
                    placeholder="(11) 99999-9999"
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

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(["adulto", "crianca"] as const).map((opcao) => {
                  const ativo = (form.crianca === "sim") === (opcao === "crianca");
                  return (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => {
                        const isCrianca = opcao === "crianca";
                        setForm((current) => {
                          const temResponsavel = Boolean(current.responsavel.trim() || current.responsavel_telefone.trim());

                          let autoResponsavel = current.responsavel;
                          let autoResponsavelTel = current.responsavel_telefone;

                          if (isCrianca) {
                            // Coleta responsáveis de todas as fontes, sem duplicar por telefone
                            // Parte dos já existentes no form (para ser aditivo)
                            const nomesExistentes = (current.responsavel || "").split(",").map((n) => n.trim()).filter(Boolean);
                            const telsExistentes = (current.responsavel_telefone || "").split(",").map((t) => t.replace(/\D/g, "")).filter(Boolean);

                            const responsaveisEncontrados: { nome: string; telefone: string }[] = nomesExistentes.map((nome, i) => ({
                              nome,
                              telefone: telsExistentes[i] || "",
                            }));
                            const telefonesVistos = new Set<string>(telsExistentes.filter(Boolean));
                            const nomesVistos = new Set<string>(nomesExistentes.map((n) => n.toLowerCase()));

                            const adicionarResponsavel = (nome: string, telefone: string | null) => {
                              const tel = (telefone || "").replace(/\D/g, "");
                              const nomeKey = nome.trim().toLowerCase();
                              if (!nome.trim()) return;
                              // Se o nome já existe mas sem telefone, atualizar o telefone
                              if (nomesVistos.has(nomeKey)) {
                                if (tel && !telefonesVistos.has(tel)) {
                                  const idx = responsaveisEncontrados.findIndex((r) => r.nome.toLowerCase() === nomeKey);
                                  if (idx !== -1 && !responsaveisEncontrados[idx].telefone) {
                                    responsaveisEncontrados[idx].telefone = tel;
                                    telefonesVistos.add(tel);
                                  }
                                }
                                return;
                              }
                              if (tel && telefonesVistos.has(tel)) return;
                              if (tel) telefonesVistos.add(tel);
                              nomesVistos.add(nomeKey);
                              responsaveisEncontrados.push({ nome: nome.trim(), telefone: tel });
                            };

                            // 1. Adultos principais do grupo no evento atual (prioridade máxima)
                            const grupoAtual = current.grupo.trim();
                            if (grupoAtual) {
                              convidados
                                .filter((c) => String(c.grupo || "").trim() === grupoAtual && c.crianca !== "sim" && c.contato_principal && c.telefone && c.id !== editandoId)
                                .forEach((c) => adicionarResponsavel(c.nome, c.telefone));

                              // 2. Demais adultos com telefone no grupo
                              convidados
                                .filter((c) => String(c.grupo || "").trim() === grupoAtual && c.crianca !== "sim" && !c.contato_principal && c.telefone && c.id !== editandoId)
                                .forEach((c) => adicionarResponsavel(c.nome, c.telefone));
                            }

                            // 3. CRM — adiciona apenas responsáveis ainda não presentes (evita dados de outros eventos)
                            const tenantContatoId = convidadoEmEdicao?.tenant_contato_id;
                            const contatoCrm = tenantContatoId ? contatosBasePorId.get(tenantContatoId) : null;
                            if (contatoCrm?.responsavel_nome) {
                              adicionarResponsavel(contatoCrm.responsavel_nome, contatoCrm.responsavel_telefone);
                            }

                            if (responsaveisEncontrados.length > 0) {
                              autoResponsavel = responsaveisEncontrados.map((r) => r.nome).join(", ");
                              autoResponsavelTel = responsaveisEncontrados.map((r) => r.telefone).join(", ");
                            }
                          }

                          return {
                            ...current,
                            crianca: isCrianca ? "sim" : "",
                            contato_principal: isCrianca && !current.grupo.trim() ? false : current.contato_principal,
                            recebe_convite: isCrianca ? true : current.recebe_convite,
                            responsavel: autoResponsavel,
                            responsavel_telefone: autoResponsavelTel,
                          };
                        });
                      }}
                      style={{
                        display: "inline-flex", alignItems: "center",
                        border: `1.5px solid ${ativo ? "#7c3aed" : "#e2e8f0"}`,
                        borderRadius: 999, padding: "10px 20px",
                        background: ativo ? "#ede9fe" : "var(--card, #fff)",
                        color: ativo ? "#7c3aed" : "var(--text)",
                        fontWeight: 700, fontSize: 15, cursor: "pointer",
                      }}
                    >
                      {opcao === "adulto" ? "Adulto" : "Criança"}
                    </button>
                  );
                })}
              </div>

              {form.crianca === "sim" && (
                <div style={formBlockGridStyle}>
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
                </div>
              )}

              {form.crianca === "sim" && (
                <div style={responsavelSubBlockStyle}>
                  <div style={subBlockHeaderStyle}>
                    <strong>Responsável pela criança</strong>
                    <span>
                      Informe o responsável que receberá a comunicação da criança.
                    </span>
                  </div>

                  {(() => {
                    const grupoForm = form.grupo.trim();
                    const grupoEnvioForm = form.grupo_envio.trim();
                    const papeisFamilia = ["filho", "filha", "filho(a)", "criança", "crianca", "neto", "neta", "sobrinho", "sobrinha"];
                    const papeisEscola = ["aluno", "aluna", "aluno(a)", "estudante"];

                    // Responsáveis externos — só quando grupo_envio está definido
                    const grupoParaEnvio = grupoEnvioForm;
                    const principaisConvidados = grupoParaEnvio
                      ? convidados.filter((c) => c.contato_principal && normalizarTelefone(c.telefone) && String(c.grupo || "").trim() === grupoParaEnvio && c.id !== editandoId)
                      : [];
                    const principaisCRM: { id: string; nome: string; telefone: string }[] = [];
                    const nucleosIds = new Set<string>();
                    if (grupoEnvioForm) {
                      // Só busca CRM quando grupo_envio está explicitamente definido
                      const n = nucleosContatos.find((n) => n.nome === grupoEnvioForm);
                      if (n) nucleosIds.add(n.id);
                    }
                    nucleosIds.forEach((nucleoId) => {
                      vinculosContatos.filter((v) => v.grupo_contato_id === nucleoId && v.principal_envio).forEach((v) => {
                        const jaNosConvidados = principaisConvidados.some((pc) => pc.tenant_contato_id === v.tenant_contato_id);
                        const jaAdicionado = principaisCRM.some((pc) => pc.id === v.tenant_contato_id);
                        if (!jaNosConvidados && !jaAdicionado) {
                          const dados = contatosBasePorId.get(v.tenant_contato_id);
                          if (dados?.telefone) principaisCRM.push({ id: v.tenant_contato_id, nome: dados.nome || "", telefone: dados.telefone });
                        }
                      });
                    });
                    type OpcaoExterna = { id: string; nome: string; telefone: string };
                    const opcoesExternas: OpcaoExterna[] = [
                      ...principaisConvidados.map((c) => ({ id: c.id, nome: c.nome || "", telefone: normalizarTelefone(c.telefone) || "" })),
                      ...principaisCRM,
                    ];

                    // Responsáveis manuais — armazenados em form.responsavel / form.responsavel_telefone
                    const nomesManual = (form.responsavel || "").split(",").map((n) => n.trim()).filter(Boolean);
                    const telsManual = (form.responsavel_telefone || "").split(",").map((t) => t.trim()).filter(Boolean);
                    // Remove os que já estão nas opções externas para evitar duplicata
                    const telsExternos = new Set(opcoesExternas.map((o) => normalizarTelefone(o.telefone) || ""));
                    const respManuais: { nome: string; telefone: string }[] = nomesManual
                      .map((nome, i) => ({ nome, telefone: telsManual[i] || "" }))
                      .filter((r) => !telsExternos.has(normalizarTelefone(r.telefone) || ""));

                    // Telefones selecionados para receber envio
                    const telesSelecionados = new Set(
                      (form.responsavel_telefone || "").split(",").map((t) => normalizarTelefone(t)).filter(Boolean)
                    );

                    const salvarRespManuais = (lista: { nome: string; telefone: string }[]) => {
                      const nomesExt = opcoesExternas.filter((o) => telesSelecionados.has(normalizarTelefone(o.telefone) || "")).map((o) => o.nome);
                      const telsExt = opcoesExternas.filter((o) => telesSelecionados.has(normalizarTelefone(o.telefone) || "")).map((o) => normalizarTelefone(o.telefone) || "");
                      const todosNomes = [...nomesExt, ...lista.map((r) => r.nome)].join(", ");
                      const todosTels = [...telsExt, ...lista.map((r) => normalizarTelefone(r.telefone) || r.telefone)].filter(Boolean).join(",");
                      setForm((cur) => ({
                        ...cur,
                        responsavel: todosNomes,
                        mae: todosNomes.split(",")[0]?.trim() || cur.mae,
                        responsavel_telefone: todosTels,
                        recebe_convite: todosTels.length > 0 || telsExt.length > 0,
                        contato_principal: false,
                        tipo_convite: "individual",
                      }));
                    };

                    const toggleExterno = (o: OpcaoExterna) => {
                      const tel = normalizarTelefone(o.telefone) || "";
                      const novosTels = new Set(telesSelecionados);
                      if (novosTels.has(tel)) novosTels.delete(tel); else novosTels.add(tel);
                      const selecionadosExt = opcoesExternas.filter((oe) => novosTels.has(normalizarTelefone(oe.telefone) || ""));
                      const todosNomes = [...selecionadosExt.map((oe) => oe.nome), ...respManuais.map((r) => r.nome)].join(", ");
                      const todosTels = [...selecionadosExt.map((oe) => normalizarTelefone(oe.telefone) || ""), ...respManuais.map((r) => normalizarTelefone(r.telefone) || r.telefone)].filter(Boolean).join(",");
                      setForm((cur) => ({
                        ...cur,
                        responsavel: todosNomes,
                        mae: todosNomes.split(",")[0]?.trim() || cur.mae,
                        responsavel_telefone: todosTels,
                        recebe_convite: todosTels.length > 0,
                        contato_principal: false,
                        tipo_convite: "individual",
                      }));
                    };

                    const excluirManual = (idx: number) => {
                      const nova = respManuais.filter((_, i) => i !== idx);
                      setEditandoRespIdx(null);
                      salvarRespManuais(nova);
                    };

                    const salvarEdicaoManual = (idx: number, nome: string, telefone: string) => {
                      const nova = respManuais.map((r, i) => i === idx ? { nome, telefone } : r);
                      setEditandoRespIdx(null);
                      salvarRespManuais(nova);
                    };

                    const adicionarManual = (nome: string, telefone: string) => {
                      const nova = [...respManuais, { nome, telefone }];
                      setNovoResp(null);
                      salvarRespManuais(nova);
                    };

                    return (
                      <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
                        {opcoesExternas.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Do grupo / CRM</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {opcoesExternas.map((o) => {
                                const checked = telesSelecionados.has(normalizarTelefone(o.telefone) || "");
                                return (
                                  <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${checked ? "#6d28d9" : "var(--line)"}`, background: checked ? "#ede9fe" : "transparent" }}>
                                    <input type="checkbox" checked={checked} onChange={() => toggleExterno(o)} style={{ width: 16, height: 16, accentColor: "#6d28d9", cursor: "pointer" }} />
                                    <div>
                                      <strong style={{ fontSize: 13 }}>{o.nome}</strong>
                                      <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>{o.telefone}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Responsáveis manuais */}
                        {(respManuais.length > 0 || opcoesExternas.length === 0) && (
                          <div style={{ marginBottom: 8 }}>
                            {opcoesExternas.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Adicionados manualmente</span>}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {respManuais.map((r, idx) => (
                                <div key={idx}>
                                  {editandoRespIdx === idx ? (
                                    <EditarRespInline
                                      nomeInicial={r.nome}
                                      telefoneInicial={r.telefone}
                                      onSalvar={(nome, tel) => salvarEdicaoManual(idx, nome, tel)}
                                      onCancelar={() => setEditandoRespIdx(null)}
                                    />
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, border: "1.5px solid var(--line)", background: "transparent" }}>
                                      <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: 15 }}>{r.nome || "(sem nome)"}</strong>
                                        <span style={{ fontSize: 14, color: "var(--muted)", marginLeft: 8 }}>{telefoneParaExibir(r.telefone)}</span>
                                      </div>
                                      <button type="button" onClick={() => setEditandoRespIdx(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#6d28d9", padding: "2px 6px" }} title="Editar">✏️</button>
                                      <button type="button" onClick={() => excluirManual(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#dc2626", padding: "2px 6px" }} title="Excluir">🗑️</button>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {novoResp !== null ? (
                                <EditarRespInline
                                  nomeInicial={novoResp.nome}
                                  telefoneInicial={novoResp.telefone}
                                  onSalvar={(nome, tel) => adicionarManual(nome, tel)}
                                  onCancelar={() => setNovoResp(null)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setNovoResp({ nome: "", telefone: "" }); setEditandoRespIdx(null); }}
                                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1.5px dashed var(--line)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#6d28d9", fontWeight: 700, fontSize: 13, width: "100%" }}
                                >
                                  + Adicionar responsável
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {!form.responsavel_telefone && (
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
                  )}
                </div>
              )}
            </section>

            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>03</span>
                <div>
                  <strong>Perfil do convite</strong>
                  <p>Define como o nome aparece no convite e no cartão de entrada.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {([
                  { value: "individual", label: "Individual" },
                  { value: "grupo", label: "Núcleo" },
                ] as const).map((opcao) => {
                  const ativo = form.tipo_convite === opcao.value;
                  return (
                    <button
                      key={opcao.value}
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        tipo_convite: opcao.value,
                        contato_principal: opcao.value === "grupo" ? current.contato_principal : false,
                        recebe_convite: opcao.value === "grupo" ? current.recebe_convite : true,
                      }))}
                      style={{
                        display: "inline-flex", alignItems: "center",
                        border: `1.5px solid ${ativo ? "#7c3aed" : "#e2e8f0"}`,
                        borderRadius: 999, padding: "10px 20px",
                        background: ativo ? "#ede9fe" : "var(--card, #fff)",
                        color: ativo ? "#7c3aed" : "var(--text)",
                        fontWeight: 700, fontSize: 15, cursor: "pointer",
                      }}
                    >
                      {opcao.label}
                    </button>
                  );
                })}
              </div>

              {/* Campo manual de grupo (sem CRM e tipo Núcleo) */}
              {!permiteCrm && form.tipo_convite === "grupo" && (
                <div style={formBlockGridStyle}>
                  <label style={fieldStyle}>
                    <span>Grupo / Família</span>
                    <input
                      list="grupos-sugestoes"
                      value={form.grupo}
                      onChange={(e) => setForm((cur) => ({ ...cur, grupo: e.target.value }))}
                      placeholder="Ex: FAMILIA_SILVA"
                      style={inputStyle}
                    />
                    <datalist id="grupos-sugestoes">
                      {Array.from(new Set([
                        ...nucleosContatos.map((n) => n.nome),
                        ...convidados.map((c) => (c.grupo || "").trim()).filter(Boolean),
                      ])).sort().map((nome) => (
                        <option key={nome} value={nome} />
                      ))}
                    </datalist>
                  </label>
                </div>
              )}
            </section>

            {/* Seção 04 — Núcleos */}
            {permiteCrm && (
              <section style={formBlockCardStyle}>
                <div style={formBlockHeaderStyle}>
                  <span>04</span>
                  <div>
                    <strong>Núcleos</strong>
                    <p>Defina em quais núcleos este convidado aparece e quem recebe a comunicação.</p>
                  </div>
                </div>

                {!editandoId && (
                  <div style={emptyStyle}>Salve o convidado para visualizar os núcleos vinculados.</div>
                )}
                {editandoId && !convidadoTemNucleosVinculados && (
                  <div style={emptyStyle}>Este contato não possui núcleos vinculados no CRM.</div>
                )}
                {convidadoTemNucleosVinculados && (
                  <div style={nucleosVinculadosConviteListStyle}>
                    {vinculosNucleoConvidadoAtual.map((vinculo) => {
                      const nucleo = nucleosContatosPorId.get(vinculo.grupo_contato_id);
                      const nomeNucleo = nucleo?.nome || "Núcleo não encontrado";
                      const convidadoAtualObj = editandoId ? convidados.find(c => c.id === editandoId) : null;
                      const isIndividual = form.tipo_convite !== "grupo";
                      const membrosNoNucleo = isIndividual
                        ? (convidadoAtualObj ? [convidadoAtualObj] : [])
                        : [
                            ...(convidadoAtualObj ? [convidadoAtualObj] : []),
                            ...convidados.filter(
                              (c) => c.id !== editandoId &&
                                (c.grupo || "").trim().toLowerCase() === nomeNucleo.trim().toLowerCase()
                            ),
                          ];

                      return (
                        <div key={vinculo.id} style={nucleoVinculadoConviteCardStyle}>
                          <strong style={{ display: "block", marginBottom: 4 }}>{nomeNucleo}</strong>
                          <span style={{ ...nucleoVinculadoConviteSubTextStyle, display: "block", marginBottom: 12 }}>
                            Relação no núcleo: {form.contato_principal ? "Contato principal" : labelPapelNucleoConvite(getPapelVinculoContato(vinculo))}
                          </span>

                          {membrosNoNucleo.length === 0 && (
                            <div style={{ fontSize: 13, color: "#94a3b8" }}>Nenhum convidado vinculado a este núcleo ainda.</div>
                          )}

                          {membrosNoNucleo.map((membro) => {
                            const isAtual = membro.id === editandoId;
                            const membroGrupo = (membro.grupo || "").trim().toLowerCase();
                            const membroGrupoEnvio = (membro.grupo_envio || "").trim().toLowerCase();
                            const nucleoLow = nomeNucleo.trim().toLowerCase();

                            async function quickUpdate(patch: Record<string, unknown>) {
                              if (isAtual) {
                                setForm((cur) => ({ ...cur, ...patch }));
                              } else {
                                await supabase.from("convidados").update(patch).eq("id", membro.id).eq("tenant_id", tenantId).eq("evento_id", eventoId);
                                if (tenantId) await carregarConvidados(tenantId, eventoId);
                              }
                            }

                            const pillStyle: React.CSSProperties = {
                              display: "inline-flex", alignItems: "center", gap: 6,
                              border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 12px",
                              background: "#fff", fontWeight: 600, fontSize: 12,
                              color: "var(--text)", cursor: "pointer", whiteSpace: "nowrap",
                            };

                            return (
                              <div key={membro.id} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 14px", borderRadius: 10, marginBottom: 6,
                                background: isAtual ? "#ede9fe" : "#f8fafc",
                                border: `1px solid ${isAtual ? "#c4b5fd" : "#e2e8f0"}`,
                                flexWrap: "wrap",
                              }}>
                                <strong style={{ minWidth: 140, fontSize: 13, flexShrink: 0 }}>{membro.nome || "(sem nome)"}</strong>
                                {(() => {
                                  const isCriancaRow = isAtual ? form.crianca === "sim" : membro.crianca === "sim";
                                  const membroTelefone = isAtual ? normalizarTelefone(form.telefone) : normalizarTelefone(membro.telefone);
                                  const semTelefoneRow = !membroTelefone;
                                  const recebeEnvioVal = isCriancaRow
                                    ? true
                                    : isAtual
                                      ? form.recebe_convite
                                      : (membro.recebe_convite ?? true);
                                  const contatoPrincipalVal = isAtual
                                    ? form.contato_principal
                                    : Boolean(membro.contato_principal);
                                  const recebeViaPrincipalRow = !isCriancaRow && semTelefoneRow && !contatoPrincipalVal;

                                  return (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      <label style={{ ...pillStyle, flexDirection: "column", alignItems: "flex-start", borderRadius: 12, padding: "8px 14px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <input type="checkbox" checked={recebeEnvioVal} disabled={isCriancaRow || recebeViaPrincipalRow} onChange={(e) => quickUpdate({ recebe_convite: e.target.checked })} />
                                          <span style={{ fontWeight: 700 }}>
                                            {isCriancaRow
                                              ? "Recebe comunicação via Responsável"
                                              : recebeViaPrincipalRow
                                                ? "Recebe comunicação via Principal"
                                                : "Recebe comunicação"}
                                          </span>
                                        </div>
                                        <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, paddingLeft: 20 }}>
                                          {isCriancaRow
                                            ? "Envio pelo responsável cadastrado"
                                            : recebeViaPrincipalRow
                                              ? "Sem telefone — envio pelo contato principal do grupo"
                                              : contatoPrincipalVal
                                                ? "Envio com componentes do núcleo"
                                                : "Envio individual com o nome do convidado"}
                                        </span>
                                      </label>
                                      {membro.crianca !== "sim" && (
                                        <label style={{ ...pillStyle, flexDirection: "column", alignItems: "flex-start", borderRadius: 12, padding: "8px 14px" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <input type="checkbox" checked={contatoPrincipalVal} onChange={(e) => quickUpdate({ contato_principal: e.target.checked })} />
                                            <span style={{ fontWeight: 700 }}>Contato Principal</span>
                                          </div>
                                          <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, paddingLeft: 20 }}>Convite com todos os nomes do grupo</span>
                                        </label>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>{permiteCrm ? "05" : "04"}</span>
                <div>
                  <strong>Relação com o Evento</strong>
                  <p>Classifique o convidado por seu papel ou relação com o evento (ex: Família da noiva, Amigos do noivo).</p>
                </div>
              </div>

              <div style={formBlockGridStyle}>
                <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                  <span>Relação com o evento</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, marginTop: 6 }}>
                    {form.relacao_evento.map((tag) => (
                      <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ede9fe", color: "#7c3aed", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 600 }}>
                        {tag}
                        <button type="button"
                          onClick={() => setForm((prev) => ({ ...prev, relacao_evento: prev.relacao_evento.filter((t) => t !== tag) }))}
                          style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontWeight: 700, fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={novaTag}
                      onChange={(e) => setNovaTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && novaTag.trim()) {
                          e.preventDefault();
                          const tag = novaTag.trim();
                          if (!form.relacao_evento.includes(tag)) setForm((prev) => ({ ...prev, relacao_evento: [...prev.relacao_evento, tag] }));
                          setNovaTag("");
                        }
                      }}
                      placeholder="Digite e pressione Enter para adicionar..."
                      style={{ ...inputStyle, flex: 1 }}
                      list="relacoes-sugestoes"
                    />
                    <button type="button"
                      onClick={() => {
                        const tag = novaTag.trim();
                        if (tag && !form.relacao_evento.includes(tag)) setForm((prev) => ({ ...prev, relacao_evento: [...prev.relacao_evento, tag] }));
                        setNovaTag("");
                      }}
                      style={{ padding: "10px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                      + Adicionar
                    </button>
                  </div>
                  <datalist id="relacoes-sugestoes">
                    {relacoesEvento.filter((r) => !form.relacao_evento.includes(r)).map((r) => <option key={r} value={r} />)}
                  </datalist>
                </label>

                {/* Tag de envio - selecionada dentre as tags do convidado */}
                <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 600 }}>Tag de envio WhatsApp</span>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 8px" }}>
                    Qual tag define o grupo de envio deste convidado?
                  </p>
                  <select
                    value={form.tag_envio}
                    onChange={(e) => updateForm("tag_envio", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Convidado(a) — padrão</option>
                    {form.relacao_evento.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </label>

              </div>
            </section>

            <section style={formBlockCardStyle}>
              <div style={formBlockHeaderStyle}>
                <span>{permiteCrm ? "06" : "05"}</span>
                <div>
                  <strong>Observações</strong>
                </div>
              </div>
              <textarea
                value={form.observacoes}
                onChange={(event) => updateForm("observacoes", event.target.value)}
                placeholder="Anotações internas sobre este convidado..."
                style={{ ...textareaStyle, width: "100%", boxSizing: "border-box" }}
              />
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
            value={filtroPerfilConvidado}
            onChange={(event) => setFiltroPerfilConvidado(event.target.value)}
            style={inputStyle}
            aria-label="Filtrar por perfil do convidado"
          >
            <option value="todos">Perfil do convidado</option>
            <option value="adulto">Adultos</option>
            <option value="crianca">Crianças</option>
          </select>

          <select
            value={filtroPerfilConvite}
            onChange={(event) => setFiltroPerfilConvite(event.target.value)}
            style={inputStyle}
            aria-label="Filtrar por perfil do convite"
          >
            <option value="todos">Perfil do convite</option>
            <option value="individual">Convite individual</option>
            <option value="grupo">Convite por núcleo</option>
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
                            {convidado.relacao_evento && convidado.relacao_evento.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                              <span key={tag} style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, background: "#ede9fe", color: "#7c3aed", borderRadius: 20, padding: "2px 10px", verticalAlign: "middle" }}>
                                {tag}
                              </span>
                            ))}
                          </strong>

                          <p
                            style={{ color: "var(--muted)", margin: "6px 0 0" }}
                          >
                            {convidado.telefone
                              ? convidado.telefone
                              : convidado.responsavel_telefone
                                ? `Responsável: ${convidado.responsavel || convidado.mae || convidado.responsavel_telefone.split(",")[0]}`
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

                          <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <span>Perfil do convidado: <strong>{convidado.crianca === "sim" ? "Criança" : "Adulto"}</strong>{convidado.crianca === "sim" && convidado.idade_crianca ? ` · Idade: ${convidado.idade_crianca}` : ""}</span>
                            <span>·</span>
                            <span>Perfil do convite: <strong>{(convidado.tipo_convite || "individual") === "grupo" ? "Núcleo" : "Individual"}</strong></span>
                          </div>

                          {(() => {
                            const gr = String(convidado.grupo || "").trim();
                            const semTelefone = !normalizarTelefone(convidado.telefone);
                            const ehCriancaComResp = convidado.crianca === "sim" && (convidado.responsavel || convidado.mae || convidado.responsavel_telefone);

                            // Principais dentro dos próprios convidados (pode haver mais de um)
                            const principaisNoGrupo = semTelefone && !!gr && !ehCriancaComResp
                              ? convidados.filter((c) => c.id !== convidado.id && !!c.contato_principal && !!normalizarTelefone(c.telefone) && String(c.grupo || "").trim() === gr)
                              : [];
                            const principalNoGrupo = principaisNoGrupo[0] || null;

                            // Principal via nucleosContatos (pode ser contato externo não-convidado)
                            const infoNucleo = semTelefone && !!gr && !ehCriancaComResp && !principalNoGrupo
                              ? (() => {
                                  const nucleo = nucleosContatos.find((n) => n.nome === gr);
                                  if (!nucleo) return null;
                                  const membroPrincipal = vinculosContatos.find((v) => v.grupo_contato_id === nucleo.id && v.principal_envio === true);
                                  if (!membroPrincipal) return null;
                                  // Pode ter ou não dados completos no mapa
                                  const dados = contatosBasePorId.get(membroPrincipal.tenant_contato_id) || null;
                                  return { existe: true, dados };
                                })()
                              : null;

                            const recebeViaPrincipal = !!principalNoGrupo || !!infoNucleo;

                            const mostrarBloco =
                              (mostrarGrupo && convidado.contato_principal) ||
                              convidado.recebe_convite ||
                              convidado.relacao_evento ||
                              recebeViaPrincipal ||
                              ehCriancaComResp;

                            if (!mostrarBloco) return null;

                            const chipStyleResp = { display: "inline-flex", alignItems: "center", gap: 4, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: 12 } as const;
                            const chipStylePrinc = { display: "inline-flex", alignItems: "center", gap: 4, background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: 12 } as const;

                            // Chips de responsável (criança)
                            const chipsResp = ehCriancaComResp ? (() => {
                              const nomes = (convidado.responsavel || convidado.mae || "").split(",").map(n => n.trim()).filter(Boolean);
                              const tels = (convidado.responsavel_telefone || "").split(",").map(t => t.replace(/\D/g, "")).filter(Boolean);
                              return nomes.map((nome, i) => (
                                <span key={i} style={chipStyleResp}>
                                  👤 {nome}
                                  {tels[i] && <span style={{ fontWeight: 400, color: "#b45309" }}>· {telefoneParaExibir(tels[i])}</span>}
                                </span>
                              ));
                            })() : null;

                            return (
                              <div style={sendIdentityStyle}>
                                {mostrarGrupo && convidado.contato_principal && (
                                  <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800, letterSpacing: 0.3 }}>
                                    ★ Contato principal do grupo
                                  </span>
                                )}
                                <span style={{ whiteSpace: "nowrap" }}>
                                  {ehCriancaComResp
                                    ? "Recebe comunicação via Responsável"
                                    : recebeViaPrincipal
                                      ? "Recebe comunicação via Principal"
                                      : "Recebe comunicação"}
                                </span>
                                <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
                                  {chipsResp}
                                  {principaisNoGrupo.map((p) => (
                                    <span key={p.id} style={chipStylePrinc}>
                                      👤 {p.nome}
                                      {p.telefone && <span style={{ fontWeight: 400, color: "#7c3aed" }}>· {telefoneParaExibir(p.telefone)}</span>}
                                    </span>
                                  ))}
                                  {infoNucleo?.dados && (
                                    <span style={chipStylePrinc}>
                                      👤 {infoNucleo.dados.nome}
                                      {infoNucleo.dados.telefone && <span style={{ fontWeight: 400, color: "#7c3aed" }}>· {telefoneParaExibir(infoNucleo.dados.telefone)}</span>}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })()}

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
                          <div style={enviosResumoStyle}>
                            <EnvioLinha
                              label="RSVP"
                              status={convidado.status_rsvp === "confirmado" ? "rsvp_confirmado" : convidado.status_rsvp === "nao" ? "rsvp_nao" : "rsvp_pendente"}
                              data={convidado.data_resposta || convidado.data_hora_rsvp || null}
                            />

                            <strong style={enviosResumoTituloStyle}>Envios</strong>

                            {(convidado.status_envio_save_the_date || convidado.data_envio_save_the_date) && (
                              <EnvioLinha
                                label="Save the Date"
                                status={convidado.status_envio_save_the_date || null}
                                data={convidado.data_envio_save_the_date || null}
                              />
                            )}

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

                            {(convidado.status_envio_lembrete_evento || convidado.data_envio_lembrete_evento) && (
                              <EnvioLinha
                                label="Lembrete Evento"
                                status={convidado.status_envio_lembrete_evento || null}
                                data={convidado.data_envio_lembrete_evento || null}
                              />
                            )}

                            <EnvioLinha
                              label="Cartão"
                              status={convidado.status_envio_cartao}
                              data={convidado.data_envio_cartao}
                            />

                            {(convidado.status_envio_album || convidado.data_envio_album) && (
                              <EnvioLinha
                                label="Álbum"
                                status={convidado.status_envio_album || null}
                                data={convidado.data_envio_album || null}
                              />
                            )}

                            {listaPresentesAtiva(convidado) && (
                              <EnvioLinha
                                label="Lista presentes"
                                status="pendente"
                                data={null}
                              />
                            )}

                            <EnvioLinha
                              label="Check-in"
                              status={convidado.status_checkin === "entrou" || convidado.status_checkin === "entrou_excecao" ? "checkin_entrou" : "checkin_nao_entrou"}
                              data={convidado.data_checkin || null}
                            />
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
  const enviado = status === "enviado" || status === "enviado_manual" || status === "enviado_via_principal" || status === "enviado_via_responsavel" || status === "rsvp_confirmado" || status === "rsvp_nao" || status === "checkin_entrou";

  return (
    <div style={envioLinhaStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <span style={envioLinhaLabelStyle}>{label}</span>
        {enviado && data && (
          <small style={envioLinhaDataStyle}>
            {formatarDataHoraCurta(data)}
          </small>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        <span style={getEnvioStyle(status)}>
          {labelEnvio(status)}
        </span>
        {enviado && origem && (
          <small style={envioOrigemCardStyle}>
            {origem}
          </small>
        )}
      </div>
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
  if (status === "enviado_via_principal") return "Via Principal ✓";
  if (status === "pendente_via_principal") return "Pendente";
  if (status === "enviado_via_responsavel") return "Via Responsável ✓";
  if (status === "pendente_via_responsavel") return "Pendente";
  if (status === "nao_necessario") return "Não necessário";
  if (status === "erro") return "Erro";
  if (status === "rsvp_confirmado") return "Confirmado";
  if (status === "rsvp_nao") return "Não vai";
  if (status === "rsvp_pendente") return "Pendente";
  if (status === "checkin_entrou") return "Entrou";
  if (status === "checkin_nao_entrou") return "Não entrou";
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
      background: "var(--red-soft)",
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

  if (status === "enviado_via_principal") {
    return {
      ...statusStyle,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (status === "pendente_via_principal") {
    return { ...statusStyle };
  }

  if (status === "enviado_via_responsavel") {
    return {
      ...statusStyle,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (status === "pendente_via_responsavel") {
    return { ...statusStyle };
  }

  if (status === "nao_necessario") {
    return {
      ...statusStyle,
      background: "var(--green-soft)",
      color: "#3f6212",
    };
  }

  if (status === "erro") {
    return { ...statusStyle, background: "var(--red-soft)", color: "#b91c1c" };
  }

  if (status === "rsvp_confirmado") {
    return { ...statusStyle, background: "#dcfce7", color: "#166534" };
  }
  if (status === "rsvp_nao") {
    return { ...statusStyle, background: "#fee2e2", color: "#b91c1c" };
  }
  if (status === "rsvp_pendente") {
    return { ...statusStyle };
  }
  if (status === "checkin_entrou") {
    return { ...statusStyle, background: "#dcfce7", color: "#166534" };
  }
  if (status === "checkin_nao_entrou") {
    return { ...statusStyle };
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
  color: "var(--text)",
};

const nucleosVinculadosConviteListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const nucleoVinculadoConviteCardStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 22,
  padding: 22,
  background: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: 12,
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
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "10px 14px",
  background: "var(--card)",
  fontWeight: 800,
  color: "var(--text)",
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
  marginTop: 4,
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
  background: "var(--primary-soft)",
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
  background: "var(--green-soft)",
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
  gap: "4px 10px",
};

const envioLinhaLabelStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 800,
  textAlign: "left",
};

const envioLinhaDataStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 11,
  fontWeight: 700,
  textAlign: "left",
};

const statusStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  whiteSpace: "nowrap",
  lineHeight: "1.4",
};

const envioOrigemCardStyle: CSSProperties = {
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
  background: "var(--card)",
  border: "1px solid var(--line)",
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
  color: "var(--text)",
  fontSize: 24,
  fontWeight: 950,
};

const sendConfirmTextStyle: CSSProperties = {
  margin: 0,
  color: "var(--muted)",
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
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
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
  background: "var(--card)",
  border: "1px solid var(--line)",
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
  background: "var(--red-soft)",
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
  color: "var(--text)",
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const deleteConfirmTextStyle: CSSProperties = {
  margin: 0,
  color: "var(--muted)",
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
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--text)",
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



