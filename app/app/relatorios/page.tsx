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

function normalizeText(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isCrianca(c: any) {
  const crianca = normalizeText(c.crianca);

  return (
    crianca === "sim" ||
    crianca === "s" ||
    crianca === "true" ||
    crianca === "1" ||
    crianca === "crianca" ||
    Number(c.idade_crianca || 0) > 0
  );
}

function entrou(c: any) {
  return (
    c.status_checkin === "entrou" ||
    c.status_checkin === "confirmado" ||
    c.checkin_realizado === true
  );
}

function BigProgressCard({
  title,
  subtitle,
  percent,
  color,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  percent: number;
  color: string;
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 30,
        padding: 34,
        boxShadow: "0 18px 42px rgba(15,23,42,.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 34,
              lineHeight: 1,
              letterSpacing: "-.05em",
              fontWeight: 900,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748b",
              fontSize: 20,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </p>
        </div>

        <strong
          style={{
            color,
            fontSize: 42,
            lineHeight: 1,
            letterSpacing: "-.06em",
            fontWeight: 900,
          }}
        >
          {percent}%
        </strong>
      </div>

      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "#e8eef6",
          overflow: "hidden",
          marginTop: 34,
        }}
      >
        <div
          style={{
            width: pct(percent),
            height: "100%",
            background: color,
            borderRadius: 999,
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 18,
          marginTop: 26,
        }}
      >
        {children}
      </div>

      {footer && (
        <div
          style={{
            marginTop: 28,
            borderTop: "1px solid #e2e8f0",
            paddingTop: 18,
            color: "#0f172a",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div>
      <strong
        style={{
          display: "block",
          color: "#64748b",
          fontSize: 22,
          lineHeight: 1,
          fontWeight: 900,
        }}
      >
        {value}
      </strong>

      <span
        style={{
          display: "block",
          marginTop: 6,
          color: "#64748b",
          fontSize: 15,
          lineHeight: 1.2,
          fontWeight: 800,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function DetailCard({
  title,
  subtitle,
  color,
  soft,
  children,
}: {
  title: string;
  subtitle: string;
  color: string;
  soft: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 30,
        padding: 30,
        boxShadow: "0 18px 42px rgba(15,23,42,.05)",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 18,
          background: soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 22,
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

      <h3
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: 26,
          letterSpacing: "-.04em",
          fontWeight: 900,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "8px 0 24px",
          color: "#64748b",
          fontSize: 16,
        }}
      >
        {subtitle}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 18,
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

  const confirmadosList = convidados.filter(
    (c: any) => c.status_rsvp === "confirmado"
  );

  const confirmados = confirmadosList.length;

  const pendentes = convidados.filter(
    (c: any) => !c.status_rsvp || c.status_rsvp === "pendente"
  ).length;

  const ausenciaConfirmada = convidados.filter(
    (c: any) =>
      c.status_rsvp === "recusado" ||
      c.status_rsvp === "nao_ira" ||
      c.status_rsvp === "ausente"
  ).length;

  const criancasConfirmadas = confirmadosList.filter((c: any) =>
    isCrianca(c)
  ).length;

  const adultosConfirmados = Math.max(confirmados - criancasConfirmadas, 0);

  const taxaConfirmacao = totalConvidados
    ? Math.round((confirmados / totalConvidados) * 100)
    : 0;

  const taxaPendencia = totalConvidados
    ? Math.round((pendentes / totalConvidados) * 100)
    : 0;

  const textoRsvp =
    taxaConfirmacao >= 75 ? "RSVP em bom andamento" : "Ainda há muitos pendentes";

  const convidadosEntraram = convidados.filter((c: any) => entrou(c));
  const entradas = convidadosEntraram.length;

  const entradasConfirmadosList = confirmadosList.filter((c: any) =>
    entrou(c)
  );

  const entradasConfirmados = entradasConfirmadosList.length;

  const criancasConfirmadasEntraram = entradasConfirmadosList.filter((c: any) =>
    isCrianca(c)
  ).length;

  const adultosConfirmadosEntraram = Math.max(
    entradasConfirmados - criancasConfirmadasEntraram,
    0
  );

  const adultosConfirmadosRestantes = Math.max(
    adultosConfirmados - adultosConfirmadosEntraram,
    0
  );

  const criancasConfirmadasRestantes = Math.max(
    criancasConfirmadas - criancasConfirmadasEntraram,
    0
  );

  const restantes = Math.max(confirmados - entradasConfirmados, 0);

  const entrouSemRsvp = convidados.filter(
    (c: any) => c.status_checkin === "entrou_sem_rsvp"
  ).length;

  const taxaPresenca = confirmados
    ? Math.round((entradasConfirmados / confirmados) * 100)
    : 0;

  const viaResponsavel = convidados.filter(
    (c: any) => c.contato_principal === false
  ).length;

  const contatosPrincipais = convidados.filter(
    (c: any) => c.contato_principal === true
  ).length;

  const noShowList = confirmadosList.filter((c: any) => !entrou(c));
  const noShow = noShowList.length;

  const taxaNoShow = confirmados ? Math.round((noShow / confirmados) * 100) : 0;

  const adultosPendentesEntrada = noShowList.filter(
    (c: any) => !isCrianca(c)
  ).length;

  const criancasPendentesEntrada = noShowList.filter((c: any) =>
    isCrianca(c)
  ).length;

  const enviosRegistrados = envios.length;
  const errosEnvio = envios.filter((e: any) => e.status === "erro").length;
  const enviosSucesso = Math.max(enviosRegistrados - errosEnvio, 0);

  const taxaEnvio = enviosRegistrados
    ? Math.round((enviosSucesso / enviosRegistrados) * 100)
    : 0;

  const entradasComData = convidadosEntraram.filter((c: any) => c.data_checkin);

  const ultimosCheckins = [...entradasComData]
    .sort(
      (a: any, b: any) =>
        new Date(b.data_checkin).getTime() -
        new Date(a.data_checkin).getTime()
    )
    .slice(0, 10);

  const primeiraEntrada = [...entradasComData].sort(
    (a: any, b: any) =>
      new Date(a.data_checkin).getTime() -
      new Date(b.data_checkin).getTime()
  )[0];

  const ultimaEntrada = ultimosCheckins[0];

  const picoPorHora = entradasComData.reduce(
    (acc: Record<string, number>, c: any) => {
      const hora = getHourBR(c.data_checkin);
      if (!hora) return acc;
      acc[hora] = (acc[hora] || 0) + 1;
      return acc;
    },
    {}
  );

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
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
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
              Acompanhe confirmações, pendências, entradas e operação do evento.
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
            gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
            gap: 26,
          }}
        >
          <BigProgressCard
            title="Confirmações"
            subtitle="Progresso geral de RSVP"
            percent={taxaConfirmacao}
            color="#6d28d9"
            footer={textoRsvp}
          >
            <Metric value={totalConvidados} label="total convidados" />
            <Metric value={adultos} label="adultos" />
            <Metric value={criancas} label="crianças" />
            <Metric value={confirmados} label="confirmados" />
            <Metric value={adultosConfirmados} label="adultos confirmados" />
            <Metric value={criancasConfirmadas} label="crianças confirmadas" />
            <Metric value={pendentes} label="pendentes" />
            <Metric value={ausenciaConfirmada} label="ausências" />
            <Metric value={`${taxaConfirmacao}%`} label="taxa confirmação" />
            <Metric value={`${taxaPendencia}%`} label="taxa pendência" />
          </BigProgressCard>

          <BigProgressCard
            title="Check-in"
            subtitle="Entradas realizadas no evento"
            percent={taxaPresenca}
            color="#16a34a"
            footer={`Pico de entrada: ${horaPico} com ${quantidadePico} entrada(s)`}
          >
            <Metric value={entradasConfirmados} label="entradas confirmados" />
            <Metric
              value={adultosConfirmadosEntraram}
              label="adultos confirmados entraram"
            />
            <Metric
              value={criancasConfirmadasEntraram}
              label="crianças confirmadas entraram"
            />
            <Metric
              value={adultosConfirmadosRestantes}
              label="adultos confirmados restantes"
            />
            <Metric
              value={criancasConfirmadasRestantes}
              label="crianças confirmadas restantes"
            />
            <Metric value={restantes} label="confirmados restantes" />
            <Metric value={entrouSemRsvp} label="entrou sem RSVP" />
            <Metric value={horaPico} label="pico entrada" />
            <Metric
              value={ultimaEntrada ? formatDateTimeBR(ultimaEntrada.data_checkin) : "-"}
              label="última entrada"
            />
            <Metric value={`${taxaPresenca}%`} label="presença confirmados" />
          </BigProgressCard>
        </section>

        <section
          style={{
            marginTop: 34,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
          }}
        >
          <DetailCard
            title="Composição do evento"
            subtitle="Perfil geral da lista"
            color="#6d28d9"
            soft="#ede9fe"
          >
            <Metric value={totalConvidados} label="total convidados" />
            <Metric value={adultos} label="adultos" />
            <Metric value={criancas} label="crianças" />
            <Metric value={viaResponsavel} label="via responsável" />
            <Metric value={contatosPrincipais} label="contatos principais" />
          </DetailCard>

          <DetailCard
            title="Pico de entrada"
            subtitle="Movimento por horário"
            color="#16a34a"
            soft="#dcfce7"
          >
            <Metric value={horaPico} label="horário com mais entradas" />
            <Metric value={quantidadePico} label="entradas nesse horário" />
            <Metric
              value={primeiraEntrada ? formatDateTimeBR(primeiraEntrada.data_checkin) : "-"}
              label="primeira entrada"
            />
            <Metric
              value={ultimaEntrada ? formatDateTimeBR(ultimaEntrada.data_checkin) : "-"}
              label="última entrada"
            />
          </DetailCard>

          <DetailCard
            title="No-show"
            subtitle="Confirmados que ainda não entraram"
            color="#ea580c"
            soft="#fff7ed"
          >
            <Metric value={noShow} label="confirmados não entraram" />
            <Metric value={`${taxaNoShow}%`} label="percentual no-show" />
            <Metric value={adultosPendentesEntrada} label="adultos pendentes" />
            <Metric value={criancasPendentesEntrada} label="crianças pendentes" />
          </DetailCard>

          <DetailCard
            title="Envios"
            subtitle="Performance operacional dos disparos"
            color="#2563eb"
            soft="#dbeafe"
          >
            <Metric value={enviosRegistrados} label="envios registrados" />
            <Metric value={enviosSucesso} label="sucesso" />
            <Metric value={errosEnvio} label="erros" />
            <Metric value={`${taxaEnvio}%`} label="taxa de sucesso" />
          </DetailCard>
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
                    Data e horário Brasil
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
