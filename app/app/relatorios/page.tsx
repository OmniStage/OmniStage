import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    eventoId?: string;
  };
};

const TZ = "America/Sao_Paulo";

function pct(value: number) {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function formatDateTimeBR(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getHourBR(value?: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  });
}

function isCrianca(c: any) {
  return (
    c.crianca === true ||
    c.is_crianca === true ||
    c.tipo === "crianca" ||
    c.tipo_convidado === "crianca" ||
    !!c.idade_crianca
  );
}

function entrou(c: any) {
  return (
    c.status_checkin === "entrou" ||
    c.status_checkin === "confirmado" ||
    c.checkin_realizado === true
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color = "#6d28d9",
  soft = "#ede9fe",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  soft?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 26,
        padding: 26,
        minHeight: 210,
        boxShadow: "0 16px 36px rgba(15,23,42,.06)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: color,
          }}
        />
      </div>

      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        {title}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: 14,
          color: "#0f172a",
          fontSize: 52,
          lineHeight: 1,
          letterSpacing: "-.06em",
          fontWeight: 900,
        }}
      >
        {value}
      </strong>

      {subtitle && (
        <p
          style={{
            margin: "14px 0 0",
            color: "#64748b",
            fontSize: 15,
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ProgressPanel({
  title,
  subtitle,
  value,
  color,
  children,
}: {
  title: string;
  subtitle: string;
  value: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 28,
        padding: 28,
        boxShadow: "0 16px 36px rgba(15,23,42,.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 26,
              letterSpacing: "-.04em",
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 16,
            }}
          >
            {subtitle}
          </p>
        </div>

        <strong
          style={{
            color,
            fontSize: 32,
            letterSpacing: "-.05em",
          }}
        >
          {value}%
        </strong>
      </div>

      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "#e8eef6",
          overflow: "hidden",
          marginTop: 28,
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginTop: 20,
          color: "#64748b",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {children}
      </div>
    </div>
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

  const criancas = convidados.filter((c: any) => isCrianca(c)).length;
  const adultos = Math.max(totalConvidados - criancas, 0);

  const confirmados = convidados.filter(
    (c: any) => c.status_rsvp === "confirmado"
  ).length;

  const pendentes = convidados.filter(
    (c: any) => !c.status_rsvp || c.status_rsvp === "pendente"
  ).length;

  const ausenciaConfirmada = convidados.filter(
    (c: any) =>
      c.status_rsvp === "recusado" ||
      c.status_rsvp === "nao_ira" ||
      c.status_rsvp === "ausente"
  ).length;

  const viaResponsavel = convidados.filter(
    (c: any) => c.contato_principal === false
  ).length;

  const contatosPrincipais = convidados.filter(
    (c: any) => c.contato_principal === true
  ).length;

  const recebemConvite = convidados.filter(
    (c: any) => c.recebe_convite === true || c.receives_communication === true
  ).length;

  const convidadosEntraram = convidados.filter((c: any) => entrou(c));
  const entradas = convidadosEntraram.length;

  const criancasEntraram = convidadosEntraram.filter((c: any) =>
    isCrianca(c)
  ).length;

  const adultosEntraram = Math.max(entradas - criancasEntraram, 0);

  const noShowAtual = Math.max(confirmados - entradas, 0);

  const entrouSemRsvp = convidados.filter(
    (c: any) => c.status_checkin === "entrou_sem_rsvp"
  ).length;

  const errosEnvio = envios.filter((e: any) => e.status === "erro").length;

  const taxaRsvp = totalConvidados
    ? Math.round((confirmados / totalConvidados) * 100)
    : 0;

  const taxaCheckin = confirmados
    ? Math.round((entradas / confirmados) * 100)
    : 0;

  const taxaEnvio = envios.length
    ? Math.round(((envios.length - errosEnvio) / envios.length) * 100)
    : 0;

  const ultimosCheckins = convidadosEntraram
    .filter((c: any) => c.data_checkin)
    .sort(
      (a: any, b: any) =>
        new Date(b.data_checkin).getTime() -
        new Date(a.data_checkin).getTime()
    )
    .slice(0, 10);

  const ultimaEntrada = ultimosCheckins[0];

  const picoPorHora = convidadosEntraram.reduce((acc: Record<string, number>, c: any) => {
    const hora = getHourBR(c.data_checkin);
    if (!hora) return acc;
    acc[hora] = (acc[hora] || 0) + 1;
    return acc;
  }, {});

  const picoEntrada = Object.entries(picoPorHora).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const horaPico = picoEntrada ? `${picoEntrada[0]}h` : "-";
  const quantidadePico = picoEntrada ? picoEntrada[1] : 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 26,
        background:
          "radial-gradient(circle at top left, rgba(109,40,217,.08), transparent 35%), #f6f8fc",
      }}
    >
      <div style={{ maxWidth: 1480, margin: "0 auto" }}>
        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 30,
            padding: 36,
            boxShadow: "0 20px 50px rgba(15,23,42,.06)",
            display: "flex",
            justifyContent: "space-between",
            gap: 28,
            flexWrap: "wrap",
            marginBottom: 34,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#6d28d9",
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: ".14em",
                textTransform: "uppercase",
              }}
            >
              Omnistage Dashboard
            </p>

            <h1
              style={{
                margin: "14px 0 8px",
                color: "#0f172a",
                fontSize: "clamp(42px,6vw,64px)",
                lineHeight: 1,
                letterSpacing: "-.06em",
                fontWeight: 900,
              }}
            >
              Visão geral do evento
            </h1>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 18,
              }}
            >
              Acompanhe confirmações, pendências e entradas em tempo real.
            </p>
          </div>

          <form
            method="get"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <select
              name="eventoId"
              defaultValue={eventoSelecionado}
              style={{
                height: 52,
                borderRadius: 999,
                border: "1px solid #e2e8f0",
                background: "#fff",
                padding: "0 18px",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: 15,
                minWidth: 240,
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
                border: 0,
                borderRadius: 999,
                background: "#6d28d9",
                color: "#fff",
                padding: "0 24px",
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 14px 28px rgba(109,40,217,.28)",
              }}
            >
              Atualizar agora
            </button>
          </form>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 22,
          }}
        >
          <StatCard
            title="Total de convidados"
            value={totalConvidados}
            subtitle="Base completa do evento"
            color="#6d28d9"
            soft="#ede9fe"
          />

          <StatCard
            title="Adultos"
            value={adultos}
            subtitle="Convidados adultos"
            color="#2563eb"
            soft="#dbeafe"
          />

          <StatCard
            title="Crianças"
            value={criancas}
            subtitle="Convidados marcados como criança"
            color="#9333ea"
            soft="#f3e8ff"
          />

          <StatCard
            title="Via responsável"
            value={viaResponsavel}
            subtitle="Convite enviado ao responsável"
            color="#be185d"
            soft="#fce7f3"
          />

          <StatCard
            title="Contatos principais"
            value={contatosPrincipais}
            subtitle="Pessoas que representam o grupo"
            color="#7c3aed"
            soft="#ede9fe"
          />

          <StatCard
            title="Recebem convite"
            value={recebemConvite}
            subtitle="Destinatários de envio por WhatsApp"
            color="#0f766e"
            soft="#ccfbf1"
          />

          <StatCard
            title="Confirmados"
            value={confirmados}
            subtitle={`${taxaRsvp}% da lista`}
            color="#16a34a"
            soft="#dcfce7"
          />

          <StatCard
            title="Pendentes"
            value={pendentes}
            subtitle="Aguardando resposta"
            color="#f59e0b"
            soft="#fef3c7"
          />

          <StatCard
            title="Ausência confirmada"
            value={ausenciaConfirmada}
            subtitle={`${totalConvidados ? Math.round((ausenciaConfirmada / totalConvidados) * 100) : 0}% da lista`}
            color="#ef4444"
            soft="#fee2e2"
          />

          <StatCard
            title="Entradas"
            value={entradas}
            subtitle={`${taxaCheckin}% dos confirmados`}
            color="#2563eb"
            soft="#dbeafe"
          />

          <StatCard
            title="Adultos entraram"
            value={adultosEntraram}
            subtitle="Entradas de adultos"
            color="#0f766e"
            soft="#ccfbf1"
          />

          <StatCard
            title="Crianças entraram"
            value={criancasEntraram}
            subtitle="Entradas de crianças"
            color="#9333ea"
            soft="#f3e8ff"
          />

          <StatCard
            title="No-show atual"
            value={noShowAtual}
            subtitle="Confirmados que ainda não entraram"
            color="#7c3aed"
            soft="#ede9fe"
          />

          <StatCard
            title="Pico de entrada"
            value={horaPico}
            subtitle={`${quantidadePico} entrada(s) nesse horário`}
            color="#16a34a"
            soft="#dcfce7"
          />
        </section>

        <section
          style={{
            marginTop: 34,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: 22,
          }}
        >
          <ProgressPanel
            title="Confirmações"
            subtitle="Progresso geral de RSVP"
            value={taxaRsvp}
            color="#6d28d9"
          >
            <span>{confirmados} confirmados</span>
            <span>{pendentes} pendentes</span>
            <span>{ausenciaConfirmada} ausências</span>
            <span>{criancas} crianças</span>
          </ProgressPanel>

          <ProgressPanel
            title="Check-in"
            subtitle="Entradas realizadas no evento"
            value={taxaCheckin}
            color="#16a34a"
          >
            <span>{entradas} entradas</span>
            <span>{adultosEntraram} adultos</span>
            <span>{criancasEntraram} crianças</span>
            <span>{noShowAtual} restantes</span>
          </ProgressPanel>
        </section>

        <section
          style={{
            marginTop: 34,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 30,
            padding: 32,
            boxShadow: "0 18px 40px rgba(15,23,42,.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 28,
                  letterSpacing: "-.04em",
                }}
              >
                Última entrada
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#64748b",
                  fontSize: 17,
                }}
              >
                Registro mais recente do check-in em horário do Brasil.
              </p>
            </div>

            <span
              style={{
                height: 38,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "0 18px",
                background: "#dcfce7",
                color: "#16a34a",
                fontWeight: 900,
              }}
            >
              Ao vivo
            </span>
          </div>

          {ultimaEntrada ? (
            <div
              style={{
                border: "1px dashed #dbe3ef",
                borderRadius: 22,
                padding: 24,
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                  Convidado
                </p>
                <strong
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#0f172a",
                    fontSize: 22,
                  }}
                >
                  {ultimaEntrada.nome}
                </strong>
              </div>

              <div>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                  Horário
                </p>
                <strong
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#0f172a",
                    fontSize: 18,
                  }}
                >
                  {formatDateTimeBR(ultimaEntrada.data_checkin)}
                </strong>
              </div>

              <div>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                  Tipo
                </p>
                <strong
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#0f172a",
                    fontSize: 18,
                  }}
                >
                  {isCrianca(ultimaEntrada) ? "Criança" : "Adulto"}
                </strong>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: "1px dashed #dbe3ef",
                borderRadius: 22,
                padding: 24,
                color: "#64748b",
                fontSize: 17,
              }}
            >
              Nenhuma entrada registrada até o momento.
            </div>
          )}
        </section>

        <section
          style={{
            marginTop: 34,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 30,
            padding: 32,
            boxShadow: "0 18px 40px rgba(15,23,42,.05)",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 28,
              letterSpacing: "-.04em",
            }}
          >
            Últimos check-ins
          </h2>

          <div
            style={{
              marginTop: 22,
              overflowX: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 22,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
              }}
            >
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ padding: 18, textAlign: "left", color: "#64748b" }}>
                    Convidado
                  </th>
                  <th style={{ padding: 18, textAlign: "left", color: "#64748b" }}>
                    Tipo
                  </th>
                  <th style={{ padding: 18, textAlign: "left", color: "#64748b" }}>
                    Data e horário
                  </th>
                  <th style={{ padding: 18, textAlign: "left", color: "#64748b" }}>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {ultimosCheckins.map((convidado: any) => (
                  <tr key={convidado.id}>
                    <td style={{ padding: 18, borderTop: "1px solid #e2e8f0" }}>
                      <strong style={{ color: "#0f172a" }}>{convidado.nome}</strong>
                      <small
                        style={{
                          display: "block",
                          marginTop: 4,
                          color: "#64748b",
                        }}
                      >
                        Token: {convidado.token || "-"}
                      </small>
                    </td>

                    <td style={{ padding: 18, borderTop: "1px solid #e2e8f0" }}>
                      {isCrianca(convidado) ? "Criança" : "Adulto"}
                    </td>

                    <td style={{ padding: 18, borderTop: "1px solid #e2e8f0" }}>
                      {formatDateTimeBR(convidado.data_checkin)}
                    </td>

                    <td style={{ padding: 18, borderTop: "1px solid #e2e8f0" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          borderRadius: 999,
                          padding: "7px 12px",
                          background: "#dcfce7",
                          color: "#16a34a",
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
                    <td
                      colSpan={4}
                      style={{
                        padding: 42,
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      Nenhum check-in encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
