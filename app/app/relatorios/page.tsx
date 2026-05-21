import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    eventoId?: string;
  };
};

function pct(value: number) {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function Card({
  titulo,
  valor,
  percentual,
}: {
  titulo: string;
  valor: string | number;
  percentual?: number;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 24,
        padding: 24,
        boxShadow: "0 10px 30px rgba(15,23,42,.06)",
        minHeight: 160,
      }}
    >
      <p style={{ margin: 0, color: "#64748b", fontSize: 14, fontWeight: 700 }}>
        {titulo}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: 14,
          fontSize: 42,
          lineHeight: 1,
          color: "#0f172a",
          letterSpacing: "-.04em",
        }}
      >
        {valor}
      </strong>

      {typeof percentual === "number" && (
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            <span>Performance</span>
            <span>{pct(percentual)}</span>
          </div>

          <div
            style={{
              height: 8,
              background: "#ede9fe",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: pct(percentual),
                background: "#6d28d9",
                borderRadius: 999,
              }}
            />
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
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 38 }}>
      <div style={{ marginBottom: 18 }}>
        <h2
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: 26,
            letterSpacing: "-.03em",
          }}
        >
          {titulo}
        </h2>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
          {descricao}
        </p>
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

  const confirmados = convidados.filter((c: any) => c.status_rsvp === "confirmado").length;
  const pendentes = convidados.filter((c: any) => !c.status_rsvp || c.status_rsvp === "pendente").length;
  const recusados = convidados.filter((c: any) => c.status_rsvp === "recusado").length;

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

  const taxaPresenca = totalConvidados ? Math.round((checkins / totalConvidados) * 100) : 0;
  const taxaRsvp = totalConvidados ? Math.round((confirmados / totalConvidados) * 100) : 0;
  const taxaEnvio = envios.length ? Math.round(((envios.length - errosEnvio) / envios.length) * 100) : 0;

  const ultimosCheckins = convidados
    .filter((c: any) => c.data_checkin)
    .sort(
      (a: any, b: any) =>
        new Date(b.data_checkin).getTime() - new Date(a.data_checkin).getTime()
    )
    .slice(0, 10);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 28,
        background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 32,
            overflow: "hidden",
            boxShadow: "0 24px 70px rgba(15,23,42,.08)",
          }}
        >
          <header
            style={{
              padding: 38,
              background: "linear-gradient(135deg,#0f172a,#312e81)",
              display: "flex",
              justifyContent: "space-between",
              gap: 28,
              flexWrap: "wrap",
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-block",
                  background: "rgba(255,255,255,.12)",
                  color: "#cbd5e1",
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                }}
              >
                OmniStage Analytics
              </span>

              <h1
                style={{
                  margin: "18px 0 10px",
                  color: "#fff",
                  fontSize: "clamp(42px,6vw,72px)",
                  lineHeight: ".95",
                  letterSpacing: "-.06em",
                }}
              >
                Relatório Executivo
              </h1>

              <p style={{ margin: 0, maxWidth: 720, color: "#cbd5e1", fontSize: 15 }}>
                Resultado completo do evento com indicadores de RSVP, presença,
                check-in e performance de envios.
              </p>
            </div>

            <form method="get" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <select
                name="eventoId"
                defaultValue={eventoSelecionado}
                style={{
                  height: 48,
                  minWidth: 240,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(15,23,42,.7)",
                  color: "#fff",
                  padding: "0 14px",
                  fontWeight: 700,
                }}
              >
                {eventos.map((evento: any) => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nome}
                  </option>
                ))}
              </select>

              <button
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: 0,
                  background: "#fff",
                  color: "#0f172a",
                  padding: "0 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Atualizar
              </button>
            </form>
          </header>

          <div style={{ padding: 34 }}>
            <Section titulo="Resumo do Evento" descricao="Indicadores gerais do evento.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
                <Card titulo="Total de convidados" valor={totalConvidados} />
                <Card titulo="Confirmados RSVP" valor={confirmados} percentual={taxaRsvp} />
                <Card titulo="Entradas no evento" valor={checkins} percentual={taxaPresenca} />
                <Card titulo="Não compareceram" valor={naoEntraram} />
              </div>
            </Section>

            <Section titulo="Performance RSVP" descricao="Análise de confirmações do evento.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
                <Card titulo="Confirmados" valor={confirmados} percentual={taxaRsvp} />
                <Card titulo="Pendentes" valor={pendentes} />
                <Card titulo="Recusados" valor={recusados} />
              </div>
            </Section>

            <Section titulo="Performance Check-in" descricao="Indicadores de presença e entrada.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
                <Card titulo="Entraram" valor={checkins} percentual={taxaPresenca} />
                <Card titulo="Entrou sem RSVP" valor={entrouSemRsvp} />
                <Card titulo="No-show" valor={naoEntraram} />
              </div>
            </Section>

            <Section titulo="Performance de Envios" descricao="Status dos envios realizados.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
                <Card titulo="Envios realizados" valor={envios.length} percentual={taxaEnvio} />
                <Card titulo="Erros de envio" valor={errosEnvio} />
                <Card titulo="Taxa de sucesso" valor={`${taxaEnvio}%`} percentual={taxaEnvio} />
              </div>
            </Section>

            <Section titulo="Últimos Check-ins" descricao="Últimas entradas registradas no evento.">
              <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 24 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={{ padding: 18, textAlign: "left", fontSize: 11, color: "#64748b" }}>Convidado</th>
                      <th style={{ padding: 18, textAlign: "left", fontSize: 11, color: "#64748b" }}>Data e horário</th>
                      <th style={{ padding: 18, textAlign: "left", fontSize: 11, color: "#64748b" }}>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ultimosCheckins.map((convidado: any) => (
                      <tr key={convidado.id}>
                        <td style={{ padding: 18, borderTop: "1px solid #e5e7eb" }}>
                          <strong>{convidado.nome}</strong>
                          <small style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                            Token: {convidado.token || "-"}
                          </small>
                        </td>

                        <td style={{ padding: 18, borderTop: "1px solid #e5e7eb", color: "#334155" }}>
                          {new Date(convidado.data_checkin).toLocaleString("pt-BR")}
                        </td>

                        <td style={{ padding: 18, borderTop: "1px solid #e5e7eb" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              background: "#dcfce7",
                              color: "#16a34a",
                              padding: "7px 11px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {convidado.status_checkin || "Entrou"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {ultimosCheckins.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: 42, textAlign: "center", color: "#64748b" }}>
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
    </main>
  );
}
