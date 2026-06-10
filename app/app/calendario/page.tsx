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

type VisaoCalendario = "mes" | "lista";

type FiltroStatus = "todos" | "com_data" | "sem_data" | "ativos" | "finalizados";

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

function valorPrimeiro(obj: Record<string, any>, campos: string[]) {
  for (const campo of campos) {
    const valor = obj?.[campo];
    if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
      return valor;
    }
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

function parseDataEvento(evento: EventoBanco) {
  const valor = valorPrimeiro(evento, [
    "data_evento",
    "data",
    "data_inicio",
    "data_hora_inicio",
    "data_hora",
    "inicio",
    "start_date",
    "event_date",
    "created_at",
  ]);

  if (!valor) return null;

  const texto = String(valor);
  const data = new Date(texto);

  if (Number.isNaN(data.getTime())) return null;
  return data;
}

function formatarData(data: Date | null) {
  if (!data) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

function formatarHorario(evento: EventoBanco, data: Date | null) {
  const horario = valorPrimeiro(evento, ["horario", "hora", "hora_evento", "hora_inicio"]);
  if (horario) return String(horario);

  if (!data) return "Horário não definido";

  const horas = data.getHours();
  const minutos = data.getMinutes();

  if (horas === 0 && minutos === 0) return "Horário não definido";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function getLocalEvento(evento: EventoBanco) {
  return (
    valorPrimeiro(evento, [
      "local",
      "local_evento",
      "espaco",
      "endereco",
      "cidade",
      "location",
    ]) || "Local não definido"
  );
}

function getStatusEvento(evento: EventoBanco) {
  return String(
    valorPrimeiro(evento, ["status", "situacao", "status_evento"]) || "ativo"
  );
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
    dias.push({
      data: new Date(cursor),
      dentroDoMes: cursor.getMonth() === mesAtual.getMonth(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  if (fim.getDay() === 6 && dias.length > 35) {
    return dias.slice(0, 35);
  }

  return dias;
}

function classificarStatus(status: string) {
  const normalizado = normalizarTexto(status);

  if (["finalizado", "concluido", "encerrado"].some((item) => normalizado.includes(item))) {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  if (["rascunho", "draft"].some((item) => normalizado.includes(item))) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (["cancelado", "inativo"].some((item) => normalizado.includes(item))) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function CalendarioPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [visao, setVisao] = useState<VisaoCalendario>("mes");
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoCalendario | null>(null);

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
      eventosQuery = await supabase
        .from("eventos")
        .select("*")
        .eq("tenant_id", membro.tenant_id);
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
      const confirmados = convidados.filter((convidado) =>
        normalizarTexto(convidado.status_rsvp).includes("confirm")
      ).length;
      const pendentes = convidados.filter((convidado) => {
        const valor = normalizarTexto(convidado.status_rsvp);
        return !valor || valor.includes("pendente") || valor.includes("aguard");
      }).length;
      const checkins = convidados.filter(
        (convidado) =>
          convidado.checkin_realizado === true ||
          normalizarTexto(convidado.status_checkin).includes("entrou")
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

    setEventos(eventosNormalizados);
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

  const eventosDoMes = useMemo(
    () => eventosFiltrados.filter((evento) => ehMesmoMes(evento.data, mesAtual)),
    [eventosFiltrados, mesAtual]
  );

  const proximosEventos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return eventosFiltrados
      .filter((evento) => evento.data && evento.data >= hoje)
      .sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))
      .slice(0, 6);
  }, [eventosFiltrados]);

  const eventosSemData = useMemo(
    () => eventosFiltrados.filter((evento) => !evento.data),
    [eventosFiltrados]
  );

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

  const diasCalendario = useMemo(() => criarDiasCalendario(mesAtual), [mesAtual]);

  function mudarMes(delta: number) {
    setMesAtual((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
  }

  function irParaHoje() {
    setMesAtual(new Date());
  }

  function eventosDoDia(data: Date) {
    return eventosFiltrados.filter((evento) => {
      if (!evento.data) return false;
      return (
        evento.data.getFullYear() === data.getFullYear() &&
        evento.data.getMonth() === data.getMonth() &&
        evento.data.getDate() === data.getDate()
      );
    });
  }

  function abrirEvento(evento: EventoCalendario) {
    setEventoSelecionado(evento);
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
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-100">
                  OmniStage
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Calendário de eventos
                </h1>
                <p className="mt-3 max-w-3xl text-base text-violet-50 sm:text-lg">
                  Visão consolidada dos eventos, datas, locais, confirmações e check-ins do cliente.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={carregarCalendario}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50"
                >
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={irParaHoje}
                  className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Hoje
                </button>
              </div>
            </div>
          </div>

          {erro && (
            <div className="border-b border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700">
              {erro}
            </div>
          )}

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <ResumoCard titulo="Eventos" valor={totais.eventos} descricao="Eventos filtrados" />
            <ResumoCard titulo="Com data" valor={totais.comData} descricao="Eventos no calendário" />
            <ResumoCard titulo="Convidados" valor={totais.convidados} descricao="Total vinculado" />
            <ResumoCard titulo="Confirmados" valor={totais.confirmados} descricao="RSVP confirmado" />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => mudarMes(-1)}
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 text-xl font-black hover:bg-slate-50"
                    aria-label="Mês anterior"
                  >
                    ‹
                  </button>
                  <div>
                    <h2 className="text-2xl font-black">
                      {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                    </h2>
                    <p className="text-sm font-semibold text-slate-500">
                      {eventosDoMes.length} evento(s) neste mês
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => mudarMes(1)}
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 text-xl font-black hover:bg-slate-50"
                    aria-label="Próximo mês"
                  >
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
                    <button
                      type="button"
                      onClick={() => setVisao("mes")}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                        visao === "mes" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      Mês
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisao("lista")}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                        visao === "lista" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"
                      }`}
                    >
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
                    const eventosDia = eventosDoDia(dia.data);
                    const hoje = new Date();
                    const isHoje =
                      dia.data.getFullYear() === hoje.getFullYear() &&
                      dia.data.getMonth() === hoje.getMonth() &&
                      dia.data.getDate() === hoje.getDate();

                    return (
                      <div
                        key={dia.data.toISOString()}
                        className={`min-h-32 border-b border-r border-slate-100 p-2 ${
                          dia.dentroDoMes ? "bg-white" : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                              isHoje ? "bg-violet-700 text-white" : "text-slate-600"
                            }`}
                          >
                            {dia.data.getDate()}
                          </span>
                          {eventosDia.length > 0 && (
                            <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">
                              {eventosDia.length}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {eventosDia.slice(0, 3).map((evento) => (
                            <button
                              key={evento.id}
                              type="button"
                              onClick={() => abrirEvento(evento)}
                              className="block w-full rounded-xl border border-violet-100 bg-violet-50 px-2 py-2 text-left text-xs font-bold text-violet-900 transition hover:border-violet-300 hover:bg-violet-100"
                            >
                              <span className="block truncate">{evento.nome}</span>
                              <span className="mt-1 block truncate text-[10px] font-semibold text-violet-600">
                                {evento.horarioTexto}
                              </span>
                            </button>
                          ))}

                          {eventosDia.length > 3 && (
                            <button
                              type="button"
                              onClick={() => abrirEvento(eventosDia[3])}
                              className="text-xs font-black text-violet-700"
                            >
                              +{eventosDia.length - 3} evento(s)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  {eventosFiltrados.length === 0 ? (
                    <EmptyState titulo="Nenhum evento encontrado" descricao="Ajuste os filtros ou cadastre um novo evento." />
                  ) : (
                    eventosFiltrados
                      .slice()
                      .sort((a, b) => (a.data?.getTime() || 9999999999999) - (b.data?.getTime() || 9999999999999))
                      .map((evento) => (
                        <EventoLinha key={evento.id} evento={evento} onClick={() => abrirEvento(evento)} />
                      ))
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black">Próximos eventos</h3>
              <div className="mt-4 space-y-3">
                {proximosEventos.length === 0 ? (
                  <EmptyState titulo="Sem próximos eventos" descricao="Nenhum evento futuro com data definida." compacto />
                ) : (
                  proximosEventos.map((evento) => (
                    <EventoLinha key={evento.id} evento={evento} onClick={() => abrirEvento(evento)} compacto />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black">Eventos sem data</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Eventos que precisam de data para aparecer no calendário.
              </p>
              <div className="mt-4 space-y-3">
                {eventosSemData.length === 0 ? (
                  <EmptyState titulo="Tudo certo" descricao="Todos os eventos filtrados possuem data." compacto />
                ) : (
                  eventosSemData.slice(0, 6).map((evento) => (
                    <EventoLinha key={evento.id} evento={evento} onClick={() => abrirEvento(evento)} compacto />
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${classificarStatus(eventoSelecionado.statusTexto)}`}>
                    {eventoSelecionado.statusTexto}
                  </span>
                  <h2 className="mt-3 text-2xl font-black">{eventoSelecionado.nome}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">ID: {eventoSelecionado.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEventoSelecionado(null)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-600 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Detalhe titulo="Data" valor={eventoSelecionado.dataTexto} />
              <Detalhe titulo="Horário" valor={eventoSelecionado.horarioTexto} />
              <Detalhe titulo="Local" valor={eventoSelecionado.localTexto} />
              <Detalhe titulo="Tenant" valor={eventoSelecionado.tenantId || tenantId || "Não identificado"} />
              <Detalhe titulo="Convidados" valor={eventoSelecionado.convidadosTotal} />
              <Detalhe titulo="Confirmados" valor={eventoSelecionado.confirmados} />
              <Detalhe titulo="Pendentes" valor={eventoSelecionado.pendentes} />
              <Detalhe titulo="Check-ins" valor={eventoSelecionado.checkins} />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 p-6">
              <a
                href={`/app/eventos?evento=${eventoSelecionado.id}`}
                className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white hover:bg-violet-800"
              >
                Abrir evento
              </a>
              <a
                href={`/app/envios?evento=${eventoSelecionado.id}`}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Ir para envios
              </a>
              <a
                href={`/app/convidados?evento=${eventoSelecionado.id}`}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Ver convidados
              </a>
            </div>
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

function EventoLinha({
  evento,
  onClick,
  compacto = false,
}: {
  evento: EventoCalendario;
  onClick: () => void;
  compacto?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-200 hover:bg-violet-50/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className={`truncate font-black text-slate-950 ${compacto ? "text-sm" : "text-base"}`}>{evento.nome}</h4>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500">
            {evento.dataTexto} • {evento.horarioTexto}
          </p>
          {!compacto && <p className="mt-1 truncate text-sm font-semibold text-slate-500">{evento.localTexto}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${classificarStatus(evento.statusTexto)}`}>
          {evento.statusTexto}
        </span>
      </div>

      {!compacto && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniMetrica titulo="Convidados" valor={evento.convidadosTotal} />
          <MiniMetrica titulo="Confirmados" valor={evento.confirmados} />
          <MiniMetrica titulo="Check-ins" valor={evento.checkins} />
        </div>
      )}
    </button>
  );
}

function MiniMetrica({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-base font-black text-slate-900">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
    </div>
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

