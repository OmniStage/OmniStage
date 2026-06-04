import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CartaoActions from "./CartaoActions";
import CartaoSaveMode from "./CartaoSaveMode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ save?: string; preview?: string }>;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-BR");
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const text = String(value).trim();
  if (!text) return "";

  const match = text.match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  return text;
}

export default async function CartaoPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const query = searchParams ? await searchParams : {};
  const isSaveMode = query.save === "1";
  const isPreviewMode = query.preview === "1";

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
  const horario = formatTime(evento.hora_inicio || evento.horario || "");

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
    evento.usar_card_background_personalizado && evento.card_background_url
      ? evento.card_background_url
      : evento.background_url || evento.background_image || "";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
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

  const conviteEhNucleo = ["grupo", "nucleo"].includes(
    String(convidado.tipo_convite || "").trim().toLowerCase(),
  );

  const isGrupoPrincipal =
    conviteEhNucleo &&
    Boolean(convidado.grupo) &&
    (convidado.contato_principal === true ||
      convidado.recebe_convite === true ||
      Boolean(convidado.responsavel_telefone));

  const deveBuscarGrupo =
    conviteEhNucleo && Boolean(convidado.grupo) && !isSaveMode;

  const { data: integrantesGrupo } = deveBuscarGrupo
    ? await supabase
        .from("convidados")
        .select("id, nome, telefone, responsavel_telefone, token")
        .eq("evento_id", convidado.evento_id)
        .eq("grupo", convidado.grupo)
        .order("nome", { ascending: true })
    : { data: [] };

  const grupoParaEnvio = (integrantesGrupo || []).map((integrante: any) => ({
    id: integrante.id,
    nome: integrante.nome || "Convidado",
    telefone: integrante.telefone || integrante.responsavel_telefone || null,
    token: integrante.token || null,
  }));

  const grupoComToken = grupoParaEnvio.filter((item) => Boolean(item.token));
  const indiceAtual = grupoComToken.findIndex((item) => item.token === token);
  const totalGrupo = grupoComToken.length;
  const convidadoAnterior =
    indiceAtual > 0 ? grupoComToken[indiceAtual - 1] : null;
  const proximoConvidado =
    indiceAtual >= 0 && indiceAtual < totalGrupo - 1
      ? grupoComToken[indiceAtual + 1]
      : null;

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
        padding: isPreviewMode ? "12px 12px 24px" : "22px 16px 34px",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(180deg, #020814 0%, #071832 52%, #020814 100%)",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: isPreviewMode ? 520 : 440,
          borderRadius: 30,
          padding: isPreviewMode ? "22px 18px 22px" : "26px 22px 24px",
          border: "1px solid rgba(255,255,255,.14)",
          background: backgroundUrl
            ? `url("${backgroundUrl}") center top / cover no-repeat, linear-gradient(180deg,#04142f,#020814)`
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
          {isPreviewMode ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <a
                href={`/cartao/${encodeURIComponent(token)}`}
                style={{
                  borderRadius: 999,
                  padding: "9px 12px",
                  background: "rgba(255,255,255,.10)",
                  border: "1px solid rgba(255,255,255,.14)",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                ← Voltar
              </a>

              {totalGrupo > 1 ? (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "rgba(255,255,255,.78)",
                  }}
                >
                  {indiceAtual + 1} de {totalGrupo}
                </span>
              ) : null}
            </div>
          ) : null}

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
            {isPreviewMode ? "Modo Check-in" : "Cartão de Entrada"}
          </div>

          {logoUrl ? (
            <img
              src={logoUrl}
              alt={nomeEvento}
              style={{
                width: "100%",
                maxWidth: isPreviewMode ? 280 : 330,
                maxHeight: isPreviewMode ? 100 : 130,
                objectFit: "contain",
                marginBottom: 10,
              }}
            />
          ) : (
            <h1
              style={{
                margin: 0,
                fontFamily: "Georgia, serif",
                fontSize: isPreviewMode ? 32 : 38,
                lineHeight: 1,
                color: "#f8fafc",
              }}
            >
              {nomeEvento}
            </h1>
          )}

          {!isPreviewMode ? (
            <p
              style={{
                color: "#d7b56d",
                fontSize: 14,
                marginTop: 10,
              }}
            >
              Apresente este QR Code na entrada do evento
            </p>
          ) : null}

          <div
            style={{
              marginTop: isPreviewMode ? 12 : 20,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(2,8,24,.12)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              borderRadius: 24,
              padding: isPreviewMode ? "16px 14px 18px" : "18px 16px 20px",
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
                fontSize: isPreviewMode ? 34 : 29,
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
              <strong style={{ color: "#d7b56d" }}>TOKEN</strong>
              <span>{token}</span>
            </div>

            <div
              style={{
                margin: isPreviewMode ? "18px auto 10px" : "22px auto 14px",
                width: isPreviewMode ? "min(100%, 320px)" : "min(100%, 300px)",
                aspectRatio: "1 / 1",
                padding: isPreviewMode ? 12 : 14,
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

            {!isPreviewMode ? (
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
            ) : null}

            <div
              style={{
                marginTop: isPreviewMode ? 12 : 18,
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

              <strong style={{ display: "block", fontSize: 15 }}>
                {nomeEvento}
              </strong>

              <strong
                style={{
                  display: "block",
                  fontSize: 15,
                  marginTop: 4,
                }}
              >
                {[dataEvento, horario].filter(Boolean).join(" • ")}
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

              {endereco && !isPreviewMode ? (
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

            {isPreviewMode && totalGrupo > 1 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {convidadoAnterior?.token ? (
                  <a
                    href={`/cartao/${encodeURIComponent(
                      convidadoAnterior.token,
                    )}?preview=1`}
                    style={{
                      borderRadius: 999,
                      padding: "12px 14px",
                      background: "rgba(255,255,255,.10)",
                      border: "1px solid rgba(255,255,255,.14)",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    Anterior
                  </a>
                ) : (
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "12px 14px",
                      background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.08)",
                      color: "rgba(255,255,255,.35)",
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    Anterior
                  </span>
                )}

                {proximoConvidado?.token ? (
                  <a
                    href={`/cartao/${encodeURIComponent(
                      proximoConvidado.token,
                    )}?preview=1`}
                    style={{
                      borderRadius: 999,
                      padding: "12px 14px",
                      background: "linear-gradient(180deg, #25D366, #128C7E)",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    Próximo
                  </a>
                ) : (
                  <a
                    href={`/cartao/${encodeURIComponent(token)}`}
                    style={{
                      borderRadius: 999,
                      padding: "12px 14px",
                      background: "linear-gradient(180deg, #e1c178, #cfa958)",
                      color: "#0d1d3d",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    Finalizar
                  </a>
                )}
              </div>
            ) : null}

            {!isPreviewMode ? (
              <CartaoActions
                whatsappUrl={whatsappUrl}
                isGrupoPrincipal={isGrupoPrincipal}
                grupoNome={convidado.grupo}
                integrantesGrupo={grupoParaEnvio}
                nomeEvento={nomeEvento}
                siteUrl={siteUrl}
              />
            ) : null}
          </div>

          <footer
            style={{
              marginTop: 18,
              color: "rgba(255,255,255,.72)",
              fontSize: 13,
            }}
          >
            {convidado.checkin_realizado || convidado.status_checkin === "entrou"
              ? "Check-in já realizado"
              : isPreviewMode
                ? "Aponte o leitor para o QR Code"
                : "Cartão válido para entrada"}
          </footer>
        </div>
      </section>
    </main>
  );
}
