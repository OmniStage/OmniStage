"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type EventoBanco = Record<string, any> & {
  id: string;
  nome?: string | null;
  tenant_id?: string | null;
};

type EventoCalendario = {
  id: string;
  nome: string;
  data: Date | null;
  dataFim: Date | null;
  dataTexto: string;
  horarioTexto: string;
  horarioFimTexto: string;
  periodoTexto: string;
  localTexto: string;
  statusTexto: string;
  tenantId: string | null;
  convidadosTotal: number;
  confirmados: number;
  pendentes: number;
  checkins: number;
  raw: EventoBanco;
};

type ConvidadoResumo = {
  evento_id: string | null;
  status_rsvp: string | null;
  checkin_realizado: boolean | null;
  status_checkin: string | null;
};

type AgendaItemBanco = {
  id: string;
  tenant_id: string | null;
  evento_id: string | null;
  titulo: string | null;
  descricao: string | null;
  categoria: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  responsavel: string | null;
  cor: string | null;
};

type EnvioCampanhaBanco = {
  id: string;
  tenant_id: string | null;
  evento_id: string | null;
  tipo_envio: string | null;
  nome: string | null;
  mensagem: string | null;
  midia_url: string | null;
  ativo: boolean | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type ItemCalendario = {
  id: string;
  eventoId: string;
  titulo: string;
  descricao: string;
  categoria: "evento" | "campanha" | "timeline" | "operacional" | "tarefa" | "fornecedor" | "cerimonial" | "rsvp" | "checkin" | "pos_evento";
  dataInicio: Date | null;
  dataFim: Date | null;
  status: string;
  responsavel: string;
  origem: "eventos" | "event_agenda_items" | "envio_campanhas";
  cor?: string | null;
};

type VisaoCalendario = "mes" | "lista";
type FiltroStatus = "todos" | "com_data" | "sem_data" | "ativos" | "finalizados";

const MODULE_KEY = "calendario";
const TIME_ZONE_BR = "America/Sao_Paulo";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CATEGORIA_LABEL: Record<string, string> = {
  evento: "Evento",
  campanha: "Campanha",
  timeline: "Linha do tempo",
  operacional: "Operacional",
  tarefa: "Tarefa",
  fornecedor: "Fornecedor",
  cerimonial: "Cerimonial",
  rsvp: "RSVP",
  checkin: "Check-in",
  pos_evento: "Pós-evento",
};

const CATEGORIA_COR: Record<string, { bg: string; color: string; border: string }> = {
  evento: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  campanha: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  timeline: { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  operacional: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  tarefa: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  fornecedor: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  cerimonial: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  rsvp: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  checkin: { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  pos_evento: { bg: "#fdf2f8", color: "#be185d", border: "#fbcfe8" },
};

function valorPrimeiro(obj: Record<string, any>, campos: string[]) {
  for (const campo of campos) {
    const valor = obj?.[campo];
    if (valor !== null && valor !== undefined && String(valor).trim() !== "") return valor;
  }
  return null;
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseDateSafe(valor: unknown) {
  if (!valor) return null;

  const texto = String(valor).trim();
  const somenteData = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (somenteData) {
    const [, ano, mes, dia] = somenteData;
    return new Date(Number(ano), Number(mes) - 1, Number(dia), 0, 0, 0, 0);
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return null;
  return data;
}

function normalizarHorario(valor: unknown) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const match = texto.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return texto;

  const horas = match[1].padStart(2, "0");
  const minutos = match[2];
  return `${horas}:${minutos}`;
}

function aplicarHorario(data: Date | null, horario: unknown) {
  if (!data) return null;

  const horarioNormalizado = normalizarHorario(horario);
  if (!horarioNormalizado) return data;

  const match = horarioNormalizado.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return data;

  const novaData = new Date(data);
  novaData.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return novaData;
}

function parseDataInicioEvento(evento: EventoBanco) {
  const dataHoraCompleta = parseDateSafe(valorPrimeiro(evento, ["data_hora_inicio", "data_inicio", "inicio", "start_date", "data_hora"]));

  if (dataHoraCompleta) {
    const horarioExplicito = valorPrimeiro(evento, ["horario_inicio", "hora_inicio", "horario", "hora", "hora_evento"]);
    return aplicarHorario(dataHoraCompleta, horarioExplicito);
  }

  const dataBase = parseDateSafe(valorPrimeiro(evento, ["data_evento", "data", "event_date"]));
  return aplicarHorario(dataBase, valorPrimeiro(evento, ["horario_inicio", "hora_inicio", "horario", "hora", "hora_evento"]));
}

function parseDataFimEvento(evento: EventoBanco, dataInicio: Date | null) {
  const dataFimCompleta = parseDateSafe(
    valorPrimeiro(evento, ["data_hora_fim", "data_fim", "fim", "end_date", "data_hora_termino", "termino"])
  );

  const horarioFim = valorPrimeiro(evento, ["horario_fim", "hora_fim", "horario_termino", "hora_termino", "termino_hora"]);

  if (dataFimCompleta) return aplicarHorario(dataFimCompleta, horarioFim);
  if (dataInicio && horarioFim) return aplicarHorario(new Date(dataInicio), horarioFim);

  return null;
}

function parseDataEvento(evento: EventoBanco) {
  return parseDataInicioEvento(evento);
}

function formatarData(data: Date | null) {
  if (!data) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE_BR,
  }).format(data);
}

function formatarHoraData(data: Date | null) {
  if (!data) return "Horário não definido";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE_BR,
  }).format(data);
}

function formatarHorario(evento: EventoBanco, data: Date | null) {
  const horario = normalizarHorario(valorPrimeiro(evento, ["horario_inicio", "hora_inicio", "horario", "hora", "hora_evento"]));
  if (horario) return horario;
  if (!data) return "Horário não definido";
  const horas = data.getHours();
  const minutos = data.getMinutes();
  if (horas === 0 && minutos === 0) return "Horário não definido";
  return formatarHoraData(data);
}

function formatarHorarioFim(evento: EventoBanco, dataFim: Date | null) {
  const horario = normalizarHorario(valorPrimeiro(evento, ["horario_fim", "hora_fim", "horario_termino", "hora_termino", "termino_hora"]));
  if (horario) return horario;
  if (!dataFim) return "Fim não definido";
  return formatarHoraData(dataFim);
}

function formatarPeriodo(horarioInicio: string, horarioFim: string) {
  if (horarioInicio === "Horário não definido" && horarioFim === "Fim não definido") return "Horário não definido";
  if (horarioFim === "Fim não definido") return horarioInicio;
  if (horarioInicio === "Horário não definido") return `Até ${horarioFim}`;
  return `${horarioInicio} às ${horarioFim}`;
}

function formatarDataHora(data: Date | null) {
  if (!data) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE_BR,
  }).format(data);
}

function formatarHoraItem(item: ItemCalendario) {
  if (!item.dataInicio) return "";
  return formatarHoraData(item.dataInicio);
}

function formatarPeriodoItem(item: ItemCalendario) {
  if (!item.dataInicio && !item.dataFim) return "Horário não definido";
  const inicio = item.dataInicio ? formatarHoraData(item.dataInicio) : "Início não definido";
  const fim = item.dataFim ? formatarHoraData(item.dataFim) : "Fim não definido";
  if (!item.dataFim) return inicio;
  return `${inicio} - ${fim}`;
}

function getLocalEvento(evento: EventoBanco) {
  return valorPrimeiro(evento, ["local", "local_evento", "espaco", "endereco", "cidade", "location"]) || "Local não definido";
}

function getStatusEvento(evento: EventoBanco) {
  return String(valorPrimeiro(evento, ["status", "situacao", "status_evento"]) || "ativo");
}

function ehMesmoMes(data: Date | null, mesAtual: Date) {
  if (!data) return false;
  return data.getFullYear() === mesAtual.getFullYear() && data.getMonth() === mesAtual.getMonth();
}

