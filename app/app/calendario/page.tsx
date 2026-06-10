"use client";

import { useEffect, useMemo, useState } from "react";
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
  dataTexto: string;
  horarioTexto: string;
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
  criado_em?: string | null;
  atualizado_em?: string | null;
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
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return null;
  return data;
}

function parseDataEvento(evento: EventoBanco) {
  return parseDateSafe(
    valorPrimeiro(evento, [
      "data_evento",
      "data",
      "data_inicio",
      "data_hora_inicio",
      "data_hora",
      "inicio",
      "start_date",
      "event_date",
      "created_at",
    ])
  );
}

function formatarData(data: Date | null) {
  if (!data) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

function formatarHorario(evento: EventoBanco, data: Date | null) {
  const horario = valorPrimeiro(evento, ["horario", "hora", "hora_evento", "hora_inicio"]);
  if (horario) return String(horario);
  if (!data) return "Horário não definido";
  const horas = data.getHours();
  const minutos = data.getMinutes();
  if (horas === 0 && minutos === 0) return "Horário não definido";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data);
}

function formatarDataHora(data: Date | null) {
  if (!data) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function getLocalEvento(evento: EventoBanco) {
  return (
    valorPrimeiro(evento, ["local", "local_evento", "espaco", "endereco", "cidade", "location"]) ||
    "Local não definido"
  );
}

function getStatusEvento(evento: EventoBanco) {
  return String(valorPrimeiro(evento, ["status", "situacao", "status_evento"]) || "ativo");
}

function ehMesmoMes(data: Date | null, mesAtual: Date) {
  if (!data) return false;
  return data.getFullYear() === mesAtual.getFullYear() && data.getMonth() === mesAtual.getMonth();
}

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function fimDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0);
}

