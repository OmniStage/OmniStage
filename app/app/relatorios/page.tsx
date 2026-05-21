import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    eventoId?: string;
  };
};

function Card({
  titulo,
  valor,
  detalhe,
  percentual,
}: {
  titulo: string;
  valor: string | number;
  detalhe?: string;
  percentual?: number;
}) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-500">{titulo}</p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900">
            {valor}
          </h2>

          {detalhe && (
            <p className="mt-2 text-sm text-zinc-400">{detalhe}</p>
          )}

          {typeof percentual === "number" && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Performance
                </span>

                <span className="text-xs font-semibold text-zinc-600">
                  {percentual}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all"
                  style={{
                    width: `${Math.min(percentual, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {titulo}
        </h2>

        {descricao && (
          <p className="mt-1 text-sm text-zinc-500">
            {descricao}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const eventosRes = await supabase
    .from("eventos")
    .select("id, nome, data_evento")
    .order("data_evento", { ascending: false });

  const eventos = eventosRes.data ?? [];

  const eventoSelecionado =
    searchParams?.eventoId || eventos?.[0]?.id || "";

  const convidadosRes = eventoSelecionado
    ? await supabase
        .from("convidados")
        .select("*")
        .eq("evento_id", eventoSelecionado)
    : { data: [] };

  const enviosRes = eventoSelecionado
    ? await supabase
        .from("envio_fila")
        .select("*")
        .eq("evento_id", eventoSelecionado)
    : { data: [] };

  const convidados = convidadosRes.data ?? [];
  const envios = enviosRes.data ?? [];

  const totalConvidados = convidados.length;

  const confirmados = convidados.filter(
    (c: any) => c.status_rsvp === "confirmado"
  ).length;

  const pendentes = convidados.filter(
    (c: any) =>
      !c.status_rsvp ||
      c.status_rsvp === "pendente"
  ).length;

  const recusados = convidados.filter(
    (c: any) => c.status_rsvp === "recusado"
  ).length;

  const checkins = convidados.filter(
    (c: any) =>
      c.status_checkin === "entrou" ||
      c.status_checkin === "confirmado" ||
      c.checkin_realizado === true
  ).length;

  const entrouSemRsvp = convidados.filter(
    (c: any) =>
      c.status_checkin === "entrou_sem_rsvp"
  ).length;

  const naoEntraram = Math.max(
    totalConvidados - checkins,
    0
  );

  const errosEnvio = envios.filter(
    (e: any) => e.status === "erro"
  ).length;

  const taxaPresenca = totalConvidados
    ? Math.round(
        (checkins / totalConvidados) * 100
      )
    : 0;

  const taxaRsvp = totalConvidados
    ? Math.round(
        (confirmados / totalConvidados) * 100
      )
    : 0;

  const taxaEnvio = envios.length
    ? Math.round(
        ((envios.length - errosEnvio) /
          envios.length) *
          100
      )
    : 0;

  const ultimosCheckins = convidados
    .filter((c: any) => c.data_checkin)
    .sort(
      (a: any, b: any) =>
        new Date(b.data_checkin).getTime() -
        new Date(a.data_checkin).getTime()
    )
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-900 to-zinc-800 px-8 py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                  OmniStage Analytics
                </span>

                <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
                  Relatório Executivo
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-zinc-300">
                  Resultado completo do evento com indicadores de RSVP,
                  presença, check-in e performance de envios.
                </p>
              </div>

              <form method="get" className="flex gap-3">
                <select
                  name="eventoId"
                  defaultValue={eventoSelecionado}
                  className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none"
                >
                  {eventos.map((evento: any) => (
                    <option
                      key={evento.id}
                      value={evento.id}
                    >
                      {evento.nome}
                    </option>
                  ))}
                </select>

                <button className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200">
                  Atualizar
                </button>
              </form>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <Section
              titulo="Resumo do Evento"
              descricao="Indicadores gerais do evento."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <Card
                  titulo="Total de convidados"
                  valor={totalConvidados}
                />

                <Card
                  titulo="Confirmados RSVP"
                  valor={confirmados}
                  percentual={taxaRsvp}
                />

                <Card
                  titulo="Entradas no evento"
                  valor={checkins}
                  percentual={taxaPresenca}
                />

                <Card
                  titulo="Não compareceram"
                  valor={naoEntraram}
                />
              </div>
            </Section>

            <Section
              titulo="Performance RSVP"
              descricao="Análise de confirmações do evento."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Card
                  titulo="Confirmados"
                  valor={confirmados}
                  percentual={taxaRsvp}
                />

                <Card
                  titulo="Pendentes"
                  valor={pendentes}
                />

                <Card
                  titulo="Recusados"
                  valor={recusados}
                />
              </div>
            </Section>

            <Section
              titulo="Performance Check-in"
              descricao="Indicadores de presença e entrada."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Card
                  titulo="Entraram"
                  valor={checkins}
                  percentual={taxaPresenca}
                />

                <Card
                  titulo="Entrou sem RSVP"
                  valor={entrouSemRsvp}
                />

                <Card
                  titulo="No-show"
                  valor={naoEntraram}
                />
              </div>
            </Section>

            <Section
              titulo="Performance de Envios"
              descricao="Status dos envios realizados."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Card
                  titulo="Envios realizados"
                  valor={envios.length}
                  percentual={taxaEnvio}
                />

                <Card
                  titulo="Erros de envio"
                  valor={errosEnvio}
                />

                <Card
                  titulo="Taxa de sucesso"
                  valor={`${taxaEnvio}%`}
                  percentual={taxaEnvio}
                />
              </div>
            </Section>

            <Section
              titulo="Últimos Check-ins"
              descricao="Últimas entradas registradas no evento."
            >
              <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                        <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Convidado
                        </th>

                        <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Data e horário
                        </th>

                        <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {ultimosCheckins.map(
                        (convidado: any) => (
                          <tr
                            key={convidado.id}
                            className="border-b border-zinc-100 transition hover:bg-zinc-50"
                          >
                            <td className="px-6 py-5">
                              <div>
                                <p className="font-semibold text-zinc-900">
                                  {convidado.nome}
                                </p>

                                <p className="mt-1 text-xs text-zinc-400">
                                  Token:{" "}
                                  {convidado.token || "-"}
                                </p>
                              </div>
                            </td>

                            <td className="px-6 py-5 text-sm text-zinc-600">
                              {new Date(
                                convidado.data_checkin
                              ).toLocaleString(
                                "pt-BR"
                              )}
                            </td>

                            <td className="px-6 py-5">
                              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                {convidado.status_checkin ||
                                  "Entrou"}
                              </span>
                            </td>
                          </tr>
                        )
                      )}

                      {ultimosCheckins.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-6 py-16 text-center text-sm text-zinc-500"
                          >
                            Nenhum check-in encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