function criarDiasCalendario(mesAtual: Date) {
  const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const cursor = new Date(inicio);
  cursor.setDate(cursor.getDate() - inicio.getDay());
  const dias: Array<{ data: Date; dentroDoMes: boolean }> = [];

  while (dias.length < 42) {
    dias.push({ data: new Date(cursor), dentroDoMes: cursor.getMonth() === mesAtual.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

function slugTipoEnvio(tipo: string | null) {
  const valor = normalizarTexto(tipo);
  if (valor.includes("lembrete")) return "lembrete_rsvp";
  if (valor.includes("cartao")) return "cartao_evento";
  return "convite";
}

function calcularDiasRestantes(evento: EventoCalendario | null) {
  if (!evento?.data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataEvento = new Date(evento.data);
  dataEvento.setHours(0, 0, 0, 0);
  return Math.ceil((dataEvento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function adicionarDias(data: Date, dias: number) {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

function formatarInputDateTime(data: Date) {
  const offset = data.getTimezoneOffset();
  const local = new Date(data.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function categoriaStyle(categoria: string): CSSProperties {
  const cor = CATEGORIA_COR[categoria] || CATEGORIA_COR.evento;
  return {
    background: cor.bg,
    color: cor.color,
    border: `1px solid ${cor.border}`,
  };
}

function statusStyle(status: string): CSSProperties {
  const valor = normalizarTexto(status);
  if (valor.includes("final") || valor.includes("concl") || valor.includes("encerr")) {
    return { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
  }
  if (valor.includes("cancel") || valor.includes("erro") || valor.includes("inativo")) {
    return { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" };
  }
  if (valor.includes("pend") || valor.includes("rascunho")) {
    return { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" };
  }
  return { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" };
}

export default function CalendarioPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [agendaItems, setAgendaItems] = useState<ItemCalendario[]>([]);
  const [campanhasItems, setCampanhasItems] = useState<ItemCalendario[]>([]);
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [visao, setVisao] = useState<VisaoCalendario>("mes");
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState<string>("");
  const [detalheAberto, setDetalheAberto] = useState<ItemCalendario | EventoCalendario | null>(null);
  const [novoItemAberto, setNovoItemAberto] = useState(false);
  const [salvandoAgenda, setSalvandoAgenda] = useState(false);
  const [agendaForm, setAgendaForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "operacional",
    data_inicio: "",
    data_fim: "",
    status: "pendente",
    responsavel: "",
  });

  useEffect(() => {
    carregarCalendario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarCalendario() {
    setLoading(true);
    setErro(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErro("Usuário não autenticado. Faça login novamente.");
      setLoading(false);
      return;
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
      setErro("Não foi possível identificar o cliente vinculado a este usuário.");
      setLoading(false);
      return;
    }

    setTenantId(membro.tenant_id);

    const eventosQuery = await supabase
      .from("eventos")
      .select("*")
      .eq("tenant_id", membro.tenant_id)
      .order("created_at", { ascending: false });

    if (eventosQuery.error) {
      setErro("Erro ao carregar eventos: " + eventosQuery.error.message);
      setLoading(false);
      return;
    }

    const eventosBanco = (eventosQuery.data || []) as EventoBanco[];
    const idsEventos = eventosBanco.map((evento) => evento.id).filter(Boolean);
    let convidadosPorEvento = new Map<string, ConvidadoResumo[]>();

    if (idsEventos.length > 0) {
      const { data: convidadosData } = await supabase
        .from("convidados")
        .select("evento_id, status_rsvp, checkin_realizado, status_checkin")
        .in("evento_id", idsEventos);

      convidadosPorEvento = (convidadosData || []).reduce((mapa, convidado: ConvidadoResumo) => {
        if (!convidado.evento_id) return mapa;
        const lista = mapa.get(convidado.evento_id) || [];
        lista.push(convidado);
        mapa.set(convidado.evento_id, lista);
        return mapa;
      }, new Map<string, ConvidadoResumo[]>());
    }

    const eventosNormalizados = eventosBanco.map((evento) => {
      const data = parseDataInicioEvento(evento);
      const dataFim = parseDataFimEvento(evento, data);
      const horarioTexto = formatarHorario(evento, data);
      const horarioFimTexto = formatarHorarioFim(evento, dataFim);
      const convidados = convidadosPorEvento.get(evento.id) || [];
      const confirmados = convidados.filter((convidado) => normalizarTexto(convidado.status_rsvp).includes("confirm")).length;
      const pendentes = convidados.filter((convidado) => {
        const valor = normalizarTexto(convidado.status_rsvp);
        return !valor || valor.includes("pendente") || valor.includes("aguard");
      }).length;
      const checkins = convidados.filter(
        (convidado) => convidado.checkin_realizado === true || normalizarTexto(convidado.status_checkin).includes("entrou")
      ).length;

      return {
        id: evento.id,
        nome: String(evento.nome || evento.titulo || "Evento sem nome"),
        data,
        dataFim,
        dataTexto: formatarData(data),
        horarioTexto,
        horarioFimTexto,
        periodoTexto: formatarPeriodo(horarioTexto, horarioFimTexto),
        localTexto: String(getLocalEvento(evento)),
        statusTexto: getStatusEvento(evento),
        tenantId: evento.tenant_id || membro.tenant_id,
        convidadosTotal: convidados.length,
        confirmados,
        pendentes,
        checkins,
        raw: evento,
      };
    });

    let agendaNormalizada: ItemCalendario[] = [];
    let campanhasNormalizadas: ItemCalendario[] = [];

    if (idsEventos.length > 0) {
      const { data: agendaData } = await supabase
        .from("event_agenda_items")
        .select("*")
        .eq("tenant_id", membro.tenant_id)
        .in("evento_id", idsEventos)
        .order("data_inicio", { ascending: true });

      agendaNormalizada = ((agendaData || []) as AgendaItemBanco[]).map((item) => ({
        id: item.id,
        eventoId: item.evento_id || "",
        titulo: item.titulo || "Item de agenda",
        descricao: item.descricao || "",
        categoria: (item.categoria || "operacional") as ItemCalendario["categoria"],
        dataInicio: parseDateSafe(item.data_inicio),
        dataFim: parseDateSafe(item.data_fim),
        status: item.status || "pendente",
        responsavel: item.responsavel || "",
        origem: "event_agenda_items",
        cor: item.cor,
      }));

      const { data: campanhasData } = await supabase
        .from("envio_campanhas")
        .select("id, tenant_id, evento_id, tipo_envio, nome, mensagem, midia_url, ativo, criado_em, atualizado_em")
        .eq("tenant_id", membro.tenant_id)
        .in("evento_id", idsEventos)
        .order("criado_em", { ascending: true });

      campanhasNormalizadas = ((campanhasData || []) as EnvioCampanhaBanco[]).map((campanha) => {
        const tipo = slugTipoEnvio(campanha.tipo_envio);
        const dataCampanha = parseDateSafe(campanha.atualizado_em || campanha.criado_em);
        return {
          id: campanha.id,
          eventoId: campanha.evento_id || "",
          titulo: campanha.nome || (tipo === "convite" ? "Convite inicial" : tipo === "lembrete_rsvp" ? "Lembrete RSVP" : "Cartão de entrada"),
          descricao: campanha.mensagem || "Campanha de envio OmniStage",
          categoria: "campanha",
          dataInicio: dataCampanha,
          dataFim: null,
          status: campanha.ativo === false ? "inativa" : "ativa",
          responsavel: "OmniStage",
          origem: "envio_campanhas",
          cor: null,
        };
      });
    }

    setEventos(eventosNormalizados);
    setAgendaItems(agendaNormalizada);
    setCampanhasItems(campanhasNormalizadas);

    if (!eventoSelecionadoId && eventosNormalizados.length > 0) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const futuro = eventosNormalizados
        .filter((evento) => evento.data && evento.data >= hoje)
        .sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))[0];
      setEventoSelecionadoId((futuro || eventosNormalizados[0]).id);
    }

    setLoading(false);
  }

  function abrirNovoItemAgenda() {
    const base = eventoSelecionado?.data ? new Date(eventoSelecionado.data) : new Date();
    base.setHours(9, 0, 0, 0);
    setAgendaForm({
      titulo: "",
      descricao: "",
      categoria: "operacional",
      data_inicio: formatarInputDateTime(base),
      data_fim: "",
      status: "pendente",
      responsavel: "",
    });
    setNovoItemAberto(true);
  }

  async function salvarNovoItemAgenda(event?: any) {
    event?.preventDefault();
    if (!tenantId || !eventoSelecionado?.id) {
      setErro("Selecione um evento antes de cadastrar um item de agenda.");
      return;
    }
    if (!agendaForm.titulo.trim() || !agendaForm.data_inicio) {
      setErro("Informe o título e a data inicial do item de agenda.");
      return;
    }

    setSalvandoAgenda(true);
    setErro(null);

    const { error } = await supabase.from("event_agenda_items").insert({
      tenant_id: tenantId,
      evento_id: eventoSelecionado.id,
      titulo: agendaForm.titulo.trim(),
      descricao: agendaForm.descricao.trim() || null,
      categoria: agendaForm.categoria,
      data_inicio: new Date(agendaForm.data_inicio).toISOString(),
      data_fim: agendaForm.data_fim ? new Date(agendaForm.data_fim).toISOString() : null,
      status: agendaForm.status,
      responsavel: agendaForm.responsavel.trim() || null,
      cor: null,
      atualizado_em: new Date().toISOString(),
    });

    setSalvandoAgenda(false);

    if (error) {
      setErro("Erro ao salvar item de agenda: " + error.message);
      return;
    }

    setNovoItemAberto(false);
    await carregarCalendario();
  }

  const eventosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return eventos
      .filter((evento) => {
        if (!termo) return true;
        return (
          normalizarTexto(evento.nome).includes(termo) ||
          normalizarTexto(evento.localTexto).includes(termo) ||
          normalizarTexto(evento.statusTexto).includes(termo)
        );
      })
      .filter((evento) => {
        if (status === "todos") return true;
        if (status === "com_data") return Boolean(evento.data);
        if (status === "sem_data") return !evento.data;
        if (status === "ativos") {
          const valor = normalizarTexto(evento.statusTexto);
          return !valor.includes("final") && !valor.includes("encerr") && !valor.includes("cancel");
        }
        if (status === "finalizados") {
          const valor = normalizarTexto(evento.statusTexto);
          return valor.includes("final") || valor.includes("encerr") || valor.includes("concl");
        }
        return true;
      });
  }, [busca, eventos, status]);

  const eventoSelecionado = useMemo(() => {
    return eventos.find((evento) => evento.id === eventoSelecionadoId) || eventos[0] || null;
  }, [eventoSelecionadoId, eventos]);

  const itensAgendaSelecionado = useMemo(() => {
    if (!eventoSelecionado) return [];
    return agendaItems.filter((item) => item.eventoId === eventoSelecionado.id);
  }, [agendaItems, eventoSelecionado]);

  const campanhasSelecionado = useMemo(() => {
    if (!eventoSelecionado) return [];
    return campanhasItems.filter((item) => item.eventoId === eventoSelecionado.id);
  }, [campanhasItems, eventoSelecionado]);

  const itensCalendario = useMemo(() => {
    const eventosComoItens: ItemCalendario[] = eventosFiltrados.map((evento) => ({
      id: evento.id,
      eventoId: evento.id,
      titulo: evento.nome,
      descricao: `${evento.localTexto} • ${evento.convidadosTotal} convidado(s)`,
      categoria: "evento",
      dataInicio: evento.data,
      dataFim: evento.dataFim,
      status: evento.statusTexto,
      responsavel: "",
      origem: "eventos",
      cor: null,
    }));

    return [...eventosComoItens, ...agendaItems, ...campanhasItems].filter((item) => {
      if (!item.dataInicio) return false;
      if (!eventosFiltrados.some((evento) => evento.id === item.eventoId)) return false;
      return true;
    });
  }, [agendaItems, campanhasItems, eventosFiltrados]);

  const proximosItens = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return itensCalendario
      .filter((item) => item.dataInicio && item.dataInicio >= hoje)
      .sort((a, b) => (a.dataInicio?.getTime() || 0) - (b.dataInicio?.getTime() || 0))
      .slice(0, 8);
  }, [itensCalendario]);

  const eventosSemData = useMemo(() => eventosFiltrados.filter((evento) => !evento.data), [eventosFiltrados]);

  const timelineSelecionada = useMemo(() => {
    if (!eventoSelecionado) return [];

    const timelineAutomatica: ItemCalendario[] = [];

    if (eventoSelecionado.data) {
      timelineAutomatica.push(
        {
          id: `auto-convite-${eventoSelecionado.id}`,
          eventoId: eventoSelecionado.id,
          titulo: "Convite inicial",
          descricao: "Marco automático para disparo ou conferência do convite principal.",
          categoria: "timeline",
          dataInicio: adicionarDias(eventoSelecionado.data, -30),
          dataFim: null,
          status: campanhasSelecionado.some((item) => slugTipoEnvio(item.titulo) === "convite") ? "configurado" : "sugerido",
          responsavel: "OmniStage",
          origem: "eventos",
        },
        {
          id: `auto-lembrete-${eventoSelecionado.id}`,
          eventoId: eventoSelecionado.id,
          titulo: "Lembrete RSVP",
          descricao: "Marco automático para reforço de confirmação de presença.",
          categoria: "rsvp",
          dataInicio: adicionarDias(eventoSelecionado.data, -7),
          dataFim: null,
          status: campanhasSelecionado.some((item) => slugTipoEnvio(item.titulo) === "lembrete_rsvp") ? "configurado" : "sugerido",
          responsavel: "OmniStage",
          origem: "eventos",
        },
        {
          id: `auto-cartao-${eventoSelecionado.id}`,
          eventoId: eventoSelecionado.id,
          titulo: "Cartão de entrada",
          descricao: "Marco automático para envio ou conferência dos cartões de entrada.",
          categoria: "checkin",
          dataInicio: adicionarDias(eventoSelecionado.data, -1),
          dataFim: null,
          status: campanhasSelecionado.some((item) => slugTipoEnvio(item.titulo) === "cartao_evento") ? "configurado" : "sugerido",
          responsavel: "OmniStage",
          origem: "eventos",
        },
        {
          id: `evento-${eventoSelecionado.id}`,
          eventoId: eventoSelecionado.id,
          titulo: "Dia do evento",
          descricao: `${eventoSelecionado.nome} • ${eventoSelecionado.localTexto}`,
          categoria: "evento",
          dataInicio: eventoSelecionado.data,
          dataFim: eventoSelecionado.dataFim,
          status: eventoSelecionado.statusTexto,
          responsavel: "",
          origem: "eventos",
        },
        {
          id: `auto-pos-${eventoSelecionado.id}`,
          eventoId: eventoSelecionado.id,
          titulo: "Pós-evento",
          descricao: "Agradecimento, fotos, vídeo e fechamento do relatório.",
          categoria: "pos_evento",
          dataInicio: adicionarDias(eventoSelecionado.data, 1),
          dataFim: null,
          status: "sugerido",
          responsavel: "OmniStage",
          origem: "eventos",
        }
      );
    }

    return [...timelineAutomatica, ...campanhasSelecionado, ...itensAgendaSelecionado]
      .filter((item) => item.dataInicio)
      .sort((a, b) => (a.dataInicio?.getTime() || 0) - (b.dataInicio?.getTime() || 0));
  }, [campanhasSelecionado, eventoSelecionado, itensAgendaSelecionado]);

  const agendaOperacional = useMemo(() => {
    return itensAgendaSelecionado
      .filter((item) => ["operacional", "tarefa", "fornecedor", "cerimonial", "checkin"].includes(item.categoria))
      .sort((a, b) => (a.dataInicio?.getTime() || 0) - (b.dataInicio?.getTime() || 0));
  }, [itensAgendaSelecionado]);

  const totais = useMemo(() => {
    return eventosFiltrados.reduce(
      (acc, evento) => {
        acc.eventos += 1;
        acc.convidados += evento.convidadosTotal;
        acc.confirmados += evento.confirmados;
        acc.checkins += evento.checkins;
        if (evento.data) acc.comData += 1;
        return acc;
      },
      { eventos: 0, convidados: 0, confirmados: 0, checkins: 0, comData: 0 }
    );
  }, [eventosFiltrados]);

  const indicadoresCalendario = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const eventosComData = eventosFiltrados.filter((evento) => evento.data);
    const eventosDoMes = eventosComData.filter(
      (evento) => evento.data!.getFullYear() === mesAtual.getFullYear() && evento.data!.getMonth() === mesAtual.getMonth()
    );
    const realizados = eventosDoMes.filter((evento) => {
      const dataEvento = new Date(evento.data!);
      dataEvento.setHours(0, 0, 0, 0);
      return dataEvento < hoje;
    }).length;
    const hojeCount = eventosDoMes.filter((evento) => evento.data && mesmoDia(evento.data, hoje)).length;
    const aRealizar = eventosDoMes.filter((evento) => {
      const dataEvento = new Date(evento.data!);
      dataEvento.setHours(0, 0, 0, 0);
      return dataEvento >= hoje;
    }).length;

    const campanhasDoMes = campanhasItems.filter(
      (campanha) =>
        campanha.dataInicio &&
        campanha.dataInicio.getFullYear() === mesAtual.getFullYear() &&
        campanha.dataInicio.getMonth() === mesAtual.getMonth() &&
        eventosFiltrados.some((evento) => evento.id === campanha.eventoId)
    ).length;

    const agendaDoMes = agendaItems.filter(
      (agenda) =>
        agenda.dataInicio &&
        agenda.dataInicio.getFullYear() === mesAtual.getFullYear() &&
        agenda.dataInicio.getMonth() === mesAtual.getMonth() &&
        eventosFiltrados.some((evento) => evento.id === agenda.eventoId)
    ).length;

    const rsvpMedio = totais.convidados > 0 ? Math.round((totais.confirmados / totais.convidados) * 100) : 0;
    const proximoEvento = eventosComData
      .filter((evento) => {
        const dataEvento = new Date(evento.data!);
        dataEvento.setHours(0, 0, 0, 0);
        return dataEvento >= hoje;
      })
      .sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))[0];
    const diasProximo = calcularDiasRestantes(proximoEvento || null);

    return {
      eventosNoMes: eventosDoMes.length,
      realizados,
      aRealizar,
      hoje: hojeCount,
      campanhasDoMes,
      agendaDoMes,
      rsvpMedio,
      proximo: diasProximo === null ? "--" : diasProximo < 0 ? `D+${Math.abs(diasProximo)}` : `D-${diasProximo}`,
    };
  }, [agendaItems, campanhasItems, eventosFiltrados, mesAtual, totais.confirmados, totais.convidados]);

  const diasRestantes = calcularDiasRestantes(eventoSelecionado);
  const taxaRsvp = eventoSelecionado?.convidadosTotal ? Math.round((eventoSelecionado.confirmados / eventoSelecionado.convidadosTotal) * 100) : 0;
  const diasCalendario = useMemo(() => criarDiasCalendario(mesAtual), [mesAtual]);

  const alertasPendencias = useMemo(() => {
    const alertas: Array<{ titulo: string; descricao: string; nivel: "alto" | "medio" | "baixo" }> = [];

    if (!eventoSelecionado) return alertas;

    const dias = calcularDiasRestantes(eventoSelecionado);
    const eventoFuturo = dias === null || dias >= 0;

    if (eventoFuturo && agendaOperacional.length === 0) {
      alertas.push({
        titulo: "Agenda operacional vazia",
        descricao: "Cadastre montagem, fornecedores, cerimonial e check-in para organizar a produção.",
        nivel: "alto",
      });
    }

    if (eventoFuturo && campanhasSelecionado.length === 0) {
      alertas.push({
        titulo: "Sem campanhas vinculadas",
        descricao: "Inclua ou revise as campanhas de convite, lembrete RSVP e cartão de entrada.",
        nivel: "medio",
      });
    }

    if (eventoSelecionado.convidadosTotal > 0 && taxaRsvp < 60 && eventoFuturo) {
      alertas.push({
        titulo: "RSVP abaixo de 60%",
        descricao: "Considere criar um lembrete RSVP para reduzir pendências antes do evento.",
        nivel: "medio",
      });
    }

    if (eventoFuturo && dias !== null && dias <= 3 && agendaOperacional.some((item) => !normalizarTexto(item.status).includes("concl"))) {
      alertas.push({
        titulo: "Evento próximo com pendências",
        descricao: "Revise os itens operacionais ainda não concluídos antes da data do evento.",
        nivel: "alto",
      });
    }

    return alertas;
  }, [agendaOperacional, campanhasSelecionado.length, eventoSelecionado, taxaRsvp]);

  function mudarMes(delta: number) {
    setMesAtual((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
  }

  function irParaHoje() {
    setMesAtual(new Date());
  }

  function itensDoDia(data: Date) {
    return itensCalendario.filter((item) => item.dataInicio && mesmoDia(item.dataInicio, data));
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingCardStyle}>
          <strong>Carregando calendário...</strong>
          <span>Buscando eventos, campanhas e agenda operacional.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle} data-module-key={MODULE_KEY}>
      <style>{responsiveCss}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>OmniStage Calendário</span>
          <h1 style={titleStyle}>Calendário e agenda do evento</h1>
          <p style={subtitleStyle}>
            Visão operacional com calendário mensal, linha do tempo, campanhas e agenda de produção.
            {eventoSelecionado?.nome ? ` Evento: ${eventoSelecionado.nome}.` : ""}
          </p>
        </div>

      </section>

      {erro && <div style={errorBoxStyle}>{erro}</div>}

      <section style={statsGridStyle}>
        <MetricCard label="Eventos no mês" value={indicadoresCalendario.eventosNoMes} detail={`${MESES[mesAtual.getMonth()]} ${mesAtual.getFullYear()}`} />
        <MetricCard label="Realizados" value={indicadoresCalendario.realizados} detail="Eventos já ocorridos no mês" />
        <MetricCard label="A realizar" value={indicadoresCalendario.aRealizar} detail="Eventos de hoje em diante" />
        <MetricCard label="Hoje" value={indicadoresCalendario.hoje} detail="Eventos marcados para hoje" />
        <MetricCard label="Campanhas" value={indicadoresCalendario.campanhasDoMes} detail="Campanhas no mês" />
        <MetricCard label="Agenda operacional" value={indicadoresCalendario.agendaDoMes} detail="Tarefas e compromissos" />
        <MetricCard label="RSVP médio" value={`${indicadoresCalendario.rsvpMedio}%`} detail="Confirmados sobre convidados" />
        <MetricCard label="Próximo evento" value={indicadoresCalendario.proximo} detail="Contagem regressiva" />
      </section>

      {alertasPendencias.length > 0 && (
        <section style={alertsGridStyle}>
          {alertasPendencias.map((alerta) => (
            <div key={alerta.titulo} style={alerta.nivel === "alto" ? alertCardHighStyle : alertCardMediumStyle}>
              <strong style={alertTitleStyle}>{alerta.titulo}</strong>
              <span style={alertTextStyle}>{alerta.descricao}</span>
            </div>
          ))}
        </section>
      )}

      <section style={overviewGridStyle} className="cal-overview-grid">
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <span style={sectionKickerStyle}>Próximos</span>
              <h2 style={panelTitleStyle}>Compromissos</h2>
              <p style={panelTextStyle}>Eventos, campanhas e tarefas com data definida.</p>
            </div>
            <span style={counterStyle}>{proximosItens.length}</span>
          </div>

          <div style={listStackStyle}>
            {proximosItens.length === 0 ? (
              <EmptyState title="Sem próximos itens" description="Cadastre campanhas ou itens de agenda operacional." />
            ) : (
              proximosItens.map((item) => {
                const eventoDoItem = eventos.find((evento) => evento.id === item.eventoId) || null;
                return (
                  <ItemRow
                    key={`${item.origem}-${item.id}`}
                    item={item}
                    evento={eventoDoItem}
                    campanhasCount={campanhasItems.filter((campanha) => campanha.eventoId === item.eventoId).length}
                    agendaCount={agendaItems.filter((agenda) => agenda.eventoId === item.eventoId).length}
                    onClick={() => setDetalheAberto(item)}
                    compact
                  />
                );
              })
            )}
          </div>
        </div>
      </section>

      <section style={mainGridStyle} className="cal-main-grid">
        <div style={calendarPanelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <span style={sectionKickerStyle}>Calendário mensal</span>
              <h2 style={panelTitleStyle}>{MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}</h2>
            </div>
            <div style={calendarActionsStyle}>
              <button onClick={() => mudarMes(-1)} style={iconButtonStyle} aria-label="Mês anterior">‹</button>
              <button onClick={() => mudarMes(1)} style={iconButtonStyle} aria-label="Próximo mês">›</button>
            </div>
          </div>

          <div style={filtersRowStyle} className="cal-filters-row">
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por evento, local ou status" style={searchInputStyle} />
            <select value={status} onChange={(event) => setStatus(event.target.value as FiltroStatus)} style={filterSelectStyle}>
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="finalizados">Finalizados</option>
              <option value="com_data">Com data</option>
              <option value="sem_data">Sem data</option>
            </select>
            <div style={segmentedStyle}>
              <button onClick={() => setVisao("mes")} style={visao === "mes" ? segmentActiveStyle : segmentStyle}>Mês</button>
              <button onClick={() => setVisao("lista")} style={visao === "lista" ? segmentActiveStyle : segmentStyle}>Lista</button>
            </div>
          </div>

          <div style={legendStyle}>
            <LegendItem label="Evento" styleDef={CATEGORIA_COR.evento} />
            <LegendItem label="Campanha" styleDef={CATEGORIA_COR.campanha} />
            <LegendItem label="Agenda" styleDef={CATEGORIA_COR.operacional} />
            <LegendItem label="RSVP" styleDef={CATEGORIA_COR.rsvp} />
            <LegendItem label="Pós-evento" styleDef={CATEGORIA_COR.pos_evento} />
          </div>

          {visao === "mes" ? (
            <div style={calendarWrapperStyle}>
              <div style={weekHeaderStyle}>
                {DIAS_SEMANA.map((dia) => <div key={dia} style={weekDayStyle}>{dia}</div>)}
              </div>
              <div style={calendarGridStyle}>
                {diasCalendario.map(({ data, dentroDoMes }) => {
                  const itens = itensDoDia(data);
                  const isToday = mesmoDia(data, new Date());

                  return (
                    <div key={data.toISOString()} style={{ ...dayCellStyle, opacity: dentroDoMes ? 1 : 0.38, borderColor: isToday ? "#7c3aed" : "#e5e7eb" }}>
                      <div style={dayTopStyle}>
                        <span style={isToday ? todayNumberStyle : dayNumberStyle}>{data.getDate()}</span>
                      </div>
                      <div style={dayEventsStyle}>
                        {itens.slice(0, 3).map((item) => (
                          <button
                            key={`${item.origem}-${item.id}`}
                            onClick={() => setDetalheAberto(item)}
                            style={{ ...dayEventStyle, ...categoriaStyle(item.categoria) }}
                            title={`${item.titulo} • ${formatarPeriodoItem(item)}`}
                          >
                            <span style={dayEventTitleStyle}>{item.titulo}</span>
                            <span style={dayEventTimeStyle}>{formatarPeriodoItem(item)}</span>
                          </button>
                        ))}
                        {itens.length > 3 && <span style={moreEventsStyle}>+{itens.length - 3}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={listModeStyle}>
              {itensCalendario.length === 0 ? <EmptyState title="Nenhum item encontrado" description="Ajuste os filtros ou cadastre itens na agenda." /> : itensCalendario.map((item) => <ItemRow key={`${item.origem}-${item.id}`} item={item} onClick={() => setDetalheAberto(item)} />)}
            </div>
          )}
        </div>

        <aside style={sideColumnStyle}>
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <span style={sectionKickerStyle}>Linha do tempo</span>
                <h2 style={panelTitleStyle}>Evento</h2>
              </div>
              <span style={counterStyle}>{timelineSelecionada.length}</span>
            </div>
            <div style={timelineStackStyle}>
              {timelineSelecionada.length === 0 ? (
                <EmptyState title="Sem timeline" description="Inclua campanhas ou agenda com data." />
              ) : (
                timelineSelecionada.map((item, index) => <TimelineRow key={`${item.origem}-${item.id}`} item={item} isLast={index === timelineSelecionada.length - 1} onClick={() => setDetalheAberto(item)} />)
              )}
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <span style={sectionKickerStyle}>Agenda operacional</span>
                <h2 style={panelTitleStyle}>Produção</h2>
              </div>
              <div style={agendaHeaderActionsStyle}>
                <span style={counterStyle}>{agendaOperacional.length}</span>
                <button onClick={abrirNovoItemAgenda} style={smallPrimaryButtonStyle}>Adicionar</button>
              </div>
            </div>
            <div style={listStackStyle}>
              {agendaOperacional.length === 0 ? (
                <EmptyState title="Sem agenda operacional" description="Cadastre montagem, fornecedores, cerimonial e check-in." />
              ) : (
                agendaOperacional.map((item) => <ItemRow key={`${item.origem}-${item.id}`} item={item} onClick={() => setDetalheAberto(item)} compact />)
              )}
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <span style={sectionKickerStyle}>Revisão</span>
                <h2 style={panelTitleStyle}>Sem data</h2>
              </div>
              <span style={counterStyle}>{eventosSemData.length}</span>
            </div>
            <div style={listStackStyle}>
              {eventosSemData.length === 0 ? (
                <EmptyState title="Tudo certo" description="Todos os eventos filtrados possuem data." />
              ) : (
                eventosSemData.slice(0, 6).map((evento) => (
                  <button key={evento.id} onClick={() => setEventoSelecionadoId(evento.id)} style={simpleRowButtonStyle}>{evento.nome}</button>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      {novoItemAberto && (
        <div style={modalBackdropStyle}>
          <div style={modalStyle}>
            <form onSubmit={salvarNovoItemAgenda}>
              <div style={modalHeaderStyle}>
                <div>
                  <span style={{ ...badgeStyle, ...categoriaStyle("operacional") }}>Agenda operacional</span>
                  <h2 style={modalTitleStyle}>Adicionar item de agenda</h2>
                  <p style={panelTextStyle}>{eventoSelecionado?.nome || "Selecione um evento para vincular o item."}</p>
                </div>
                <button type="button" onClick={() => setNovoItemAberto(false)} style={closeButtonStyle}>×</button>
              </div>

              <div style={formGridStyle}>
                <label style={formFieldStyle}>
                  <span style={formLabelStyle}>Título</span>
                  <input
                    value={agendaForm.titulo}
                    onChange={(event) => setAgendaForm((atual) => ({ ...atual, titulo: event.target.value }))}
                    placeholder="Ex.: Montagem, Buffet, Cerimonial, Check-in"
                    style={formInputStyle}
                  />
                </label>

                <label style={formFieldStyle}>
                  <span style={formLabelStyle}>Categoria</span>
                  <select
                    value={agendaForm.categoria}
                    onChange={(event) => setAgendaForm((atual) => ({ ...atual, categoria: event.target.value }))}
                    style={formInputStyle}
                  >
                    <option value="operacional">Operacional</option>
                    <option value="tarefa">Tarefa</option>
                    <option value="fornecedor">Fornecedor</option>
                    <option value="cerimonial">Cerimonial</option>
                    <option value="checkin">Check-in</option>
                    <option value="rsvp">RSVP</option>
                    <option value="pos_evento">Pós-evento</option>
                  </select>
                </label>

                <label style={formFieldStyle}>
                  <span style={formLabelStyle}>Início</span>
                  <input
                    type="datetime-local"
                    value={agendaForm.data_inicio}
                    onChange={(event) => setAgendaForm((atual) => ({ ...atual, data_inicio: event.target.value }))}
                    style={formInputStyle}
                  />
                </label>

                <label style={formFieldStyle}>
                  <span style={formLabelStyle}>Fim</span>
                  <input
                    type="datetime-local"
                    value={agendaForm.data_fim}
                    onChange={(event) => setAgendaForm((atual) => ({ ...atual, data_fim: event.target.value }))}
                    style={formInputStyle}
                  />
                </label>

                <label style={formFieldStyle}>
                  <span style={formLabelStyle}>Status</span>
                  <select
                    value={agendaForm.status}
                    onChange={(event) => setAgendaForm((atual) => ({ ...atual, status: event.target.value }))}
                    style={formInputStyle}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>

                <label style={formFieldStyle}>
                  <span style={formLabelStyle}>Responsável</span>
                  <input
                    value={agendaForm.responsavel}
                    onChange={(event) => setAgendaForm((atual) => ({ ...atual, responsavel: event.target.value }))}
                    placeholder="Nome da pessoa/equipe"
                    style={formInputStyle}
                  />
                </label>

                <label style={{ ...formFieldStyle, gridColumn: "1 / -1" }}>
                  <span style={formLabelStyle}>Descrição</span>
                  <textarea
                    value={agendaForm.descricao}
                    onChange={(event) => setAgendaForm((atual) => ({ ...atual, descricao: event.target.value }))}
                    placeholder="Detalhes do compromisso, observações e instruções operacionais."
                    style={formTextareaStyle}
                  />
                </label>
              </div>

              <div style={modalFooterStyle}>
                <button type="submit" disabled={salvandoAgenda} style={primaryActionButtonStyle}>{salvandoAgenda ? "Salvando..." : "Salvar item"}</button>
                <button type="button" onClick={() => setNovoItemAberto(false)} style={secondaryActionButtonStyle}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detalheAberto && (
        <div style={modalBackdropStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <span style={{ ...badgeStyle, ...("categoria" in detalheAberto ? categoriaStyle(detalheAberto.categoria) : statusStyle(detalheAberto.statusTexto)) }}>
                  {"categoria" in detalheAberto ? CATEGORIA_LABEL[detalheAberto.categoria] || detalheAberto.categoria : detalheAberto.statusTexto}
                </span>
                <h2 style={modalTitleStyle}>{"titulo" in detalheAberto ? detalheAberto.titulo : detalheAberto.nome}</h2>
                <p style={panelTextStyle}>{"dataInicio" in detalheAberto ? formatarDataHora(detalheAberto.dataInicio) : `${detalheAberto.dataTexto} • ${detalheAberto.periodoTexto}`}</p>
              </div>
              <button onClick={() => setDetalheAberto(null)} style={closeButtonStyle}>×</button>
            </div>

            {"categoria" in detalheAberto ? (
              <div style={detailGridStyle}>
                <DetailBox label="Categoria" value={CATEGORIA_LABEL[detalheAberto.categoria] || detalheAberto.categoria} />
                <DetailBox label="Status" value={detalheAberto.status} />
                <DetailBox label="Início" value={formatarDataHora(detalheAberto.dataInicio)} />
                <DetailBox label="Fim" value={formatarDataHora(detalheAberto.dataFim)} />
                <DetailBox label="Responsável" value={detalheAberto.responsavel || "Não definido"} />
                <DetailBox label="Origem" value={detalheAberto.origem} />
                <DetailBox label="Descrição" value={detalheAberto.descricao || "Sem descrição"} full />
              </div>
            ) : (
              <div style={detailGridStyle}>
                <DetailBox label="Data" value={detalheAberto.dataTexto} />
                <DetailBox label="Início" value={formatarDataHora(detalheAberto.data)} />
                <DetailBox label="Fim" value={formatarDataHora(detalheAberto.dataFim)} />
                <DetailBox label="Período" value={detalheAberto.periodoTexto} />
                <DetailBox label="Local" value={detalheAberto.localTexto} />
                <DetailBox label="Tenant" value={detalheAberto.tenantId || tenantId || "Não identificado"} />
                <DetailBox label="Convidados" value={detalheAberto.convidadosTotal} />
                <DetailBox label="Confirmados" value={detalheAberto.confirmados} />
                <DetailBox label="Pendentes" value={detalheAberto.pendentes} />
                <DetailBox label="Check-ins" value={detalheAberto.checkins} />
              </div>
            )}

            {eventoSelecionado && (
              <div style={modalFooterStyle}>
                <a href={`/app/eventos?evento=${eventoSelecionado.id}`} style={primaryLinkStyle}>Abrir evento</a>
                <a href={`/app/envios?evento=${eventoSelecionado.id}`} style={secondaryLinkStyle}>Ir para envios</a>
                <a href={`/app/convidados?evento=${eventoSelecionado.id}`} style={secondaryLinkStyle}>Ver convidados</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ label, styleDef }: { label: string; styleDef: { bg: string; color: string; border: string } }) {
  return (
    <span style={legendItemStyle}>
      <span style={{ ...legendDotStyle, background: styleDef.color }} />
      {label}
    </span>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  const valueText = typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  return (
    <article style={metricCardStyle} className="cal-card-hover">
      <span style={metricLabelStyle}>{label}</span>
      <strong style={metricValueStyle}>{valueText}</strong>
      <small style={metricDetailStyle}>{detail}</small>
    </article>
  );
}

function MiniCard({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <div style={compact ? miniCardCompactStyle : miniCardStyle}>
      <span style={miniLabelStyle}>{label}</span>
      <strong style={compact ? miniValueCompactStyle : miniValueStyle}>{value}</strong>
    </div>
  );
}

function ItemRow({
  item,
  onClick,
  compact = false,
  evento,
  campanhasCount = 0,
  agendaCount = 0,
}: {
  item: ItemCalendario;
  onClick: () => void;
  compact?: boolean;
  evento?: EventoCalendario | null;
  campanhasCount?: number;
  agendaCount?: number;
}) {
  const isEvento = item.categoria === "evento" && evento;
  const dias = isEvento ? calcularDiasRestantes(evento) : null;
  const taxa = isEvento && evento.convidadosTotal ? Math.round((evento.confirmados / evento.convidadosTotal) * 100) : 0;

  return (
    <article onClick={onClick} style={itemRowStyle} className="cal-card-hover" role="button" tabIndex={0}>
      <div style={itemRowTopStyle}>
        <div style={{ minWidth: 0 }}>
          <strong style={compact ? itemTitleCompactStyle : itemTitleStyle}>{isEvento ? evento.nome : item.titulo}</strong>
          <span style={itemDateStyle}>
            {isEvento
              ? `${evento.dataTexto} • ${evento.periodoTexto}${evento.localTexto ? ` • ${evento.localTexto}` : ""}`
              : formatarDataHora(item.dataInicio)}
          </span>
          {!compact && <span style={itemDescStyle}>{item.descricao}</span>}
        </div>
        <span style={{ ...badgeStyle, ...categoriaStyle(item.categoria) }}>{CATEGORIA_LABEL[item.categoria] || item.categoria}</span>
      </div>

      {isEvento && (
        <>
          <div style={eventInfoGridStyle}>
            <MiniCard label="Status" value={dias === null ? evento.statusTexto : dias < 0 ? "Realizado" : dias === 0 ? "Hoje" : "A realizar"} compact />
            <MiniCard label="Convidados" value={evento.convidadosTotal} compact />
            <MiniCard label="Confirmados" value={evento.confirmados} compact />
            <MiniCard label="RSVP" value={`${taxa}%`} compact />
            <MiniCard label="Campanhas" value={campanhasCount} compact />
            <MiniCard label="Agenda" value={agendaCount} compact />
          </div>
          <div style={quickActionsStyle}>
            <a href={`/app/eventos?evento=${evento.id}`} style={primaryLinkStyle} onClick={(event) => event.stopPropagation()}>Ver evento</a>
            <a href={`/app/convidados?evento=${evento.id}`} style={secondaryLinkStyle} onClick={(event) => event.stopPropagation()}>Convidados</a>
            <a href={`/app/envios?evento=${evento.id}`} style={secondaryLinkStyle} onClick={(event) => event.stopPropagation()}>Envios</a>
            <a href={`/app/rsvp?evento=${evento.id}`} style={secondaryLinkStyle} onClick={(event) => event.stopPropagation()}>RSVP</a>
          </div>
        </>
      )}
    </article>
  );
}

function TimelineRow({ item, isLast, onClick }: { item: ItemCalendario; isLast: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={timelineButtonStyle}>
      <div style={timelineLineColStyle}>
        <span style={timelineDotStyle} />
        {!isLast && <span style={timelineLineStyle} />}
      </div>
      <div style={timelineContentStyle} className="cal-card-hover">
        <span style={timelineDateStyle}>{formatarData(item.dataInicio)}</span>
        <strong style={itemTitleCompactStyle}>{item.titulo}</strong>
        <span style={itemDescStyle}>{item.descricao || CATEGORIA_LABEL[item.categoria]}</span>
      </div>
    </button>
  );
}

function DetailBox({ label, value, full = false }: { label: string; value: string | number; full?: boolean }) {
  return (
    <div style={{ ...detailBoxStyle, ...(full ? { gridColumn: "1 / -1" } : {}) }}>
      <span style={miniLabelStyle}>{label}</span>
      <strong style={detailValueStyle}>{value}</strong>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div style={emptyStateStyle}>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

const responsiveCss = `
  .cal-card-hover {
    transition: transform 170ms cubic-bezier(.2,.8,.2,1), box-shadow 170ms ease, border-color 170ms ease, background 170ms ease;
  }
  .cal-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 42px rgba(15,23,42,0.07);
    border-color: rgba(109,40,217,0.2) !important;
    background: #f8fafc !important;
  }
  button:focus-visible,
  a:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 3px solid rgba(109,40,217,0.22);
    outline-offset: 3px;
  }
  @media (max-width: 1180px) {
    .cal-main-grid,
    .cal-overview-grid {
      grid-template-columns: 1fr !important;
    }
  }
  @media (max-width: 760px) {
    .cal-mini-grid,
    .cal-filters-row {
      grid-template-columns: 1fr !important;
    }
  }
`;

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "32px",
  background: "#f8fafc",
  color: "#0f172a",
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const loadingCardStyle: CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: 32,
  borderRadius: 28,
  border: "1px solid #e2e8f0",
  background: "#fff",
  display: "grid",
  gap: 8,
  color: "#475569",
};

const heroStyle: CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto 22px",
  padding: 32,
  borderRadius: 28,
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  boxShadow: "0 18px 45px rgba(15,23,42,0.06)",
};

const heroActionsStyle: CSSProperties = { display: "none" };
const eyebrowStyle: CSSProperties = { fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6d28d9" };
const titleStyle: CSSProperties = { margin: "12px 0 10px", fontSize: 34, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.035em", color: "#0f172a" };
const subtitleStyle: CSSProperties = { margin: 0, maxWidth: 920, color: "#64748b", fontSize: 15, lineHeight: 1.65, fontWeight: 600 };

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 16,
  background: "#fff",
  color: "#6d28d9",
  fontWeight: 900,
  padding: "13px 18px",
  cursor: "pointer",
  boxShadow: "0 10px 28px rgba(15,23,42,0.12)",
};

const secondaryDarkButtonStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontWeight: 900,
  padding: "13px 18px",
  cursor: "pointer",
};

const eventSelectorPanelStyle: CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto 18px",
  padding: 20,
  borderRadius: 26,
  border: "1px solid #e2e8f0",
  background: "#fff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  boxShadow: "0 10px 30px rgba(15,23,42,0.04)",
};

const eventSelectStyle: CSSProperties = {
  minWidth: 280,
  minHeight: 46,
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  padding: "0 14px",
};

const fieldLabelStyle: CSSProperties = { display: "block", marginBottom: 4, color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" };
const panelTextStyle: CSSProperties = { margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.55, fontWeight: 600 };
const panelTitleStyle: CSSProperties = { margin: "4px 0", fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", color: "#0f172a" };
const sectionKickerStyle: CSSProperties = { color: "#6d28d9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" };

const statsGridStyle: CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto 18px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const metricCardStyle: CSSProperties = { padding: 20, borderRadius: 24, border: "1px solid #e2e8f0", background: "#fff", display: "grid", gap: 5 };
const metricLabelStyle: CSSProperties = { color: "#64748b", fontWeight: 800, fontSize: 13 };
const metricValueStyle: CSSProperties = { color: "#0f172a", fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em" };
const metricDetailStyle: CSSProperties = { color: "#94a3b8", fontSize: 12, fontWeight: 700 };

const overviewGridStyle: CSSProperties = { maxWidth: 1280, margin: "0 auto 18px", display: "grid", gridTemplateColumns: "1fr", gap: 18 };
const mainGridStyle: CSSProperties = { maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 18, alignItems: "start" };
const sideColumnStyle: CSSProperties = { display: "grid", gap: 18 };

const alertsGridStyle: CSSProperties = { maxWidth: 1280, margin: "0 auto 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 };
const alertCardHighStyle: CSSProperties = { padding: 16, borderRadius: 22, border: "1px solid #fecdd3", background: "#fff1f2", display: "grid", gap: 5 };
const alertCardMediumStyle: CSSProperties = { padding: 16, borderRadius: 22, border: "1px solid #fde68a", background: "#fffbeb", display: "grid", gap: 5 };
const alertTitleStyle: CSSProperties = { color: "#0f172a", fontSize: 14, fontWeight: 800 };
const alertTextStyle: CSSProperties = { color: "#64748b", fontSize: 13, fontWeight: 600, lineHeight: 1.45 };
const legendStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "0 0 16px", padding: "12px 14px", borderRadius: 18, border: "1px solid #e2e8f0", background: "#f8fafc" };
const legendItemStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, color: "#475569", fontSize: 12, fontWeight: 700 };
const legendDotStyle: CSSProperties = { width: 10, height: 10, borderRadius: 999, display: "inline-block" };


const panelStyle: CSSProperties = { padding: 22, borderRadius: 28, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 10px 30px rgba(15,23,42,0.04)" };
const calendarPanelStyle: CSSProperties = { ...panelStyle, minWidth: 0 };
const panelHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 16 };
const counterStyle: CSSProperties = { display: "inline-flex", minWidth: 34, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 999, background: "#f5f3ff", color: "#6d28d9", fontWeight: 950, fontSize: 12 };

const miniGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 18 };
const miniCardStyle: CSSProperties = { padding: 16, borderRadius: 20, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", gap: 5 };
const miniCardCompactStyle: CSSProperties = { padding: 12, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", gap: 4 };
const miniLabelStyle: CSSProperties = { color: "#64748b", fontSize: 11, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" };
const miniValueStyle: CSSProperties = { color: "#0f172a", fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em" };
const miniValueCompactStyle: CSSProperties = { color: "#0f172a", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" };
const eventInfoGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 14 };

const agendaHeaderActionsStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" };
const smallPrimaryButtonStyle: CSSProperties = { minHeight: 34, padding: "0 12px", borderRadius: 12, border: "none", background: "#6d28d9", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" };

const quickActionsStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 };
const primaryLinkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 42, padding: "0 16px", borderRadius: 15, background: "#6d28d9", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13 };
const secondaryLinkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 42, padding: "0 16px", borderRadius: 15, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", textDecoration: "none", fontWeight: 800, fontSize: 13 };

const listStackStyle: CSSProperties = { display: "grid", gap: 10 };
const timelineStackStyle: CSSProperties = { display: "grid", gap: 0 };
const itemRowStyle: CSSProperties = { width: "100%", border: "1px solid #e2e8f0", background: "#fff", borderRadius: 22, padding: 14, textAlign: "left", cursor: "pointer" };
const itemRowTopStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" };
const itemTitleStyle: CSSProperties = { display: "block", color: "#0f172a", fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const itemTitleCompactStyle: CSSProperties = { display: "block", color: "#0f172a", fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const itemDateStyle: CSSProperties = { display: "block", marginTop: 4, color: "#64748b", fontSize: 12, fontWeight: 700 };
const itemDescStyle: CSSProperties = { display: "block", marginTop: 4, color: "#94a3b8", fontSize: 12, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const badgeStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "5px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };

const calendarActionsStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const iconButtonStyle: CSSProperties = { width: 40, height: 40, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 24, fontWeight: 900, cursor: "pointer" };
const ghostButtonStyle: CSSProperties = { minHeight: 40, padding: "0 14px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontWeight: 900, cursor: "pointer" };

const filtersRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 10, marginBottom: 16 };
const searchInputStyle: CSSProperties = { minHeight: 44, borderRadius: 15, border: "1px solid #cbd5e1", padding: "0 14px", fontWeight: 700, color: "#0f172a" };
const filterSelectStyle: CSSProperties = { minHeight: 44, borderRadius: 15, border: "1px solid #cbd5e1", padding: "0 12px", fontWeight: 800, color: "#0f172a", background: "#fff" };
const segmentedStyle: CSSProperties = { display: "flex", border: "1px solid #e2e8f0", borderRadius: 16, padding: 4, background: "#f8fafc" };
const segmentStyle: CSSProperties = { minHeight: 34, padding: "0 12px", border: "none", borderRadius: 12, background: "transparent", color: "#64748b", fontWeight: 900, cursor: "pointer" };
const segmentActiveStyle: CSSProperties = { ...segmentStyle, background: "#6d28d9", color: "#fff" };

const calendarWrapperStyle: CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 24, overflow: "hidden", background: "#fff" };
const weekHeaderStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" };
const weekDayStyle: CSSProperties = { padding: "12px 8px", textAlign: "center", fontSize: 12, fontWeight: 950, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" };
const calendarGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" };
const dayCellStyle: CSSProperties = { minHeight: 138, borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", padding: 8, background: "#fff", overflow: "hidden" };
const dayTopStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 };
const dayNumberStyle: CSSProperties = { display: "inline-flex", width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 999, color: "#475569", fontSize: 12, fontWeight: 900 };
const todayNumberStyle: CSSProperties = { ...dayNumberStyle, background: "#6d28d9", color: "#fff" };
const dayEventsStyle: CSSProperties = { display: "grid", gap: 5 };
const dayEventStyle: CSSProperties = { width: "100%", borderRadius: 10, padding: "7px 8px", fontSize: 11, fontWeight: 800, cursor: "pointer", overflow: "hidden", textAlign: "left", display: "grid", gap: 2, lineHeight: 1.2 };
const dayEventTitleStyle: CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 900 };
const dayEventTimeStyle: CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700, opacity: 0.86 };
const moreEventsStyle: CSSProperties = { color: "#64748b", fontSize: 11, fontWeight: 900, paddingLeft: 6 };
const listModeStyle: CSSProperties = { display: "grid", gap: 10 };

const timelineButtonStyle: CSSProperties = { display: "grid", gridTemplateColumns: "20px minmax(0, 1fr)", gap: 10, width: "100%", border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" };
const timelineLineColStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 };
const timelineDotStyle: CSSProperties = { width: 11, height: 11, borderRadius: 999, background: "#6d28d9", boxShadow: "0 0 0 4px #ede9fe" };
const timelineLineStyle: CSSProperties = { width: 2, minHeight: 42, flex: 1, background: "#e2e8f0", marginTop: 8 };
const timelineContentStyle: CSSProperties = { padding: 13, borderRadius: 20, border: "1px solid #e2e8f0", background: "#f8fafc", marginBottom: 10, minWidth: 0 };
const timelineDateStyle: CSSProperties = { display: "block", marginBottom: 4, color: "#6d28d9", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em" };

const emptyStateStyle: CSSProperties = { border: "1px dashed #cbd5e1", background: "#f8fafc", borderRadius: 22, padding: 18, display: "grid", gap: 5, textAlign: "center", color: "#64748b", fontSize: 13, fontWeight: 700 };
const simpleRowButtonStyle: CSSProperties = { width: "100%", border: "1px solid #e2e8f0", background: "#fff", borderRadius: 18, padding: 12, textAlign: "left", fontWeight: 850, color: "#334155", cursor: "pointer" };
const errorBoxStyle: CSSProperties = { maxWidth: 1280, margin: "0 auto 18px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#be123c", borderRadius: 20, padding: 16, fontWeight: 800 };

const modalBackdropStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, backdropFilter: "blur(6px)" };
const modalStyle: CSSProperties = { width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto", borderRadius: 30, background: "#fff", boxShadow: "0 30px 90px rgba(15,23,42,0.34)" };
const modalHeaderStyle: CSSProperties = { padding: 24, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" };
const modalTitleStyle: CSSProperties = { margin: "12px 0 4px", fontSize: 26, fontWeight: 950, letterSpacing: "-0.04em" };
const closeButtonStyle: CSSProperties = { width: 42, height: 42, borderRadius: 999, border: "none", background: "#f1f5f9", color: "#334155", fontSize: 24, fontWeight: 900, cursor: "pointer" };
const detailGridStyle: CSSProperties = { padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const detailBoxStyle: CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: 16, minWidth: 0 };
const detailValueStyle: CSSProperties = { display: "block", marginTop: 6, color: "#0f172a", fontSize: 15, fontWeight: 900, overflowWrap: "anywhere" };
const modalFooterStyle: CSSProperties = { borderTop: "1px solid #e2e8f0", padding: 24, display: "flex", flexWrap: "wrap", gap: 10 };

const formGridStyle: CSSProperties = { padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };
const formFieldStyle: CSSProperties = { display: "grid", gap: 7 };
const formLabelStyle: CSSProperties = { color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
const formInputStyle: CSSProperties = { minHeight: 44, borderRadius: 15, border: "1px solid #cbd5e1", padding: "0 13px", color: "#0f172a", fontSize: 14, fontWeight: 650, background: "#fff" };
const formTextareaStyle: CSSProperties = { ...formInputStyle, minHeight: 94, padding: 13, resize: "vertical", fontFamily: "inherit" };
const primaryActionButtonStyle: CSSProperties = { minHeight: 44, padding: "0 18px", borderRadius: 15, border: "none", background: "#6d28d9", color: "#fff", fontWeight: 800, cursor: "pointer" };
const secondaryActionButtonStyle: CSSProperties = { minHeight: 44, padding: "0 18px", borderRadius: 15, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontWeight: 800, cursor: "pointer" };
