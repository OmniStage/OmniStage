import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    eventoId?: string;
  };
};

function pct(value: number) {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function MiniBar({
  value,
  color = "#6d28d9",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div
      style={{
        height: 8,
        borderRadius: 999,
        background: "#eef2f7",
        overflow: "hidden",
        marginTop: 14,
      }}
    >
      <div
        style={{
          width: pct(value),
          height: "100%",
          background: color,
          borderRadius: 999,
        }}
      />
    </div>
  );
}

function KpiCard({
  titulo,
  valor,
  descricao,
  percentual,
  color,
  soft,
}: {
  titulo: string;
  valor: string | number;
  descricao?: string;
  percentual?: number;
  color: string;
  soft: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 28,
        padding: 26,
        boxShadow: "0 18px 45px rgba(15,23,42,.08)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          background: soft,
          marginBottom: 22,
        }}
      />

      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {titulo}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: 12,
          color: "#0f172a",
          fontSize: 54,
          lineHeight: 1,
          letterSpacing: "-.06em",
          fontWeight: 900,
        }}
      >
        {valor}
      </strong>

      {descricao && (
        <p
          style={{
            margin: "12px 0 0",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          {descricao}
        </p>
      )}

      {typeof percentual === "number" && <MiniBar value={percentual} color={color} />}
    </div>
  );
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
        boxShadow: "0 10px 30px rgba(15,23,42,.05)",
        minHeight: 156,
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {titulo}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: 14,
          fontSize: 42,
          lineHeight: 1,
          color: "#0f172a",
          letterSpacing: "-.05em",
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
              fontWeight: 900,
              textTransform: "uppercase",
              color: "#64748b",
              letterSpacing: ".08em",
            }}
          >
            <span>Performance</span>
            <span>{pct(percentual)}</span>
          </div>

          <MiniBar value={percentual} />
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

        <p
          style={{
            margin: "6px 0 0",
            color: "#64748b",
            fontSize: 14,
          }}
        >
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

  const scoreEvento = Math.round((taxaRsvp + taxaPresenca + taxaEnvio) / 3);

  const ultimosCheckins = convidados
    .filter((c: any) => c.data_checkin)
    .sort(
      (a: any, b: any) =>
        new Date(b.data_checkin).getTime() -
        new Date(a.data_checkin).getTime()
    )
    .slice(0, 10);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(109,40,217,.13), transparent 32%), linear-gradient(135deg,#f8fafc,#eef2f7)",
        padding: 28,
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 36,
            padding: 42,
            background:
              "linear-gradient(135deg,#0f172a 0%,#1e1b4b 55%,#312e81 100%)",
            boxShadow: "0 30px 90px rgba(15,23,42,.22)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -130,
              right: -120,
              width: 430,
              height: 430,
              borderRadius: "50%",
              background: "rgba(255,255,255,.06)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              justifyContent: "space-between",
              gap: 32,
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <span
                style={{
                  display: "inline-flex",
                  borderRadius: 999,
                  padding: "8px 14px",
                  background: "rgba(255,255,255,.1)",
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                }}
              >
                OmniStage Analytics
              </span>

              <h1
                style={{
                  margin: "22px 0 12px",
                  color: "#fff",
                  fontSize: "clamp(46px,7vw,84px)",
                  lineHeight: ".92",
                  letterSpacing: "-.07em",
                  fontWeight: 900,
                }}
              >
                Relatório Executivo
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#cbd5e1",
                  fontSize: 17,
                  lineHeight: 1.7,
                  maxWidth: 690,
                }}
              >
                Inteligência completa do evento com análise de RSVP, presença,
                check-in e performance operacional.
              </p>
            </div>

            <aside
              style={{
                width: 340,
                borderRadius: 28,
                padding: 24,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.1)",
                backdropFilter: "blur(18px)",
              }}
            >
              <p
                style={{
                  margin: "0 0 14px",
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                }}
              >
                Evento analisado
              </p>

              <form method="get" style={{ display: "grid", gap: 12 }}>
                <select
                  name="eventoId"
                  defaultValue={eventoSelecionado}
                  style={{
                    height: 52,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,.16)",
                    background: "rgba(15,23,42,.62)",
                    color: "#fff",
                    padding: "0 16px",
                    fontWeight: 800,
                    fontSize: 15,
                    outline: "none",
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
                    height: 52,
                    borderRadius: 16,
                    border: 0,
                    background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 15,
                    cursor: "pointer",
                    boxShadow: "0 16px 34px rgba(109,40,217,.38)",
                  }}
                >
                  Atualizar relatório
                </button>
              </form>

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: "1px solid rgba(255,255,255,.1)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>
                    Score
                  </p>
                  <strong
                    style={{
                      display: "block",
                      marginTop: 6,
                      color: "#fff",
                      fontSize: 34,
                      letterSpacing: "-.06em",
                    }}
                  >
                    {scoreEvento}%
                  </strong>
                </div>

                <div>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>
                    Presença
                  </p>
                  <strong
                    style={{
                      display: "block",
                      marginTop: 6,
                      color: "#fff",
                      fontSize: 34,
                      letterSpacing: "-.06em",
                    }}
                  >
                    {taxaPresenca}%
                  </strong>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section
          style={{
            marginTop: -42,
            position: "relative",
            zIndex: 5,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))",
            gap: 20,
          }}
        >
          <KpiCard
            titulo="Total convidados"
            valor={totalConvidados}
            descricao="Base total do evento."
            color="#2563eb"
            soft="#eff6ff"
          />
          <KpiCard
            titulo="Confirmados RSVP"
            valor={confirmados}
            descricao={`${taxaRsvp}% da base confirmou presença.`}
            percentual={taxaRsvp}
            color="#7c3aed"
            soft="#f5f3ff"
          />
          <KpiCard
            titulo="Entradas realizadas"
            valor={checkins}
            descricao={`${taxaPresenca}% dos convidados entraram.`}
            percentual={taxaPresenca}
            color="#16a34a"
            soft="#ecfdf5"
          />
          <KpiCard
            titulo="No-show"
            valor={naoEntraram}
            descricao="Convidados que não compareceram."
            color="#ea580c"
            soft="#fff7ed"
          />
        </section>

        <section
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1.15fr .85fr",
            gap: 22,
          }}
        >
          <div
            style={{
              borderRadius: 30,
              background: "#fff",
              border: "1px solid #e5e7eb",
              padding: 28,
              boxShadow: "0 14px 40px rgba(15,23,42,.06)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                color: "#0f172a",
                letterSpacing: "-.04em",
              }}
            >
              Leitura executiva
            </h2>

            <p
              style={{
                margin: "10px 0 0",
                color: "#64748b",
                lineHeight: 1.7,
              }}
            >
              O evento teve {taxaRsvp}% de confirmação RSVP e {taxaPresenca}%
              de presença registrada no check-in. Foram identificados{" "}
              {naoEntraram} convidados em no-show e {entrouSemRsvp} entradas sem
              RSVP prévio.
            </p>
          </div>

          <div
            style={{
              borderRadius: 30,
              background: "#0f172a",
              padding: 28,
              boxShadow: "0 18px 45px rgba(15,23,42,.16)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Performance geral
            </p>

            <strong
              style={{
                display: "block",
                marginTop: 12,
                color: "#fff",
                fontSize: 58,
                lineHeight: 1,
                letterSpacing: "-.07em",
              }}
            >
              {scoreEvento}%
            </strong>

            <MiniBar value={scoreEvento} color="#8b5cf6" />
          </div>
        </section>

        <Section titulo="Performance RSVP" descricao="Análise de confirmações do evento.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 18,
            }}
          >
            <Card titulo="Confirmados" valor={confirmados} percentual={taxaRsvp} />
            <Card titulo="Pendentes" valor={pendentes} />
            <Card titulo="Recusados" valor={recusados} />
          </div>
        </Section>

        <Section titulo="Performance Check-in" descricao="Indicadores de presença e entrada.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 18,
            }}
          >
            <Card titulo="Entraram" valor={checkins} percentual={taxaPresenca} />
            <Card titulo="Entrou sem RSVP" valor={entrouSemRsvp} />
            <Card titulo="No-show" valor={naoEntraram} />
          </div>
        </Section>

        <Section titulo="Performance de Envios" descricao="Status dos envios realizados.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 18,
            }}
          >
            <Card titulo="Envios realizados" valor={envios.length} percentual={taxaEnvio} />
            <Card titulo="Erros de envio" valor={errosEnvio} />
            <Card titulo="Taxa de sucesso" valor={`${taxaEnvio}%`} percentual={taxaEnvio} />
          </div>
        </Section>

        <Section titulo="Últimos Check-ins" descricao="Últimas entradas registradas no evento.">
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: 28,
              background: "#fff",
              boxShadow: "0 14px 38px rgba(15,23,42,.06)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ padding: 20, textAlign: "left", fontSize: 11, color: "#64748b" }}>
                    Convidado
                  </th>
                  <th style={{ padding: 20, textAlign: "left", fontSize: 11, color: "#64748b" }}>
                    Data e horário
                  </th>
                  <th style={{ padding: 20, textAlign: "left", fontSize: 11, color: "#64748b" }}>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {ultimosCheckins.map((convidado: any) => (
                  <tr key={convidado.id}>
                    <td style={{ padding: 20, borderTop: "1px solid #e5e7eb" }}>
                      <strong>{convidado.nome}</strong>
                      <small style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                        Token: {convidado.token || "-"}
                      </small>
                    </td>

                    <td style={{ padding: 20, borderTop: "1px solid #e5e7eb", color: "#334155" }}>
                      {new Date(convidado.data_checkin).toLocaleString("pt-BR")}
                    </td>

                    <td style={{ padding: 20, borderTop: "1px solid #e5e7eb" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          background: "#dcfce7",
                          color: "#16a34a",
                          padding: "7px 11px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {convidado.status_checkin || "Entrou"}
                      </span>
                    </td>
                  </tr>
                ))}

                {ultimosCheckins.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 44, textAlign: "center", color: "#64748b" }}>
                      Nenhum check-in encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </main>
  );
}
