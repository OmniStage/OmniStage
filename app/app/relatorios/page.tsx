import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    eventoId?: string;
  };
};

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

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
    <div className="report-card">
      <p className="report-card-label">{titulo}</p>
      <strong className="report-card-value">{valor}</strong>

      {detalhe && <p className="report-card-detail">{detalhe}</p>}

      {typeof percentual === "number" && (
        <div className="report-progress-wrap">
          <div className="report-progress-head">
            <span>Performance</span>
            <b>{formatPercent(percentual)}</b>
          </div>

          <div className="report-progress">
            <span style={{ width: formatPercent(percentual) }} />
          </div>
        </div>
      )}
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
    <section className="report-section">
      <div className="report-section-head">
        <h2>{titulo}</h2>
        {descricao && <p>{descricao}</p>}
      </div>

      {children}
    </section>
  );
}

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const eventosRes = await supabase
    .from("eventos")
    .select("id, nome, data_evento")
    .order("data_evento", { ascending: false });

  const eventos = eventosRes.data ?? [];

  const eventoSelecionado = searchParams?.eventoId || eventos?.[0]?.id || "";

  const convidadosRes = eventoSelecionado
    ? await supabase.from("convidados").select("*").eq("evento_id", eventoSelecionado)
    : { data: [] };

  const enviosRes = eventoSelecionado
    ? await supabase.from("envio_fila").select("*").eq("evento_id", eventoSelecionado)
    : { data: [] };

  const convidados = convidadosRes.data ?? [];
  const envios = enviosRes.data ?? [];

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

  const errosEnvio = envios.filter((e: any) => e.status === "erro").length;

  const taxaPresenca = totalConvidados
    ? Math.round((checkins / totalConvidados) * 100)
    : 0;

  const taxaRsvp = totalConvidados
    ? Math.round((confirmados / totalConvidados) * 100)
    : 0;

  const taxaEnvio = envios.length
    ? Math.round(((envios.length - errosEnvio) / envios.length) * 100)
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
    <div className="report-page">
      <div className="report-shell">
        <div className="report-panel">
          <div className="report-hero">
            <div>
              <span className="report-kicker">OmniStage Analytics</span>

              <h1>Relatório Executivo</h1>

              <p>
                Resultado completo do evento com indicadores de RSVP, presença,
                check-in e performance de envios.
              </p>
            </div>

            <form method="get" className="report-filter">
              <select name="eventoId" defaultValue={eventoSelecionado}>
                {eventos.map((evento: any) => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nome}
                  </option>
                ))}
              </select>

              <button>Atualizar</button>
            </form>
          </div>

          <div className="report-content">
            <Section titulo="Resumo do Evento" descricao="Indicadores gerais do evento.">
              <div className="report-grid report-grid-4">
                <Card titulo="Total de convidados" valor={totalConvidados} />
                <Card titulo="Confirmados RSVP" valor={confirmados} percentual={taxaRsvp} />
                <Card titulo="Entradas no evento" valor={checkins} percentual={taxaPresenca} />
                <Card titulo="Não compareceram" valor={naoEntraram} />
              </div>
            </Section>

            <Section titulo="Performance RSVP" descricao="Análise de confirmações do evento.">
              <div className="report-grid report-grid-3">
                <Card titulo="Confirmados" valor={confirmados} percentual={taxaRsvp} />
                <Card titulo="Pendentes" valor={pendentes} />
                <Card titulo="Recusados" valor={recusados} />
              </div>
            </Section>

            <Section titulo="Performance Check-in" descricao="Indicadores de presença e entrada.">
              <div className="report-grid report-grid-3">
                <Card titulo="Entraram" valor={checkins} percentual={taxaPresenca} />
                <Card titulo="Entrou sem RSVP" valor={entrouSemRsvp} />
                <Card titulo="No-show" valor={naoEntraram} />
              </div>
            </Section>

            <Section titulo="Performance de Envios" descricao="Status dos envios realizados.">
              <div className="report-grid report-grid-3">
                <Card titulo="Envios realizados" valor={envios.length} percentual={taxaEnvio} />
                <Card titulo="Erros de envio" valor={errosEnvio} />
                <Card titulo="Taxa de sucesso" valor={`${taxaEnvio}%`} percentual={taxaEnvio} />
              </div>
            </Section>

            <Section titulo="Últimos Check-ins" descricao="Últimas entradas registradas no evento.">
              <div className="report-table-card">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Convidado</th>
                      <th>Data e horário</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ultimosCheckins.map((convidado: any) => (
                      <tr key={convidado.id}>
                        <td>
                          <strong>{convidado.nome}</strong>
                          <small>Token: {convidado.token || "-"}</small>
                        </td>

                        <td>
                          {new Date(convidado.data_checkin).toLocaleString("pt-BR")}
                        </td>

                        <td>
                          <span className="report-status">
                            {convidado.status_checkin || "Entrou"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {ultimosCheckins.length === 0 && (
                      <tr>
                        <td colSpan={3} className="report-empty">
                          Nenhum check-in encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
