import { createClient } from "@/lib/supabase/server";
import RelatorioActions from "./RelatorioActions";

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
  const tipo = normalizeText(c.tipo);
  const tipoConvidado = normalizeText(c.tipo_convidado);
  const perfil = normalizeText(c.perfil);
  const categoria = normalizeText(c.categoria);

  return (
    c.crianca === true ||
    c.is_crianca === true ||
    tipo === "crianca" ||
    tipoConvidado === "crianca" ||
    perfil === "crianca" ||
    categoria === "crianca" ||
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
  const eventoAtual = eventos.find((evento: any) => evento.id === eventoSelecionado);
  const nomeEvento = eventoAtual?.nome || "Evento";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.omnistageproducoes.com.br";
  const reportUrl = `${appUrl}/app/relatorios${eventoSelecionado ? `?eventoId=${eventoSelecionado}` : ""}`;

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

  const taxaPresencaGeral = totalConvidados
    ? Math.round((entradasConfirmados / totalConvidados) * 100)
    : 0;

  const taxaNoShowResultado = confirmados
    ? Math.round((restantes / confirmados) * 100)
    : 0;

  const resultadoEventoTexto =
    taxaConfirmacao >= 75 && taxaPresenca >= 75
      ? "Evento com boa conversão de RSVP e presença."
      : taxaConfirmacao >= 75
      ? "RSVP forte, com atenção ao comparecimento."
      : "Ainda existem oportunidades de confirmação e presença.";

  const criancasDesacompanhadas = convidados.filter(
    (c: any) => isCrianca(c) && c.contato_principal === true
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
      className="relatorios-page"
      style={{
        minHeight: "100vh",
        padding: 26,
        background:
          "radial-gradient(circle at top left, rgba(109,40,217,.08), transparent 35%), #f6f8fc",
      }}
    >
      <div id="relatorio-evento-capture" className="relatorios-shell" style={{ maxWidth: 1500, margin: "0 auto" }}>
        <section
          className="relatorios-header"
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
            className="relatorios-filter"
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

        <RelatorioActions
          reportElementId="relatorio-evento-capture"
          reportUrl={reportUrl}
          eventoNome={nomeEvento}
          totalConvidados={totalConvidados}
          confirmados={confirmados}
          entradasConfirmados={entradasConfirmados}
          restantes={restantes}
          taxaConfirmacao={taxaConfirmacao}
          taxaPresenca={taxaPresenca}
          taxaPresencaGeral={taxaPresencaGeral}
          horaPico={horaPico}
        />

        <section
          className="relatorios-resultado"
          style={{
            marginBottom: 34,
            background:
              "linear-gradient(135deg, #111827 0%, #1e1b4b 58%, #6d28d9 100%)",
            borderRadius: 34,
            padding: 34,
            boxShadow: "0 24px 60px rgba(15,23,42,.18)",
            color: "#fff",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -90,
              right: -70,
              width: 260,
              height: 260,
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
            }}
          />

          <div
            className="relatorios-resultado-grid"
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "1.1fr 1.9fr",
              gap: 30,
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#c4b5fd",
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                }}
              >
                Resultado do Evento
              </p>

              <h2
                style={{
                  margin: "12px 0 0",
                  color: "#fff",
                  fontSize: 42,
                  lineHeight: 1,
                  letterSpacing: "-.06em",
                  fontWeight: 900,
                }}
              >
                Conversão geral
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "#ddd6fe",
                  fontSize: 16,
                  lineHeight: 1.5,
                  maxWidth: 420,
                }}
              >
                {resultadoEventoTexto}
              </p>
            </div>

            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
                  gap: 18,
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {totalConvidados}
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    convidados
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {confirmados}
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    confirmados
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {entradasConfirmados}
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    entradas confirmadas
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {restantes}
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    no-show
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {taxaConfirmacao}%
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    taxa RSVP
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {taxaPresenca}%
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    taxa presença
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {taxaNoShowResultado}%
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    taxa no-show
                  </span>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 42, lineHeight: 1, letterSpacing: "-.06em" }}>
                    {taxaPresencaGeral}%
                  </strong>
                  <span style={{ display: "block", marginTop: 8, color: "#ddd6fe", fontWeight: 800 }}>
                    presença geral
                  </span>
                </div>
              </div>

              <div className="relatorios-presenca-geral" style={{ marginTop: 34 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      color: "#ddd6fe",
                      fontSize: 14,
                      fontWeight: 800,
                      letterSpacing: ".02em",
                    }}
                  >
                    Taxa de presença sobre total de convidados
                  </span>

                  <strong
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {taxaPresencaGeral}%
                  </strong>
                </div>

                <div
                  style={{
                    height: 18,
                    borderRadius: 999,
                    background: "rgba(255,255,255,.14)",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: `${taxaPresencaGeral}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, #7c3aed 0%, #9333ea 45%, #a855f7 100%)",
                      boxShadow: "0 0 22px rgba(168,85,247,.55)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="relatorios-main-grid"
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
            <Metric value={entradas} label="entradas totais" />
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
            <Metric value={restantes} label="restantes total" />
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
          className="relatorios-detail-grid"
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
            <Metric value={criancasDesacompanhadas} label="crianças desacompanhadas" />
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
          className="relatorios-checkins"
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

      <style>{`
        @media (max-width: 920px) {
          .relatorios-page {
            padding: 14px !important;
          }

          .relatorios-shell {
            max-width: 100% !important;
          }

          .relatorios-header,
          .relatorios-resultado,
          .relatorios-checkins {
            border-radius: 22px !important;
            padding: 22px !important;
          }

          .relatorios-header h1 {
            font-size: 38px !important;
          }

          .relatorios-filter {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .relatorios-filter select,
          .relatorios-filter button {
            width: 100% !important;
            min-width: 0 !important;
          }

          .relatorios-resultado-grid,
          .relatorios-main-grid,
          .relatorios-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }

          .relatorios-main-grid > div,
          .relatorios-detail-grid > div {
            border-radius: 22px !important;
            padding: 22px !important;
          }

          .relatorios-checkins table {
            min-width: 720px;
          }
        }

        @media (max-width: 560px) {
          .relatorios-page {
            padding: 10px !important;
          }

          .relatorios-header,
          .relatorios-resultado,
          .relatorios-checkins {
            padding: 18px !important;
          }

          .relatorios-header h1,
          .relatorios-resultado h2 {
            font-size: 32px !important;
            letter-spacing: -0.05em !important;
          }

          .relatorios-main-grid > div h2 {
            font-size: 28px !important;
          }

          .relatorios-main-grid > div strong,
          .relatorios-resultado strong {
            font-size: 34px !important;
          }

          .relatorios-presenca-geral {
            margin-top: 24px !important;
          }
        }

        @media print {
          .relatorios-actions {
            display: none !important;
          }

          .relatorios-page {
            padding: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>
    </main>
  );
}
