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
}: {
  titulo: string;
  valor: string | number;
  detalhe?: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{titulo}</p>
      <h2 className="mt-2 text-3xl font-bold text-zinc-900">{valor}</h2>
      {detalhe && <p className="mt-2 text-xs text-zinc-400">{detalhe}</p>}
    </div>
  );
}

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const supabase = createClient();

  const { data: eventos = [] } = await supabase
    .from("eventos")
    .select("id, nome, data_evento")
    .order("data_evento", { ascending: false });

  const eventoSelecionado =
    searchParams?.eventoId || eventos?.[0]?.id || "";

  const { data: convidados = [] } = eventoSelecionado
    ? await supabase
        .from("convidados")
        .select("*")
        .eq("evento_id", eventoSelecionado)
    : { data: [] };

  const { data: envios = [] } = eventoSelecionado
    ? await supabase
        .from("envio_fila")
        .select("*")
        .eq("evento_id", eventoSelecionado)
    : { data: [] };

  const totalConvidados = convidados.length;

  const confirmados = convidados.filter(
    (c: any) => c.status_rsvp === "confirmado"
  ).length;

  const pendentes = convidados.filter(
    (c: any) => !c.status_rsvp || c.status_rsvp === "pendente"
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
    (c: any) => c.status_checkin === "entrou_sem_rsvp"
  ).length;

  const naoEntraram = Math.max(totalConvidados - checkins, 0);

  const taxaPresenca = totalConvidados
    ? Math.round((checkins / totalConvidados) * 100)
    : 0;

  const errosEnvio = envios.filter((e: any) => e.status === "erro").length;

  const ultimosCheckins = convidados
    .filter((c: any) => c.data_checkin)
    .sort(
      (a: any, b: any) =>
        new Date(b.data_checkin).getTime() -
        new Date(a.data_checkin).getTime()
    )
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Relatório do Evento
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Resultado geral de RSVP, check-in e envios.
            </p>
          </div>

          <form method="get" className="flex gap-2">
            <select
              name="eventoId"
              defaultValue={eventoSelecionado}
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm"
            >
              {eventos?.map((evento: any) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nome}
                </option>
              ))}
            </select>

            <button className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white">
              Ver
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card titulo="Total de convidados" valor={totalConvidados} />
          <Card titulo="Confirmados RSVP" valor={confirmados} />
          <Card titulo="Pendentes RSVP" valor={pendentes} />
          <Card titulo="Recusados" valor={recusados} />
          <Card titulo="Entraram no evento" valor={checkins} />
          <Card titulo="Não entraram" valor={naoEntraram} />
          <Card titulo="Entrou sem RSVP" valor={entrouSemRsvp} />
          <Card titulo="Taxa de presença" valor={`${taxaPresenca}%`} />
          <Card titulo="Envios registrados" valor={envios.length} />
          <Card titulo="Erros de envio" valor={errosEnvio} />
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
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-zinc-500">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-zinc-500">
                    Horário
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-zinc-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {ultimosCheckins.map((convidado: any) => (
                  <tr key={convidado.id} className="border-b border-zinc-50">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                      {convidado.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {new Date(convidado.data_checkin).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {convidado.status_checkin || "Entrou"}
                      </span>
                    </td>
                  </tr>
                ))}

                {ultimosCheckins.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-sm text-zinc-500"
                    >
                      Nenhum check-in encontrado.
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
