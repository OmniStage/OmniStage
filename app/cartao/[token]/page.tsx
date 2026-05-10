import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-BR");
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export default async function CartaoPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: convidado, error } = await supabase
    .from("convidados")
    .select(
      `
      id,
      nome,
      telefone,
      token,
      grupo,
      evento_id,
      status_checkin,
      checkin_realizado,
      responsavel,
      responsavel_telefone,
      eventos (
        id,
        nome,
        data_evento,
        horario,
        local,
        endereco,
        nome_local,
        cidade,
        estado,
        logo_url,
        background_url,
        mapa_url
      )
    `
    )
    .eq("token", token)
    .single();

  if (error || !convidado) {
    notFound();
  }

  const evento: any = Array.isArray(convidado.eventos)
    ? convidado.eventos[0]
    : convidado.eventos;

  const nomeConvidado = convidado.nome || "Convidado";
  const nomeEvento = evento?.nome || "Evento";
  const dataEvento = formatDate(evento?.data_evento);
  const horario = evento?.horario || "";
  const local =
    evento?.nome_local ||
    evento?.local ||
    [evento?.cidade, evento?.estado].filter(Boolean).join(" • ");

  const endereco = evento?.endereco || "";
  const logoUrl = evento?.logo_url || "";
  const backgroundUrl = evento?.background_url || "";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://omnistage-six.vercel.app";

  const cardUrl = `${baseUrl}/cartao/${encodeURIComponent(token)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(
    token
  )}`;

  const telefone =
    onlyDigits(convidado.telefone) ||
    onlyDigits(convidado.responsavel_telefone);

  const mensagemWhatsApp = encodeURIComponent(
    `Cartão de entrada • ${nomeEvento}\n\nConvidado(a): ${nomeConvidado}\nToken: ${token}\n\nAbra seu cartão com QR Code:\n${cardUrl}`
  );

  const whatsappUrl = telefone
    ? `https://wa.me/${telefone}?text=${mensagemWhatsApp}`
    : `https://wa.me/?text=${mensagemWhatsApp}`;

  return (
    <main className="page">
      <section className="card">
        <div className="overlay" />

        <header className="top">
          <div className="eyebrow">Cartão de Entrada</div>

          {logoUrl ? (
            <img src={logoUrl} alt={nomeEvento} className="logo" />
          ) : (
            <h1>{nomeEvento}</h1>
          )}

          <p>Apresente este QR Code na entrada do evento</p>
        </header>

        <section className="frame">
          <div className="label">Convidado(a)</div>
          <h2>{nomeConvidado}</h2>

          <div className="token">
            <strong>Token</strong>
            <span>{token}</span>
          </div>

          <div className="qr">
            <img src={qrUrl} alt={`QR Code de ${nomeConvidado}`} />
          </div>

          <p className="instruction">
            Guarde este cartão no seu WhatsApp e apresente o QR Code no totem
            de recepção para agilizar seu check-in.
          </p>

          <div className="info">
            <div>
              <span>Evento</span>
              <strong>{nomeEvento}</strong>
            </div>

            <div>
              <span>Data e horário</span>
              <strong>
                {[dataEvento, horario].filter(Boolean).join(" • ")}
              </strong>
            </div>

            <div>
              <span>Local</span>
              <strong>{local}</strong>
              {endereco ? <small>{endereco}</small> : null}
            </div>
          </div>

          <div className="actions">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>

            {evento?.mapa_url ? (
              <a href={evento.mapa_url} target="_blank" rel="noopener noreferrer">
                Ver localização
              </a>
            ) : null}

            <button type="button" onClick={() => undefined}>
              Imprimir
            </button>
          </div>
        </section>

        <footer>
          {convidado.checkin_realizado || convidado.status_checkin === "entrou"
            ? "Check-in já realizado"
            : "Cartão válido para entrada"}
        </footer>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelectorAll("button").forEach((btn) => {
              if (btn.textContent.trim() === "Imprimir") {
                btn.addEventListener("click", () => window.print());
              }
            });
          `,
        }}
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .page {
          min-height: 100vh;
          padding: 22px 16px 34px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(180deg, rgba(2, 8, 20, .72), rgba(2, 8, 20, .96)),
            ${backgroundUrl ? `url("${backgroundUrl}") center/cover no-repeat` : "#020814"};
          color: white;
          font-family: Arial, Helvetica, sans-serif;
        }

        .card {
          width: 100%;
          max-width: 440px;
          position: relative;
          overflow: hidden;
          border-radius: 30px;
          padding: 26px 22px 24px;
          border: 1px solid rgba(255,255,255,.14);
          background:
            linear-gradient(180deg, rgba(5,16,40,.60), rgba(2,8,24,.92)),
            ${backgroundUrl ? `url("${backgroundUrl}") center/cover no-repeat` : "linear-gradient(180deg,#04142f,#020814)"};
          box-shadow: 0 26px 70px rgba(0,0,0,.42);
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(215,181,109,.24), transparent 42%);
          pointer-events: none;
        }

        .top,
        .frame,
        footer {
          position: relative;
          z-index: 1;
        }

        .top {
          text-align: center;
          margin-bottom: 18px;
        }

        .eyebrow {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .18em;
          color: rgba(255,255,255,.72);
          margin-bottom: 10px;
          font-weight: 800;
        }

        .logo {
          width: min(100%, 330px);
          max-height: 130px;
          object-fit: contain;
          display: block;
          margin: 0 auto 10px;
        }

        h1 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 38px;
          line-height: 1;
          color: #fff;
        }

        .top p {
          margin: 8px 0 0;
          color: #d7b56d;
          font-size: 14px;
        }

        .frame {
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.055);
          border-radius: 24px;
          padding: 18px 16px 20px;
          text-align: center;
          backdrop-filter: blur(8px);
        }

        .label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .16em;
          color: rgba(255,255,255,.70);
          margin-bottom: 8px;
          font-weight: 800;
        }

        h2 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 29px;
          line-height: 1.12;
        }

        .token {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.10);
          font-size: 13px;
          word-break: break-all;
        }

        .token strong {
          color: #d7b56d;
        }

        .qr {
          margin: 22px auto 14px;
          width: min(100%, 300px);
          aspect-ratio: 1/1;
          padding: 14px;
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 14px 34px rgba(0,0,0,.24);
        }

        .qr img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          border-radius: 12px;
        }

        .instruction {
          color: rgba(255,255,255,.74);
          font-size: 14px;
          line-height: 1.45;
          margin: 14px 0 0;
        }

        .info {
          margin-top: 18px;
          display: grid;
          gap: 10px;
        }

        .info div {
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.045);
          border-radius: 16px;
          padding: 12px 14px;
        }

        .info span {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: rgba(255,255,255,.62);
          margin-bottom: 5px;
          font-weight: 800;
        }

        .info strong {
          display: block;
          font-size: 15px;
          line-height: 1.35;
        }

        .info small {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,.68);
          font-size: 12px;
          line-height: 1.35;
        }

        .actions {
          margin-top: 18px;
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .actions a,
        .actions button {
          appearance: none;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          padding: 12px 15px;
          background: rgba(255,255,255,.08);
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .actions a:first-child {
          background: linear-gradient(180deg, #25D366, #128C7E);
          border: none;
        }

        footer {
          margin-top: 18px;
          text-align: center;
          color: rgba(255,255,255,.72);
          font-size: 13px;
        }

        @media (max-width: 480px) {
          .card {
            padding: 24px 18px 22px;
          }

          h2 {
            font-size: 25px;
          }

          .qr {
            width: min(100%, 270px);
          }
        }

        @media print {
          .page {
            padding: 0;
            background: #fff;
          }

          .card {
            max-width: none;
            width: 100%;
            min-height: 100vh;
            border-radius: 0;
            box-shadow: none;
          }

          .actions {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
