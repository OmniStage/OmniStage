import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;

    const supabase = await createClient();

    const { data: convidado } = await supabase
      .from("convidados")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!convidado) {
      return new Response("Convidado não encontrado", { status: 404 });
    }

    const { data: evento } = await supabase
      .from("eventos")
      .select("*")
      .eq("id", convidado.evento_id)
      .maybeSingle();

    if (!evento) {
      return new Response("Evento não encontrado", { status: 404 });
    }

    const nomeConvidado = convidado.nome || "Convidado";
    const nomeEvento = evento.nome || "Evento";

    const backgroundUrl =
      evento.usar_card_background_personalizado &&
      evento.card_background_url
        ? evento.card_background_url
        : evento.background_url || evento.background_image || "";

    const logoUrl =
      evento.logo_url ||
      evento.logo_image ||
      "";

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      token,
    )}`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            position: "relative",
            overflow: "hidden",
            background: "#020814",
            color: "#fff",
            fontFamily: "sans-serif",
          }}
        >
          {backgroundUrl ? (
            <img
              src={backgroundUrl}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(2,8,20,.92) 0%, rgba(2,8,20,.72) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              width: "100%",
              height: "100%",
              padding: "50px",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: "720px",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,.72)",
                  marginBottom: 18,
                }}
              >
                Cartão de Entrada
              </div>

              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={nomeEvento}
                  style={{
                    maxWidth: "420px",
                    maxHeight: "160px",
                    objectFit: "contain",
                    marginBottom: 24,
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 54,
                    fontWeight: 900,
                    marginBottom: 24,
                  }}
                >
                  {nomeEvento}
                </div>
              )}

              <div
                style={{
                  fontSize: 22,
                  color: "rgba(255,255,255,.72)",
                  marginBottom: 12,
                }}
              >
                Convidado(a)
              </div>

              <div
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  marginBottom: 22,
                }}
              >
                {nomeConvidado}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 18px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.14)",
                  width: "fit-content",
                }}
              >
                <span
                  style={{
                    color: "#d7b56d",
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  TOKEN
                </span>

                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {token}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "28px",
                  padding: "18px",
                  display: "flex",
                }}
              >
                <img
                  src={qrUrl}
                  alt="QR Code"
                  style={{
                    width: "260px",
                    height: "260px",
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,.76)",
                }}
              >
                Apresente este QR Code na entrada
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    return new Response("Erro ao gerar preview", {
      status: 500,
    });
  }
}