function criarDiasCalendario(mesAtual: Date) {
  const inicio = inicioDoMes(mesAtual);
  const fim = fimDoMes(mesAtual);
  const dias: Array<{ data: Date; dentroDoMes: boolean }> = [];
  const primeiroDiaSemana = inicio.getDay();
  const cursor = new Date(inicio);
  cursor.setDate(cursor.getDate() - primeiroDiaSemana);

  while (dias.length < 42) {
    dias.push({ data: new Date(cursor), dentroDoMes: cursor.getMonth() === mesAtual.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }

  if (fim.getDay() === 6 && dias.length > 35) return dias.slice(0, 35);
  return dias;
}

function classificarStatus(status: string) {
  const normalizado = normalizarTexto(status);
  if (["finalizado", "concluido", "encerrado", "concluido"].some((item) => normalizado.includes(item))) {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  if (["rascunho", "draft", "pendente"].some((item) => normalizado.includes(item))) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (["cancelado", "inativo", "erro"].some((item) => normalizado.includes(item))) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function classificarCategoria(categoria: string) {
  const valor = normalizarTexto(categoria);
  if (valor.includes("campanha")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (valor.includes("operacional") || valor.includes("tarefa")) return "bg-sky-50 text-sky-700 border-sky-200";
  if (valor.includes("fornecedor") || valor.includes("cerimonial")) return "bg-orange-50 text-orange-700 border-orange-200";
  if (valor.includes("rsvp")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (valor.includes("check")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (valor.includes("pos")) return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
  return "bg-violet-50 text-violet-700 border-violet-200";
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

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

    let eventosQuery = await supabase
      .from("eventos")
      .select("*")
      .eq("tenant_id", membro.tenant_id)
      .order("created_at", { ascending: false });

    if (eventosQuery.error) {
      eventosQuery = await supabase.from("eventos").select("*").eq("tenant_id", membro.tenant_id);
    }

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
      const data = parseDataEvento(evento);
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
        dataTexto: formatarData(data),
        horarioTexto: formatarHorario(evento, data),
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
      const { data: agendaData, error: agendaError } = await supabase
        .from("event_agenda_items")
        .select("*")
        .eq("tenant_id", membro.tenant_id)
        .in("evento_id", idsEventos)
        .order("data_inicio", { ascending: true });

      if (!agendaError) {
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
      }

      const { data: campanhasData, error: campanhasError } = await supabase
        .from("envio_campanhas")
        .select("id, tenant_id, evento_id, tipo_envio, nome, mensagem, midia_url, ativo, criado_em, atualizado_em")
        .eq("tenant_id", membro.tenant_id)
        .in("evento_id", idsEventos)
        .order("criado_em", { ascending: true });

      if (!campanhasError) {
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
      dataFim: null,
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

  const eventosDoMes = useMemo(() => eventosFiltrados.filter((evento) => ehMesmoMes(evento.data, mesAtual)), [eventosFiltrados, mesAtual]);

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

    const eventoPrincipal: ItemCalendario[] = eventoSelecionado.data
      ? [
          {
            id: `evento-${eventoSelecionado.id}`,
            eventoId: eventoSelecionado.id,
            titulo: "Dia do evento",
            descricao: `${eventoSelecionado.nome} • ${eventoSelecionado.localTexto}`,
            categoria: "evento",
            dataInicio: eventoSelecionado.data,
            dataFim: null,
            status: eventoSelecionado.statusTexto,
            responsavel: "",
            origem: "eventos",
          },
        ]
      : [];

    return [...campanhasSelecionado, ...itensAgendaSelecionado, ...eventoPrincipal]
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

  const diasRestantes = calcularDiasRestantes(eventoSelecionado);
  const taxaRsvp = eventoSelecionado?.convidadosTotal ? Math.round((eventoSelecionado.confirmados / eventoSelecionado.convidadosTotal) * 100) : 0;
  const diasCalendario = useMemo(() => criarDiasCalendario(mesAtual), [mesAtual]);

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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="h-8 w-56 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6 lg:p-8" data-module-key={MODULE_KEY}>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-100">OmniStage • módulo {MODULE_KEY}</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Calendário e agenda do evento</h1>
                <p className="mt-3 max-w-3xl text-base text-violet-50 sm:text-lg">
                  Centro de planejamento com visão geral, calendário mensal, linha do tempo e agenda operacional.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={carregarCalendario} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50">
                  Atualizar
                </button>
                <button type="button" onClick={irParaHoje} className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  Hoje
                </button>
              </div>
            </div>
          </div>

          {erro && <div className="border-b border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700">{erro}</div>}

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <ResumoCard titulo="Eventos" valor={totais.eventos} descricao="Eventos filtrados" />
            <ResumoCard titulo="Convidados" valor={totais.convidados} descricao="Total vinculado" />
            <ResumoCard titulo="Confirmados" valor={totais.confirmados} descricao="RSVP confirmado" />
            <ResumoCard titulo="Check-ins" valor={totais.checkins} descricao="Entradas realizadas" />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-violet-700">Visão geral</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{eventoSelecionado?.nome || "Selecione um evento"}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {eventoSelecionado ? `${eventoSelecionado.dataTexto} • ${eventoSelecionado.horarioTexto} • ${eventoSelecionado.localTexto}` : "Nenhum evento encontrado."}
                </p>
              </div>

              <select
                value={eventoSelecionadoId}
                onChange={(event) => setEventoSelecionadoId(event.target.value)}
                className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                {eventos.map((evento) => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MiniResumo titulo="Dias restantes" valor={diasRestantes === null ? "--" : diasRestantes < 0 ? `D+${Math.abs(diasRestantes)}` : `D-${diasRestantes}`} />
              <MiniResumo titulo="RSVP" valor={`${taxaRsvp}%`} />
              <MiniResumo titulo="Campanhas" valor={campanhasSelecionado.length} />
              <MiniResumo titulo="Agenda" valor={itensAgendaSelecionado.length} />
            </div>

            {eventoSelecionado && (
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`/app/eventos?evento=${eventoSelecionado.id}`} className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white hover:bg-violet-800">
                  Ver evento
                </a>
                <a href={`/app/convidados?evento=${eventoSelecionado.id}`} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Convidados
                </a>
                <a href={`/app/envios?evento=${eventoSelecionado.id}`} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Envios
                </a>
                <a href={`/app/rsvp?evento=${eventoSelecionado.id}`} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  RSVP
                </a>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black">Próximos compromissos</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Eventos, campanhas e tarefas com data definida.</p>
            <div className="mt-4 space-y-3">
              {proximosItens.length === 0 ? (
                <EmptyState titulo="Sem próximos itens" descricao="Cadastre itens na agenda operacional ou campanhas." compacto />
              ) : (
                proximosItens.map((item) => <ItemLinha key={`${item.origem}-${item.id}`} item={item} onClick={() => setDetalheAberto(item)} compacto />)
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => mudarMes(-1)} className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 text-xl font-black hover:bg-slate-50" aria-label="Mês anterior">
                    ‹
                  </button>
                  <div>
                    <h2 className="text-2xl font-black">
                      {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                    </h2>
                    <p className="text-sm font-semibold text-slate-500">
                      {eventosDoMes.length} evento(s) • {itensCalendario.filter((item) => ehMesmoMes(item.dataInicio, mesAtual)).length} item(ns) de agenda
                    </p>
                  </div>
                  <button type="button" onClick={() => mudarMes(1)} className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 text-xl font-black hover:bg-slate-50" aria-label="Próximo mês">
                    ›
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar evento, local ou status"
                    className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as FiltroStatus)}
                    className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="todos">Todos</option>
                    <option value="com_data">Com data</option>
                    <option value="sem_data">Sem data</option>
                    <option value="ativos">Ativos</option>
                    <option value="finalizados">Finalizados</option>
                  </select>
                  <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => setVisao("mes")} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${visao === "mes" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
                      Mês
                    </button>
                    <button type="button" onClick={() => setVisao("lista")} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${visao === "lista" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
                      Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {visao === "mes" ? (
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia} className="p-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">
                      {dia}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {diasCalendario.map((dia) => {
                    const itensDia = itensDoDia(dia.data);
                    const hoje = new Date();
                    const isHoje = mesmoDia(dia.data, hoje);

                    return (
                      <div key={dia.data.toISOString()} className={`min-h-36 border-b border-r border-slate-100 p-2 ${dia.dentroDoMes ? "bg-white" : "bg-slate-50 text-slate-400"}`}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${isHoje ? "bg-violet-700 text-white" : "text-slate-600"}`}>{dia.data.getDate()}</span>
                          {itensDia.length > 0 && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">{itensDia.length}</span>}
                        </div>

                        <div className="space-y-1.5">
                          {itensDia.slice(0, 4).map((item) => (
                            <button
                              key={`${item.origem}-${item.id}`}
                              type="button"
                              onClick={() => setDetalheAberto(item)}
                              className={`block w-full rounded-xl border px-2 py-2 text-left text-xs font-bold transition hover:opacity-90 ${classificarCategoria(item.categoria)}`}
                            >
                              <span className="block truncate">{item.titulo}</span>
                              <span className="mt-1 block truncate text-[10px] font-semibold opacity-80">{CATEGORIA_LABEL[item.categoria] || item.categoria}</span>
                            </button>
                          ))}

                          {itensDia.length > 4 && <span className="block text-xs font-black text-violet-700">+{itensDia.length - 4} item(ns)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  {itensCalendario.length === 0 ? (
                    <EmptyState titulo="Nenhum item encontrado" descricao="Ajuste os filtros ou cadastre uma agenda para o evento." />
                  ) : (
                    itensCalendario
                      .slice()
                      .sort((a, b) => (a.dataInicio?.getTime() || 9999999999999) - (b.dataInicio?.getTime() || 9999999999999))
                      .map((item) => <ItemLinha key={`${item.origem}-${item.id}`} item={item} onClick={() => setDetalheAberto(item)} />)
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Linha do tempo</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Campanhas, etapas e dia do evento.</p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{timelineSelecionada.length}</span>
              </div>
              <div className="mt-5 space-y-4">
                {timelineSelecionada.length === 0 ? (
                  <EmptyState titulo="Sem timeline" descricao="Inclua campanhas ou itens de agenda com data." compacto />
                ) : (
                  timelineSelecionada.map((item, index) => <TimelineItem key={`${item.origem}-${item.id}`} item={item} isLast={index === timelineSelecionada.length - 1} onClick={() => setDetalheAberto(item)} />)
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Agenda operacional</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Montagem, fornecedores, cerimonial e check-in.</p>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{agendaOperacional.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {agendaOperacional.length === 0 ? (
                  <EmptyState titulo="Sem agenda operacional" descricao="Cadastre os horários de produção do evento." compacto />
                ) : (
                  agendaOperacional.map((item) => <ItemLinha key={`${item.origem}-${item.id}`} item={item} onClick={() => setDetalheAberto(item)} compacto />)
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black">Eventos sem data</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Eventos que precisam de data para aparecer no calendário.</p>
              <div className="mt-4 space-y-3">
                {eventosSemData.length === 0 ? (
                  <EmptyState titulo="Tudo certo" descricao="Todos os eventos filtrados possuem data." compacto />
                ) : (
                  eventosSemData.slice(0, 6).map((evento) => (
                    <button key={evento.id} type="button" onClick={() => setEventoSelecionadoId(evento.id)} className="w-full rounded-2xl border border-slate-200 p-3 text-left text-sm font-bold hover:bg-slate-50">
                      {evento.nome}
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {detalheAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${"categoria" in detalheAberto ? classificarCategoria(detalheAberto.categoria) : classificarStatus(detalheAberto.statusTexto)}`}>
                    {"categoria" in detalheAberto ? CATEGORIA_LABEL[detalheAberto.categoria] || detalheAberto.categoria : detalheAberto.statusTexto}
                  </span>
                  <h2 className="mt-3 text-2xl font-black">{"titulo" in detalheAberto ? detalheAberto.titulo : detalheAberto.nome}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {"dataInicio" in detalheAberto ? formatarDataHora(detalheAberto.dataInicio) : `${detalheAberto.dataTexto} • ${detalheAberto.horarioTexto}`}
                  </p>
                </div>
                <button type="button" onClick={() => setDetalheAberto(null)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-600 hover:bg-slate-200">
                  ×
                </button>
              </div>
            </div>

            {"categoria" in detalheAberto ? (
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <Detalhe titulo="Categoria" valor={CATEGORIA_LABEL[detalheAberto.categoria] || detalheAberto.categoria} />
                <Detalhe titulo="Status" valor={detalheAberto.status} />
                <Detalhe titulo="Início" valor={formatarDataHora(detalheAberto.dataInicio)} />
                <Detalhe titulo="Fim" valor={formatarDataHora(detalheAberto.dataFim)} />
                <Detalhe titulo="Responsável" valor={detalheAberto.responsavel || "Não definido"} />
                <Detalhe titulo="Origem" valor={detalheAberto.origem} />
                <div className="sm:col-span-2">
                  <Detalhe titulo="Descrição" valor={detalheAberto.descricao || "Sem descrição"} />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <Detalhe titulo="Data" valor={detalheAberto.dataTexto} />
                <Detalhe titulo="Horário" valor={detalheAberto.horarioTexto} />
                <Detalhe titulo="Local" valor={detalheAberto.localTexto} />
                <Detalhe titulo="Tenant" valor={detalheAberto.tenantId || tenantId || "Não identificado"} />
                <Detalhe titulo="Convidados" valor={detalheAberto.convidadosTotal} />
                <Detalhe titulo="Confirmados" valor={detalheAberto.confirmados} />
                <Detalhe titulo="Pendentes" valor={detalheAberto.pendentes} />
                <Detalhe titulo="Check-ins" valor={detalheAberto.checkins} />
              </div>
            )}

            {eventoSelecionado && (
              <div className="flex flex-wrap gap-3 border-t border-slate-200 p-6">
                <a href={`/app/eventos?evento=${eventoSelecionado.id}`} className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white hover:bg-violet-800">
                  Abrir evento
                </a>
                <a href={`/app/envios?evento=${eventoSelecionado.id}`} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Ir para envios
                </a>
                <a href={`/app/convidados?evento=${eventoSelecionado.id}`} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Ver convidados
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ResumoCard({ titulo, valor, descricao }: { titulo: string; valor: number; descricao: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-bold text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{valor.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{descricao}</p>
    </div>
  );
}

function MiniResumo({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{valor}</p>
    </div>
  );
}

function ItemLinha({ item, onClick, compacto = false }: { item: ItemCalendario; onClick: () => void; compacto?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-200 hover:bg-violet-50/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className={`truncate font-black text-slate-950 ${compacto ? "text-sm" : "text-base"}`}>{item.titulo}</h4>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500">{formatarDataHora(item.dataInicio)}</p>
          {!compacto && <p className="mt-1 truncate text-sm font-semibold text-slate-500">{item.descricao}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${classificarCategoria(item.categoria)}`}>{CATEGORIA_LABEL[item.categoria] || item.categoria}</span>
      </div>
    </button>
  );
}

function TimelineItem({ item, isLast, onClick }: { item: ItemCalendario; isLast: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="relative block w-full text-left">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <span className="mt-1 h-3 w-3 rounded-full bg-violet-700" />
          {!isLast && <span className="mt-2 h-full min-h-10 w-px bg-slate-200" />}
        </div>
        <div className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{formatarData(item.dataInicio)}</p>
          <h4 className="mt-1 truncate text-sm font-black text-slate-950">{item.titulo}</h4>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.descricao || CATEGORIA_LABEL[item.categoria]}</p>
        </div>
      </div>
    </button>
  );
}

function Detalhe({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-2 break-words text-base font-black text-slate-950">{valor}</p>
    </div>
  );
}

function EmptyState({ titulo, descricao, compacto = false }: { titulo: string; descricao: string; compacto?: boolean }) {
  return (
    <div className={`rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center ${compacto ? "p-4" : "p-8"}`}>
      <p className="font-black text-slate-700">{titulo}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{descricao}</p>
    </div>
  );
}

