import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CartaoActions from "./CartaoActions";
import CartaoSaveMode from "./CartaoSaveMode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ save?: string }>;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-BR");
}

export default async function CartaoPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const query = searchParams ? await searchParams : {};
  const isSaveMode = query.save === "1";

  const supabase = await createClient();

  const { data: convidado, error: convidadoError } = await supabase
    .from("convidados")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (convidadoError || !convidado) notFound();

  const { data: evento, error: eventoError } = await supabase
    .from("eventos")
    .select("*")
    .eq("id", convidado.evento_id)
    .maybeSingle();

  if (eventoError || !evento) notFound();

  const nomeConvidado = convidado.nome || "Convidado";
  const nomeEvento = evento.nome || "Evento";

  const dataEvento = formatDate(evento.data_evento);
  const horario = evento.horario || evento.hora_inicio || "";

  const local =
    evento.nome_local ||
    evento.local ||
    [evento.cidade, evento.estado].filter(Boolean).join(" • ");

  const endereco =
    evento.endereco ||
    [evento.rua, evento.numero, evento.bairro, evento.cidade, evento.estado]
      .filter(Boolean)
      .join(", ");

  const logoUrl = evento.logo_url || evento.logo_image || "";

  const backgroundUrl =
    evento.background_url || evento.background_image || "";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(
    token,
  )}`;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://app.omnistageproducoes.com.br";

  const cartaoUrl = `${siteUrl}/cartao/${encodeURIComponent(token)}`;

  const telefone = String(
    convidado.telefone || convidado.responsavel_telefone || "",
  ).replace(/\D/g, "");

  const mensagemWhatsApp = encodeURIComponent(
    `Olá ${nomeConvidado} ✨\n\nSegue seu cartão de entrada para o evento ${nomeEvento}:\n\n${cartaoUrl}\n\nApresente o QR Code na entrada do evento.`,
  );

  const whatsappUrl = telefone
    ? `https://wa.me/${telefone}?text=${mensagemWhatsApp}`
    : `https://wa.me/?text=${mensagemWhatsApp}`;

  const isGrupoPrincipal =
    Boolean(convidado.grupo) &&
    (convidado.contato_principal === true ||
      convidado.recebe_convite === true ||
      Boolean(convidado.responsavel_telefone));

  const { data: integrantesGrupo } =
    isGrupoPrincipal && !isSaveMode
      ? await supabase
          .from("convidados")
          .select("id, nome, telefone, responsavel_telefone, token")
          .eq("evento_id", convidado.evento_id)
          .eq("grupo", convidado.grupo)
          .order("nome", { ascending: true })
      : { data: [] };

  const grupoParaEnvio = (integrantesGrupo || []).map(
    (integrante: any) => ({
      id: integrante.id,
      nome: integrante.nome || "Convidado",
      telefone:
        integrante.telefone ||
        integrante.responsavel_telefone ||
        null,
      token: integrante.token || null,
    }),
  );

  if (isSaveMode) {
    return (
      <CartaoSaveMode
        nomeConvidado={nomeConvidado}
        nomeEvento={nomeEvento}
        token={token}
        qrUrl={qrUrl}
        logoUrl={logoUrl}
        backgroundUrl={backgroundUrl}
      />
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "22px 16px 34px",
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
          maxWidth: 440,
          borderRadius: 30,
          padding: "26px 22px 24px",
          border: "1px solid rgba(255,255,255,.14)",
          background: backgroundUrl
          ? `url("${backgroundUrl}") center top / contain no-repeat, linear-gradient(180deg,#04142f,#020814)`
          : "linear-gradient(180deg,#04142f,#020814)",
          boxShadow: "0 26px 70px rgba(0,0,0,.42)",
          textAlign: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "transparent",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".18em",
              color: "rgba(255,255,255,.72)",
              marginBottom: 10,
              fontWeight: 800,
            }}
          >
            Cartão de Entrada
          </div>

          {logoUrl ? (
            <img
              src={logoUrl}
              alt={nomeEvento}
              style={{
                width: "100%",
                maxWidth: 330,
                maxHeight: 130,
                objectFit: "contain",
                marginBottom: 10,
              }}
            />
          ) : (
            <h1
              style={{
                margin: 0,
                fontFamily: "Georgia, serif",
                fontSize: 38,
                lineHeight: 1,
                color: "#f8fafc",
              }}
            >
              {nomeEvento}
            </h1>
          )}

          <p
            style={{
              color: "#d7b56d",
              fontSize: 14,
              marginTop: 10,
            }}
          >
            Apresente este QR Code na entrada do evento
          </p>

          <div
            style={{
              marginTop: 20,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(2,8,24,.12)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(1px)",
              borderRadius: 24,
              padding: "18px 16px 20px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".16em",
                color: "rgba(255,255,255,.70)",
                marginBottom: 8,
                fontWeight: 800,
              }}
            >
              Convidado(a)
            </div>

            <h2
              style={{
                margin: 0,
                fontFamily: "Georgia, serif",
                fontSize: 29,
                lineHeight: 1.12,
                color: "#ffffff",
                textShadow: "0 2px 16px rgba(0,0,0,.45)",
              }}
            >
              {nomeConvidado}
            </h2>

            <div
              style={{
                marginTop: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.10)",
                fontSize: 13,
              }}
            >
              <strong style={{ color: "#d7b56d" }}>
                TOKEN
              </strong>

              <span>{token}</span>
            </div>

            <div
              style={{
                margin: "22px auto 14px",
                width: "min(100%, 300px)",
                aspectRatio: "1 / 1",
                padding: 14,
                background: "#fff",
                borderRadius: 24,
                boxShadow: "0 14px 34px rgba(0,0,0,.24)",
              }}
            >
              <img
                src={qrUrl}
                alt={`QR Code de ${nomeConvidado}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: 12,
                }}
              />
            </div>

            <p
              style={{
                color: "rgba(255,255,255,.74)",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              Guarde este cartão no seu WhatsApp e apresente o
              QR Code no totem de recepção para agilizar seu
              check-in.
            </p>

            <div
              style={{
                marginTop: 18,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.045)",
                borderRadius: 16,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  color: "rgba(255,255,255,.62)",
                  marginBottom: 6,
                  fontWeight: 800,
                }}
              >
                Evento
              </div>

              <strong
                style={{
                  display: "block",
                  fontSize: 15,
                }}
              >
                {nomeEvento}
              </strong>

              <strong
                style={{
                  display: "block",
                  fontSize: 15,
                  marginTop: 4,
                }}
              >
                {[dataEvento, horario]
                  .filter(Boolean)
                  .join(" • ")}
              </strong>

              <strong
                style={{
                  display: "block",
                  fontSize: 15,
                  marginTop: 4,
                }}
              >
                {local}
              </strong>

              {endereco ? (
                <small
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "rgba(255,255,255,.68)",
                    fontSize: 12,
                  }}
                >
                  {endereco}
                </small>
              ) : null}
            </div>

            <CartaoActions
              whatsappUrl={whatsappUrl}
              isGrupoPrincipal={isGrupoPrincipal}
              grupoNome={convidado.grupo}
              integrantesGrupo={grupoParaEnvio}
              nomeEvento={nomeEvento}
              siteUrl={siteUrl}
            />
          </div>

          <footer
            style={{
              marginTop: 18,
              color: "rgba(255,255,255,.72)",
              fontSize: 13,
            }}
          >
            {convidado.checkin_realizado ||
            convidado.status_checkin === "entrou"
              ? "Check-in já realizado"
              : "Cartão válido para entrada"}
          </footer>
        </div>
      </section>
    </main>
  );
}
