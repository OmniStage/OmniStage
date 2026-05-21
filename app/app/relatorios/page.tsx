"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  CheckCircle2,
  Clock3,
  Ticket,
  Gift,
  AlertCircle,
  BarChart3,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Evento = {
  id: string;
  nome: string;
};

type Resumo = {
  totalConvidados: number;
  confirmados: number;
  pendentes: number;
  recusados: number;
  checkins: number;
  naoEntraram: number;
  entrouSemRsvp: number;
  envios: number;
  errosEnvio: number;
  presentes: number;
  valorPresentes: number;
};

function CardResumo({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">{title}</p>

          <h2 className="mt-2 text-3xl font-bold text-zinc-900">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-xs text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState("");

  const [ultimosCheckins, setUltimosCheckins] = useState<any[]>([]);

  const [resumo, setResumo] = useState<Resumo>({
    totalConvidados: 0,
    confirmados: 0,
    pendentes: 0,
    recusados: 0,
    checkins: 0,
    naoEntraram: 0,
    entrouSemRsvp: 0,
    envios: 0,
    errosEnvio: 0,
    presentes: 0,
    valorPresentes: 0,
  });

  useEffect(() => {
    carregarEventos();
  }, []);

  useEffect(() => {
    if (eventoSelecionado) {
      carregarRelatorio();
    }
  }, [eventoSelecionado]);

  async function carregarEventos() {
    const { data } = await supabase
      .from("eventos")
      .select("id, nome")
      .order("data_evento", { ascending: false });

    if (data) {
      setEventos(data);

      if (data.length > 0) {
        setEventoSelecionado(data[0].id);
      }
    }
  }

  async function carregarRelatorio() {
    setLoading(true);

    try {
      const [
        convidadosRes,
        enviosRes,
        presentesRes,
      ] = await Promise.all([
        supabase
          .from("convidados")
          .select("*")
          .eq("evento_id", eventoSelecionado),

        supabase
          .from("envio_fila")
          .select("*")
          .eq("evento_id", eventoSelecionado),

        supabase
          .from("gift_payments")
          .select("*")
          .eq("evento_id", eventoSelecionado),
      ]);

      const convidados = convidadosRes.data || [];
      const envios = enviosRes.data || [];
      const presentes = presentesRes.data || [];

      const confirmados = convidados.filter(
        (c) => c.status_rsvp === "confirmado"
      ).length;

      const pendentes = convidados.filter(
        (c) =>
          !c.status_rsvp ||
          c.status_rsvp === "pendente"
      ).length;

      const recusados = convidados.filter(
        (c) => c.status_rsvp === "recusado"
      ).length;

      const checkins = convidados.filter(
        (c) =>
          c.status_checkin === "entrou" ||
          c.status_checkin === "confirmado"
      ).length;

      const entrouSemRsvp = convidados.filter(
        (c) =>
          c.status_checkin === "entrou_sem_rsvp"
      ).length;

      const naoEntraram =
        convidados.length - checkins;

      const errosEnvio = envios.filter(
        (e) => e.status === "erro"
      ).length;

      const valorPresentes = presentes.reduce(
        (acc, item) =>
          acc + Number(item.valor || 0),
        0
      );

      const ultimos = convidados
        .filter((c) => c.data_checkin)
        .sort(
          (a, b) =>
            new Date(b.data_checkin).getTime() -
            new Date(a.data_checkin).getTime()
        )
        .slice(0, 10);

      setUltimosCheckins(ultimos);

      setResumo({
        totalConvidados: convidados.length,
        confirmados,
        pendentes,
        recusados,
        checkins,
        naoEntraram,
        entrouSemRsvp,
        envios: envios.length,
        errosEnvio,
        presentes: presentes.length,
        valorPresentes,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const taxaPresenca = useMemo(() => {
    if (!resumo.totalConvidados) return 0;

    return Math.round(
      (resumo.checkins /
        resumo.totalConvidados) *
        100
    );
  }, [resumo]);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Relatório do Evento
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Resultado completo do evento
            </p>
          </div>

          <select
            value={eventoSelecionado}
            onChange={(e) =>
              setEventoSelecionado(
                e.target.value
              )
            }
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500"
          >
            {eventos.map((evento) => (
              <option
                key={evento.id}
                value={evento.id}
              >
                {evento.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CardResumo
            title="Total de convidados"
            value={resumo.totalConvidados}
            icon={<Users size={22} />}
          />

          <CardResumo
            title="Confirmados RSVP"
            value={resumo.confirmados}
            icon={<UserCheck size={22} />}
          />

          <CardResumo
            title="Entradas no evento"
            value={resumo.checkins}
            icon={<CheckCircle2 size={22} />}
          />

          <CardResumo
            title="Taxa de presença"
            value={`${taxaPresenca}%`}
            icon={<BarChart3 size={22} />}
          />

          <CardResumo
            title="Pendentes RSVP"
            value={resumo.pendentes}
            icon={<Clock3 size={22} />}
          />

          <CardResumo
            title="Não entraram"
            value={resumo.naoEntraram}
            icon={<UserX size={22} />}
          />

          <CardResumo
            title="Entrou sem RSVP"
            value={resumo.entrouSemRsvp}
            icon={<AlertCircle size={22} />}
          />

          <CardResumo
            title="Envios realizados"
            value={resumo.envios}
            icon={<Ticket size={22} />}
          />

          <CardResumo
            title="Erros de envio"
            value={resumo.errosEnvio}
            icon={<AlertCircle size={22} />}
          />

          <CardResumo
            title="Presentes recebidos"
            value={resumo.presentes}
            icon={<Gift size={22} />}
          />

          <CardResumo
            title="Valor presentes"
            value={`R$ ${resumo.valorPresentes.toLocaleString(
              "pt-BR",
              {
                minimumFractionDigits: 2,
              }
            )}`}
            icon={<Gift size={22} />}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-zinc-900">
              Últimos check-ins
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Nome
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Horário
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {ultimosCheckins.map(
                  (convidado) => (
                    <tr
                      key={convidado.id}
                      className="border-b border-zinc-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                        {convidado.nome}
                      </td>

                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {new Date(
                          convidado.data_checkin
                        ).toLocaleString(
                          "pt-BR"
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {convidado.status_checkin ||
                            "Entrou"}
                        </span>
                      </td>
                    </tr>
                  )
                )}

                {!loading &&
                  ultimosCheckins.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhum check-in
                        encontrado
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
