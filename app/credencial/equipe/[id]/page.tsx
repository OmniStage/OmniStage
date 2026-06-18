import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatHorario(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatData(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function CredencialEquipePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: membro, error } = await supabase
    .from("organizacao_equipe")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !membro) notFound();

  const { data: evento } = await supabase
    .from("eventos")
    .select("nome, data_evento, hora_inicio, nome_local, local, logo_url")
    .eq("id", membro.evento_id)
    .maybeSingle();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://app.omnistageproducoes.com.br";

  const credencialUrl = `${siteUrl}/credencial/equipe/${id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(credencialUrl)}`;

  const horarioInicio = formatHorario(membro.horario_inicio);
  const horarioFim = formatHorario(membro.horario_fim);
  const horarioLabel =
    horarioInicio && horarioFim
      ? `${horarioInicio} – ${horarioFim}`
      : horarioInicio || null;

  const dataEvento = evento?.data_evento ? formatData(evento.data_evento + "T00:00:00") : null;
  const nomeEvento = evento?.nome || "Evento";
  const localEvento = evento?.nome_local || evento?.local || null;
  const logoUrl = evento?.logo_url || null;

  const statusColor: Record<string, string> = {
    confirmado: "#22c55e",
    pendente: "#f59e0b",
    cancelado: "#ef4444",
  };
  const statusLabel: Record<string, string> = {
    confirmado: "Confirmado",
    pendente: "Pendente",
    cancelado: "Cancelado",
  };
  const cor = statusColor[membro.status] || "#64748b";
  const label = statusLabel[membro.status] || membro.status;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "22px 16px 40px",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #020814 0%, #071832 52%, #020814 100%)",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 30,
          padding: "28px 22px 26px",
          border: "1px solid rgba(255,255,255,.14)",
          background: "linear-gradient(180deg,#04142f,#020814)",
          boxShadow: "0 26px 70px rgba(0,0,0,.42)",
          textAlign: "center",
        }}
      >
        {/* Header label */}
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".18em",
            color: "rgba(255,255,255,.62)",
            marginBottom: 14,
            fontWeight: 800,
          }}
        >
          Credencial de Equipe
        </div>

        {/* Event logo or name */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={nomeEvento}
            style={{
              width: "100%",
              maxWidth: 320,
              maxHeight: 120,
              objectFit: "contain",
              marginBottom: 12,
            }}
          />
        ) : (
          <h1
            style={{
              margin: "0 0 12px",
              fontFamily: "Georgia, serif",
              fontSize: 30,
              lineHeight: 1.1,
              color: "#f8fafc",
            }}
          >
            {nomeEvento}
          </h1>
        )}

        {/* Member card */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,.18)",
            background: "rgba(2,8,24,.18)",
            backdropFilter: "blur(10px)",
            borderRadius: 24,
            padding: "20px 18px 22px",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1e40af, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              margin: "0 auto 14px",
              color: "#fff",
              letterSpacing: "-.02em",
            }}
          >
            {membro.nome.charAt(0).toUpperCase()}
          </div>

          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".14em",
              color: "rgba(255,255,255,.60)",
              marginBottom: 4,
              fontWeight: 800,
            }}
          >
            {membro.funcao || "Equipe"}
          </div>

          <h2
            style={{
              margin: "0 0 10px",
              fontFamily: "Georgia, serif",
              fontSize: 26,
              lineHeight: 1.12,
              color: "#ffffff",
            }}
          >
            {membro.nome}
          </h2>

          {/* Credential code */}
          {membro.codigo_credencial && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.10)",
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              <strong style={{ color: "#d7b56d" }}>Credencial</strong>
              <span style={{ letterSpacing: ".12em", fontWeight: 700 }}>
                {membro.codigo_credencial}
              </span>
            </div>
          )}

          {/* Status badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: 999,
              background: `${cor}22`,
              border: `1px solid ${cor}55`,
              color: cor,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 18,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: cor, display: "inline-block" }} />
            {label}
          </div>

          {/* QR Code */}
          <div
            style={{
              margin: "0 auto 16px",
              width: "min(100%, 260px)",
              aspectRatio: "1 / 1",
              padding: 12,
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 14px 34px rgba(0,0,0,.28)",
            }}
          >
            <img
              src={qrUrl}
              alt={`QR Code de ${membro.nome}`}
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }}
            />
          </div>

          {/* Event info */}
          <div
            style={{
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.045)",
              borderRadius: 14,
              padding: "12px 14px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                color: "rgba(255,255,255,.52)",
                marginBottom: 8,
                fontWeight: 800,
              }}
            >
              Informações do Evento
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {dataEvento && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,.60)" }}>Data</span>
                  <strong style={{ color: "#f8fafc" }}>{dataEvento}</strong>
                </div>
              )}
              {localEvento && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,.60)" }}>Local</span>
                  <strong style={{ color: "#f8fafc" }}>{localEvento}</strong>
                </div>
              )}
              {horarioLabel && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,.60)" }}>Horário</span>
                  <strong style={{ color: "#d7b56d" }}>{horarioLabel}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer
          style={{
            marginTop: 18,
            color: "rgba(255,255,255,.52)",
            fontSize: 12,
          }}
        >
          Credencial válida apenas para membros credenciados
        </footer>
      </section>
    </main>
  );
}
