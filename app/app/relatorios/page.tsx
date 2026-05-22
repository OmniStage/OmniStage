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

function formatCurrencyBR(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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

function getDatePart(value?: string | null) {
  if (!value) return "";

  const text = String(value).trim();
  if (!text) return "";

  return text.includes("T") ? text.split("T")[0] : text.slice(0, 10);
}

function getTimePart(value?: string | null) {
  if (!value) return "";

  const text = String(value).trim();
  if (!text) return "";

  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function makeBrazilDateTime(dateValue?: string | null, timeValue?: string | null) {
  const datePart = getDatePart(dateValue);
  const timePart = getTimePart(timeValue);

  if (!datePart || !timePart) return null;

  const date = new Date(`${datePart}T${timePart}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getBrazilParts(value?: string | null) {
  if (!value) return null;

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  if (!year || !month || !day || !hour || !minute) return null;

  return {
    year,
    month,
    day,
    hour: Number(hour),
    minute: Number(minute),
  };
}

function getSlot30StartBR(value?: string | null) {
  const parts = getBrazilParts(value);
  if (!parts) return null;

  const slotMinute = parts.minute < 30 ? 0 : 30;
  const date = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${String(parts.hour).padStart(2, "0")}:${String(slotMinute).padStart(2, "0")}:00-03:00`,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function floor30(date: Date) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() < 30 ? 0 : 30, 0, 0);
  return next;
}

function ceil30(date: Date) {
  const next = new Date(date);
  const minutes = next.getMinutes();

  if (minutes === 0 || minutes === 30) {
    next.setSeconds(0, 0);
    return next;
  }

  if (minutes < 30) {
    next.setMinutes(30, 0, 0);
    return next;
  }

  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

function formatTimeBRFromDate(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatIntervalo30BR(date: Date) {
  const fim = new Date(date.getTime() + 30 * 60 * 1000);
  return `${formatTimeBRFromDate(date)} às ${formatTimeBRFromDate(fim)}`;
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
    crianca === "criancas" ||
    crianca === "infantil" ||
    c.crianca === true ||
    c.is_crianca === true ||
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
  const valueText = String(value);
  const isDateTime = valueText.includes("/") || valueText.includes(" às ");

  return (
    <div>
      <strong
        style={{
          display: "block",
          color: "#64748b",
          fontSize: isDateTime ? 18 : 22,
          lineHeight: isDateTime ? 1.16 : 1,
          fontWeight: 900,
          wordBreak: "break-word",
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
    .select("id, nome, data_evento, data_inicio, data_termino, hora_inicio, hora_termino")
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


  const giftReservationsRes = eventoSelecionado
    ? await supabase
        .from("gift_reservations")
        .select("*")
        .eq("evento_id", eventoSelecionado)
    : { data: [] };

  const giftItemsRes = eventoSelecionado
    ? await supabase
        .from("gift_items")
        .select("*")
        .eq("evento_id", eventoSelecionado)
    : { data: [] };

  const giftPaymentsRes = eventoSelecionado
    ? await supabase
        .from("gift_payments")
        .select("*")
        .eq("evento_id", eventoSelecionado)
    : { data: [] };

  const convidados = convidadosRes.data ?? [];
  const envios = enviosRes.data ?? [];

  const giftReservations = giftReservationsRes.data ?? [];
  const giftItems = giftItemsRes.data ?? [];
  const giftPayments = giftPaymentsRes.data ?? [];

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

  const criancasDesacompanhadas = convidados.filter((c: any) => {
    const responsavel = String(c.responsavel || "").trim();
    const responsavelTelefone = String(c.responsavel_telefone || "").trim();
    const tipoConvite = normalizeText(c.tipo_convite);

    return (
      isCrianca(c) &&
      responsavel.length > 0 &&
      responsavelTelefone.length > 0 &&
      tipoConvite === "individual"
    );
  }).length;

  const contatosPrincipais = convidados.filter(
    (c: any) => c.contato_principal === true
  ).length;

  const convitesIndividuais = convidados.filter(
    (c: any) => normalizeText(c.tipo_convite) === "individual"
  ).length;

  const convidadosEmGrupo = convidados.filter((c: any) => {
    const tipoConvite = normalizeText(c.tipo_convite);
    const grupoId = String(c.grupo_id || "").trim();
    const grupo = String(c.grupo || "").trim();

    return tipoConvite === "grupo" || grupoId.length > 0 || grupo.length > 0;
  }).length;

  const gruposFamilias = new Set(
    convidados
      .filter((c: any) => String(c.grupo_id || c.grupo || "").trim())
      .map((c: any) => String(c.grupo_id || c.grupo).trim())
  ).size;

  const recebemComunicacao = convidados.filter(
    (c: any) => c.recebe_convite === true
  ).length;

  const naoRecebemComunicacao = Math.max(totalConvidados - recebemComunicacao, 0);

  const cartoesComToken = convidados.filter(
    (c: any) => String(c.token || "").trim().length > 0
  ).length;

  const cartoesSemToken = Math.max(totalConvidados - cartoesComToken, 0);

  const criancasIndividuais = convidados.filter(
    (c: any) => isCrianca(c) && normalizeText(c.tipo_convite) === "individual"
  ).length;

  const criancasEmGrupo = Math.max(criancas - criancasIndividuais, 0);

  const adultosIndividuais = convidados.filter(
    (c: any) => !isCrianca(c) && normalizeText(c.tipo_convite) === "individual"
  ).length;

  const adultosEmGrupo = Math.max(adultos - adultosIndividuais, 0);

  const mediaConvidadosPorContato = contatosPrincipais
    ? (totalConvidados / contatosPrincipais).toFixed(1).replace(".", ",")
    : "0";

  const taxaComunicacao = totalConvidados
    ? Math.round((recebemComunicacao / totalConvidados) * 100)
    : 0;

  const taxaCartoesComToken = totalConvidados
    ? Math.round((cartoesComToken / totalConvidados) * 100)
    : 0;

  const taxaAdultos = totalConvidados
    ? Math.round((adultos / totalConvidados) * 100)
    : 0;

  const taxaCriancas = totalConvidados
    ? Math.round((criancas / totalConvidados) * 100)
    : 0;

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

  const statusPagoPresente = (status: any) => {
    const normalized = normalizeText(status);
    return (
      normalized === "pago" ||
      normalized === "paid" ||
      normalized === "confirmado" ||
      normalized === "aprovado" ||
      normalized === "sucesso" ||
      normalized === "concluido" ||
      normalized === "concluido" ||
      normalized === "completed"
    );
  };

  const statusPendentePresente = (status: any) => {
    const normalized = normalizeText(status);
    return (
      !normalized ||
      normalized === "pendente" ||
      normalized === "aguardando" ||
      normalized === "reservado" ||
      normalized === "pending"
    );
  };

  const pagamentosConfirmados = giftPayments.filter((p: any) =>
    statusPagoPresente(p.status),
  );

  const reservasComValor = giftReservations.filter(
    (p: any) => Number(p.valor_presenteado || 0) > 0,
  );

  const presentesPendentes = giftReservations.filter(
    (p: any) =>
      Number(p.valor_presenteado || 0) <= 0 && statusPendentePresente(p.status),
  );

  const presentesPagos = reservasComValor;

  const valorTotalPresentes = reservasComValor.reduce(
    (acc: number, item: any) => acc + Number(item.valor_presenteado || 0),
    0,
  );

  const ticketMedioPresentes = presentesPagos.length
    ? valorTotalPresentes / presentesPagos.length
    : 0;

  const rankingPresentes = [...giftReservations]
    .filter((item: any) => Number(item.valor_presenteado || 0) > 0)
    .sort(
      (a: any, b: any) =>
        Number(b.valor_presenteado || 0) - Number(a.valor_presenteado || 0),
    )
    .slice(0, 5);

  const ultimosPresentes = [...giftReservations]
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8);

  const totalReservasPresentes = giftReservations.length;
  const totalItensPresentesAtivos = giftItems.filter(
    (item: any) => item.ativo !== false,
  ).length;

  const taxaPresentes = confirmados
    ? Math.round((presentesPagos.length / confirmados) * 100)
    : 0;

  const maiorPresenteValor = rankingPresentes[0]
    ? Number(rankingPresentes[0].valor_presenteado || 0)
    : 0;

  const ultimoPresente = ultimosPresentes[0];

  const giftItemMap = new Map(
    giftItems.map((item: any) => [String(item.id), item.nome || "Presente"]),
  );

  const rankingItensMap = new Map();

  giftReservations.forEach((item: any) => {
    const nome = giftItemMap.get(String(item.gift_item_id)) || "Presente em valor";
    const valorPresente = Number(item.valor_presenteado || 0);

    if (valorPresente <= 0) return;

    const atual = rankingItensMap.get(nome) || {
      id: nome,
      nome,
      presente: nome,
      quantidade: 0,
      valor: 0,
    };

    atual.quantidade += 1;
    atual.valor += valorPresente;

    rankingItensMap.set(nome, atual);
  });

  const rankingItensPresentes = Array.from(rankingItensMap.values())
    .sort((a: any, b: any) => b.valor - a.valor)
    .slice(0, 10);

  const rankingPresenteadoresMap = new Map();

  giftReservations.forEach((item: any) => {
    const nome = String(item.nome_presenteador || "Convidado").trim() || "Convidado";
    const nomePresente = giftItemMap.get(String(item.gift_item_id)) || "Presente em valor";
    const valorPresente = Number(item.valor_presenteado || 0);

    if (valorPresente <= 0) return;

    const atual = rankingPresenteadoresMap.get(nome) || {
      id: nome,
      nome,
      presentes: new Set<string>(),
      quantidade: 0,
      valor: 0,
    };

    atual.quantidade += 1;
    atual.valor += valorPresente;
    atual.presentes.add(nomePresente);

    rankingPresenteadoresMap.set(nome, atual);
  });

  const rankingPresenteadores = Array.from(rankingPresenteadoresMap.values())
    .map((item: any) => ({
      id: item.id,
      nome: item.nome,
      presente: Array.from(item.presentes).join(", "),
      quantidade: item.quantidade,
      valor: item.valor,
    }))
    .sort((a: any, b: any) => b.valor - a.valor)
    .slice(0, 10);

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

  const inicioEvento =
    makeBrazilDateTime(eventoAtual?.data_inicio || eventoAtual?.data_evento, eventoAtual?.hora_inicio) ||
    (primeiraEntrada?.data_checkin ? getSlot30StartBR(primeiraEntrada.data_checkin) : null);

  let fimEvento =
    makeBrazilDateTime(
      eventoAtual?.data_termino || eventoAtual?.data_evento || eventoAtual?.data_inicio,
      eventoAtual?.hora_termino,
    ) ||
    (ultimaEntrada?.data_checkin ? getSlot30StartBR(ultimaEntrada.data_checkin) : null);

  if (inicioEvento && fimEvento && fimEvento.getTime() <= inicioEvento.getTime()) {
    fimEvento = new Date(fimEvento.getTime() + 24 * 60 * 60 * 1000);
  }

  const inicioMovimento = inicioEvento ? floor30(inicioEvento) : null;
  const fimMovimento = fimEvento ? ceil30(fimEvento) : null;

  const movimentoMap = new Map<number, number>();

  if (inicioMovimento && fimMovimento) {
    for (
      let atual = new Date(inicioMovimento);
      atual.getTime() < fimMovimento.getTime();
      atual = new Date(atual.getTime() + 30 * 60 * 1000)
    ) {
      movimentoMap.set(atual.getTime(), 0);
    }
  }

  for (const convidado of entradasComData) {
    const slot = getSlot30StartBR(convidado.data_checkin);
    if (!slot) continue;

    const key = slot.getTime();
    movimentoMap.set(key, (movimentoMap.get(key) || 0) + 1);
  }

  const movimentoPorIntervalo = Array.from(movimentoMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, total]) => ({
      time,
      intervalo: formatIntervalo30BR(new Date(time)),
      total,
    }));

  const picoEntrada = movimentoPorIntervalo
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)[0];

  const horaPico = picoEntrada ? picoEntrada.intervalo : "-";
  const quantidadePico = picoEntrada ? picoEntrada.total : 0;

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
          className="relatorios-composicao-section"
          style={{
            marginBottom: 34,
          }}
        >
          <div
            className="relatorios-composicao-card"
            style={{
              gridColumn: "1 / -1",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 34,
              padding: 34,
              boxShadow: "0 18px 42px rgba(15,23,42,.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.15fr) minmax(260px, .85fr)",
                gap: 28,
                alignItems: "stretch",
              }}
              className="relatorios-composicao-hero"
            >
              <div>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 22,
                    background: "#ede9fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 999,
                      background: "#6d28d9",
                    }}
                  />
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#6d28d9",
                    fontSize: 12,
                    fontWeight: 950,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                  }}
                >
                  Composição
                </p>

                <h3
                  style={{
                    margin: "10px 0 0",
                    color: "#0f172a",
                    fontSize: "clamp(34px, 4vw, 50px)",
                    lineHeight: 0.96,
                    letterSpacing: "-.07em",
                    fontWeight: 950,
                  }}
                >
                  Composição do evento
                </h3>

                <p
                  style={{
                    margin: "16px 0 0",
                    color: "#64748b",
                    fontSize: 18,
                    lineHeight: 1.45,
                    maxWidth: 680,
                  }}
                >
                  Leitura executiva dos cartões, responsáveis, grupos/famílias, tokens e comunicação.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 22,
                  }}
                >
                  {[
                    `${taxaCartoesComToken}% com token`,
                    `${taxaComunicacao}% recebem comunicação`,
                    `${gruposFamilias} grupos/famílias`,
                  ].map((item) => (
                    <span
                      key={item}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 999,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        padding: "9px 13px",
                        color: "#64748b",
                        fontSize: 13,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 30,
                  padding: 24,
                  background: "#fff",
                  color: "#0f172a",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 18px 42px rgba(15,23,42,.06)",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: 260,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 180,
                    height: 180,
                    borderRadius: 999,
                    background: "rgba(124,58,237,.06)",
                    right: -60,
                    top: -70,
                  }}
                />

                <div style={{ position: "relative", zIndex: 1 }}>
                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 950,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Cartões ativos
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 14,
                      color: "#0f172a",
                      fontSize: 58,
                      lineHeight: .9,
                      letterSpacing: "-.07em",
                      fontWeight: 950,
                    }}
                  >
                    {cartoesComToken}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: 10,
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    de {totalConvidados} convidados com token
                  </span>
                </div>

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    marginTop: 22,
                  }}
                >
                  <div
                    style={{
                      height: 12,
                      borderRadius: 999,
                      background: "#e8eef6",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${taxaCartoesComToken}%`,
                        height: "100%",
                        borderRadius: 999,
                        background:
                          "linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginTop: 18,
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: "#0f172a",
                          fontSize: 22,
                          fontWeight: 950,
                        }}
                      >
                        {contatosPrincipais}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: "#64748b",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        contatos principais
                      </span>
                    </div>

                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: "#0f172a",
                          fontSize: 22,
                          fontWeight: 950,
                        }}
                      >
                        {mediaConvidadosPorContato}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: "#64748b",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        média por contato
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relatorios-composicao-kpis"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 14,
                marginTop: 26,
              }}
            >
              {[
                { value: totalConvidados, label: "Total convidados", hint: "base geral do evento", color: "#0f172a", soft: "#f8fafc" },
                { value: adultos, label: "Adultos", hint: `${taxaAdultos}% da lista`, color: "#334155", soft: "#f8fafc" },
                { value: criancas, label: "Crianças", hint: `${taxaCriancas}% da lista`, color: "#6d28d9", soft: "#f5f3ff" },
                { value: criancasDesacompanhadas, label: "Crianças desacompanhadas", hint: "via responsável", color: "#db2777", soft: "#fdf2f8" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 24,
                    background: item.soft,
                    border: "1px solid #e2e8f0",
                    padding: 20,
                    minHeight: 134,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: item.color,
                      fontSize: 38,
                      lineHeight: 1,
                      fontWeight: 950,
                      letterSpacing: "-.06em",
                    }}
                  >
                    {item.value}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: 12,
                      color: "#0f172a",
                      fontSize: 15,
                      lineHeight: 1.2,
                      fontWeight: 900,
                    }}
                  >
                    {item.label}
                  </span>

                  <small
                    style={{
                      display: "block",
                      marginTop: 6,
                      color: "#64748b",
                      fontSize: 12,
                      lineHeight: 1.25,
                      fontWeight: 800,
                    }}
                  >
                    {item.hint}
                  </small>
                </div>
              ))}
            </div>

            <div
              className="relatorios-composicao-groups"
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              <div
                style={{
                  borderRadius: 28,
                  background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
                  border: "1px solid #e2e8f0",
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: "#0f172a",
                      fontSize: 20,
                      lineHeight: 1.05,
                      letterSpacing: "-.04em",
                      fontWeight: 950,
                    }}
                  >
                    Cartões e grupos
                  </strong>

                  <span
                    style={{
                      borderRadius: 999,
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      padding: "7px 10px",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {gruposFamilias} grupos
                  </span>
                </div>

                <div
                  className="relatorios-composicao-subgrid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: 14,
                  }}
                >
                  {[
                    { value: convitesIndividuais, label: "convites individuais" },
                    { value: convidadosEmGrupo, label: "convidados em grupo" },
                    { value: adultosEmGrupo, label: "adultos em grupo" },
                    { value: criancasEmGrupo, label: "crianças em grupo" },
                    { value: cartoesComToken, label: "cartões com token" },
                    { value: cartoesSemToken, label: "sem token" },
                  ].map((item) => (
                    <div key={item.label}>
                      <strong
                        style={{
                          display: "block",
                          color: "#64748b",
                          fontSize: 24,
                          lineHeight: 1,
                          fontWeight: 950,
                          letterSpacing: "-.04em",
                        }}
                      >
                        {item.value}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: 6,
                          color: "#64748b",
                          fontSize: 12,
                          lineHeight: 1.25,
                          fontWeight: 850,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 28,
                  background: "linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)",
                  border: "1px solid #e2e8f0",
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: "#0f172a",
                      fontSize: 20,
                      lineHeight: 1.05,
                      letterSpacing: "-.04em",
                      fontWeight: 950,
                    }}
                  >
                    Comunicação
                  </strong>

                  <span
                    style={{
                      borderRadius: 999,
                      background: "#fff",
                      border: "1px solid #dcfce7",
                      padding: "7px 10px",
                      color: "#166534",
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {taxaComunicacao}% cobertura
                  </span>
                </div>

                <div
                  className="relatorios-composicao-subgrid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: 14,
                  }}
                >
                  {[
                    { value: recebemComunicacao, label: "recebem comunicação" },
                    { value: naoRecebemComunicacao, label: "não recebem" },
                    { value: contatosPrincipais, label: "contatos principais" },
                    { value: mediaConvidadosPorContato, label: "média por contato" },
                  ].map((item) => (
                    <div key={item.label}>
                      <strong
                        style={{
                          display: "block",
                          color: "#64748b",
                          fontSize: 24,
                          lineHeight: 1,
                          fontWeight: 950,
                          letterSpacing: "-.04em",
                        }}
                      >
                        {item.value}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: 6,
                          color: "#64748b",
                          fontSize: 12,
                          lineHeight: 1.25,
                          fontWeight: 850,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
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
            title="Pico de entrada"
            subtitle="Movimento por horário"
            color="#16a34a"
            soft="#dcfce7"
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <strong
                style={{
                  display: "block",
                  color: "#0f172a",
                  fontSize: 24,
                  lineHeight: 1.12,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                Pico: {horaPico}
              </strong>

              <span
                style={{
                  display: "inline-flex",
                  borderRadius: 999,
                  padding: "8px 12px",
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {quantidadePico} entradas no intervalo de pico
              </span>
            </div>

            <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10 }}>
              {movimentoPorIntervalo.length ? (
                movimentoPorIntervalo.map((item) => {
                  const isPico = item.intervalo === horaPico;

                  return (
                    <div
                      key={item.time}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "118px 1fr 44px",
                        gap: 12,
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 14,
                        background: isPico ? "#dcfce7" : "#f8fafc",
                        border: isPico ? "1px solid #86efac" : "1px solid #e2e8f0",
                      }}
                    >
                      <strong
                        style={{
                          color: isPico ? "#166534" : "#64748b",
                          fontSize: 12,
                          lineHeight: 1.15,
                          fontWeight: 900,
                        }}
                      >
                        {item.intervalo}
                      </strong>

                      <div
                        style={{
                          height: 9,
                          borderRadius: 999,
                          background: "#e2e8f0",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${quantidadePico ? Math.round((item.total / quantidadePico) * 100) : 0}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: isPico ? "#16a34a" : "#94a3b8",
                          }}
                        />
                      </div>

                      <strong
                        style={{
                          textAlign: "right",
                          color: isPico ? "#166534" : "#64748b",
                          fontSize: 14,
                          fontWeight: 900,
                        }}
                      >
                        {item.total}
                      </strong>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  Nenhuma entrada com horário registrado.
                </div>
              )}
            </div>

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
          className="relatorios-main-grid"
          style={{
            marginTop: 34,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
            gap: 26,
          }}
        >
          <BigProgressCard
            title="Presentes"
            subtitle="Performance da lista de presentes"
            percent={taxaPresentes}
            color="#16a34a"
            footer={`${presentesPagos.length} presente(s) confirmado(s)`}
          >
            <Metric
              value={formatCurrencyBR(valorTotalPresentes)}
              label="total arrecadado"
            />
            <Metric value={presentesPagos.length} label="presentes pagos" />
            <Metric value={totalReservasPresentes} label="reservas" />
            <Metric
              value={formatCurrencyBR(ticketMedioPresentes)}
              label="ticket médio"
            />
            <Metric value={totalItensPresentesAtivos} label="itens ativos" />
            <Metric value={presentesPendentes.length} label="pendentes" />
            <Metric
              value={formatCurrencyBR(maiorPresenteValor)}
              label="maior presente"
            />
            <Metric
              value={
                ultimoPresente
                  ? formatDateTimeBR(ultimoPresente.created_at)
                  : "-"
              }
              label="último presente"
            />
            <Metric value={`${taxaPresentes}%`} label="conversão presentes" />
          </BigProgressCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 22,
            }}
          >
            <details
              className="relatorios-ranking-card"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 30,
                padding: 28,
                boxShadow: "0 18px 42px rgba(15,23,42,.06)",
              }}
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 18,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: 26,
                      lineHeight: 1,
                      letterSpacing: "-.04em",
                      fontWeight: 900,
                    }}
                  >
                    Ranking de presentes recebidos
                  </h3>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: "#64748b",
                      fontSize: 15,
                      lineHeight: 1.35,
                      fontWeight: 700,
                    }}
                  >
                    10 presentes com maior valor informado
                  </p>
                </div>

                <span
                  className="relatorios-ranking-arrow"
                  aria-hidden="true"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  ↓
                </span>
              </summary>

              <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
                {rankingItensPresentes.length ? (
                  rankingItensPresentes.map((item: any, index: number) => (
                    <div
                      key={item.id}
                      className={index > 1 ? "relatorios-ranking-extra" : undefined}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "42px 1fr auto",
                        gap: 14,
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: 18,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          background:
                            index === 0
                              ? "#fef3c7"
                              : index === 1
                                ? "#e2e8f0"
                                : index === 2
                                  ? "#fed7aa"
                                  : "#ede9fe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#0f172a",
                          fontWeight: 900,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div>
                        <strong
                          style={{
                            display: "block",
                            color: "#0f172a",
                            fontSize: 14,
                            lineHeight: 1.25,
                            fontWeight: 900,
                          }}
                        >
                          {item.nome}
                        </strong>

                        {item.presente && (
                          <small
                            style={{
                              display: "block",
                              marginTop: 4,
                              color: "#64748b",
                              fontSize: 12,
                              lineHeight: 1.3,
                              fontWeight: 800,
                            }}
                          >
                            {item.presente}
                          </small>
                        )}

                        <small
                          style={{
                            display: "block",
                            marginTop: 4,
                            color: "#64748b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {item.quantidade} presente(s)
                        </small>
                      </div>

                      <strong
                        style={{
                          color: "#16a34a",
                          fontSize: 14,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrencyBR(item.valor)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 18,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    Nenhum presente recebido encontrado.
                  </div>
                )}
              </div>
            </details>

            <details
              className="relatorios-ranking-card"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 30,
                padding: 28,
                boxShadow: "0 18px 42px rgba(15,23,42,.06)",
              }}
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 18,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: 26,
                      lineHeight: 1,
                      letterSpacing: "-.04em",
                      fontWeight: 900,
                    }}
                  >
                    Ranking de presenteadores
                  </h3>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: "#64748b",
                      fontSize: 15,
                      lineHeight: 1.35,
                      fontWeight: 700,
                    }}
                  >
                    10 convidados que mais presentearam por valor
                  </p>
                </div>

                <span
                  className="relatorios-ranking-arrow"
                  aria-hidden="true"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  ↓
                </span>
              </summary>

              <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
                {rankingPresenteadores.length ? (
                  rankingPresenteadores.map((item: any, index: number) => (
                    <div
                      key={item.nome}
                      className={index > 1 ? "relatorios-ranking-extra" : undefined}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "42px 1fr auto",
                        gap: 14,
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: 18,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          background:
                            index === 0
                              ? "#dcfce7"
                              : index === 1
                                ? "#dbeafe"
                                : index === 2
                                  ? "#fef3c7"
                                  : "#ede9fe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: index === 0 ? "#166534" : "#0f172a",
                          fontWeight: 900,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div>
                        <strong
                          style={{
                            display: "block",
                            color: "#0f172a",
                            fontSize: 14,
                            lineHeight: 1.25,
                            fontWeight: 900,
                          }}
                        >
                          {item.nome}
                        </strong>

                        {item.presente && (
                          <small
                            style={{
                              display: "block",
                              marginTop: 4,
                              color: "#64748b",
                              fontSize: 12,
                              lineHeight: 1.3,
                              fontWeight: 800,
                            }}
                          >
                            {item.presente}
                          </small>
                        )}

                        <small
                          style={{
                            display: "block",
                            marginTop: 4,
                            color: "#64748b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {item.quantidade} presente(s)
                        </small>
                      </div>

                      <strong
                        style={{
                          color: "#16a34a",
                          fontSize: 14,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrencyBR(item.valor)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 18,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    Nenhum presenteador encontrado.
                  </div>
                )}
              </div>
            </details>
          </div>        </section>

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

        .relatorios-ranking-card > summary::-webkit-details-marker {
          display: none;
        }

        .relatorios-ranking-card .relatorios-ranking-extra {
          display: none !important;
        }

        .relatorios-ranking-card[open] .relatorios-ranking-extra {
          display: grid !important;
        }

        .relatorios-ranking-card[open] .relatorios-ranking-arrow {
          transform: rotate(180deg);
        }

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

          .relatorios-presentes-grid {
            grid-template-columns: 1fr !important;
          }

          .relatorios-composicao-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .relatorios-composicao-groups,
          .relatorios-composicao-subgrid {
            grid-template-columns: 1fr !important;
          }

          .relatorios-checkins table {
            min-width: 720px;
          }
        }


          .relatorios-composicao-kpis {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .relatorios-composicao-groups {
            grid-template-columns: 1fr 1fr;
          }

          .relatorios-composicao-subgrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
