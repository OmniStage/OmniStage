"use client";

import { useState } from "react";

type CartaoSaveModeProps = {
  nomeConvidado: string;
  nomeEvento: string;
  token: string;
  qrUrl: string;
  logoUrl: string;
  backgroundUrl: string;
};

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function CartaoSaveMode({
  nomeConvidado,
  nomeEvento,
  token,
  qrUrl,
  logoUrl,
  backgroundUrl,
}: CartaoSaveModeProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function gerarImagemCartao() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1600;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");

    ctx.fillStyle = "#020814";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (backgroundUrl) {
      const bg = await loadImage(backgroundUrl);
      ctx.save();
      roundedRect(ctx, 70, 70, 940, 1460, 44);
      ctx.clip();
      ctx.drawImage(bg, 70, 70, 940, 1460);
      ctx.restore();
    }

    const gradient = ctx.createLinearGradient(0, 70, 0, 1530);
    gradient.addColorStop(0, "rgba(5,16,40,0.30)");
    gradient.addColorStop(1, "rgba(2,8,24,0.80)");
    ctx.fillStyle = gradient;
    roundedRect(ctx, 70, 70, 940, 1460, 44);
    ctx.fill();

    ctx.strokeStyle = "rgba(246,217,138,0.65)";
    ctx.lineWidth = 2;
    roundedRect(ctx, 70, 70, 940, 1460, 44);
    ctx.stroke();

    if (logoUrl) {
      const logo = await loadImage(logoUrl);
      const logoW = 620;
      const ratio = logo.height / logo.width;
      const logoH = Math.min(190, logoW * ratio);
      ctx.drawImage(logo, (1080 - logoW) / 2, 145, logoW, logoH);
    } else {
      ctx.fillStyle = "#f6d98a";
      ctx.font = "900 72px Georgia";
      ctx.textAlign = "center";
      ctx.fillText(nomeEvento, 540, 220);
    }

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "900 38px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CARTÃO DE ENTRADA", 540, 405);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 62px Georgia";
    ctx.fillText(nomeConvidado.toUpperCase(), 540, 500);

    const qr = await loadImage(qrUrl);

    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 210, 690, 660, 660, 44);
    ctx.fill();

    ctx.drawImage(qr, 250, 730, 580, 580);

    ctx.fillStyle = "rgba(255,255,255,0.10)";
    roundedRect(ctx, 385, 1410, 310, 74, 37);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    roundedRect(ctx, 385, 1410, 310, 74, 37);
    ctx.stroke();

    ctx.fillStyle = "#f6d98a";
    ctx.font = "900 34px Arial";
    ctx.fillText(token, 540, 1458);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("Erro ao gerar imagem."));
        else resolve(blob);
      }, "image/png", 1);
    });
  }

  async function salvarImagem() {
    if (salvando) return;

    setSalvando(true);

    const fileName = safeFileName(
      `${nomeConvidado}-Convite-${nomeEvento}-${token}.png`,
    );

    try {
      const blob = await gerarImagemCartao();
      const file = new File([blob], fileName, { type: "image/png" });

      const isMobile =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (
        isMobile &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Cartão ${nomeEvento}`,
          text: `Cartão de entrada de ${nomeConvidado}`,
        });

        setShowSuccess(true);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1200);

      setShowSuccess(true);
    } catch (error) {
      alert("Não foi possível salvar o cartão. Verifique as imagens do evento.");
    } finally {
      setSalvando(false);
    }
  }

  function fecharModoSalvar() {
    window.location.href = window.location.pathname;
  }

  function fecharPopup() {
    setShowSuccess(false);
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 150);
  }

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          padding: "26px 16px",
          display: "grid",
          placeItems: "center",background: backgroundUrl
  ? `linear-gradient(
      180deg,
      rgba(5,16,40,.24),
      rgba(2,8,24,.42)
    ),
    url("${backgroundUrl}") center/cover no-repeat`
            : "#020814",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 430,
            borderRadius: 38,
            padding: "34px 24px 26px",
            textAlign: "center",
            background:
            "linear-gradient(180deg, rgba(7,21,47,.58), rgba(2,8,24,.74))",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(246,217,138,.42)",
            boxShadow: "0 30px 90px rgba(0,0,0,.62)",
          }}
        >
          <h1
            style={{
              margin: "0 0 12px",
              color: "#f6d98a",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: ".16em",
              textTransform: "uppercase",
            }}
          >
            Salvar no App Fotos
          </h1>

          <p
            style={{
              margin: "0 0 26px",
              color: "rgba(255,255,255,.82)",
              fontSize: 17,
            }}
          >
            Convite de <strong>{nomeConvidado}</strong>
          </p>

          <div
            style={{
              width: 230,
              margin: "0 auto 30px",
              borderRadius: 30,
              overflow: "hidden",
              border: "1px solid rgba(246,217,138,.36)",
              background: backgroundUrl
                ? `linear-gradient(180deg, rgba(5,16,40,.56), rgba(2,8,24,.94)), url("${backgroundUrl}") center/cover no-repeat`
                : "#07152f",
              boxShadow: "0 14px 34px rgba(0,0,0,.45)",
            }}
          >
            <div style={{ padding: "20px 18px 16px" }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={nomeEvento}
                  style={{
                    width: "100%",
                    maxHeight: 70,
                    objectFit: "contain",
                    marginBottom: 16,
                  }}
                />
              ) : (
                <div
                  style={{
                    marginBottom: 14,
                    color: "#f6d98a",
                    fontWeight: 900,
                    fontSize: 28,
                  }}
                >
                  {nomeEvento}
                </div>
              )}

              <div
                style={{
                  background: "#fff",
                  borderRadius: 24,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <img
                  src={qrUrl}
                  alt={`QR ${nomeConvidado}`}
                  style={{ width: "100%", display: "block" }}
                />
              </div>

              <div
                style={{
                  color: "#f6d98a",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: ".14em",
                }}
              >
                {token}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={salvarImagem}
            disabled={salvando}
            aria-label="Salvar imagem"
            style={{
              width: 190,
              height: 190,
              borderRadius: 48,
              border: "3px solid rgba(199,174,99,.85)",
              background:
                "linear-gradient(180deg,#fbfbfc 0%,#e7e8ec 52%,#d9dbe2 100%)",
              color: "#050505",
              cursor: salvando ? "wait" : "pointer",
              opacity: salvando ? 0.72 : 1,
              boxShadow:
                "0 0 34px rgba(246,217,138,.28), inset 0 2px 8px rgba(255,255,255,.90)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              margin: "0 auto",
            }}
          >
            <svg width="58" height="58" viewBox="0 0 64 64">
              <path
                d="M32 8v30"
                stroke="#050505"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M18 28l14 14 14-14"
                fill="none"
                stroke="#050505"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17 46v5c0 4 3 7 7 7h16c4 0 7-3 7-7v-5"
                fill="none"
                stroke="#050505"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div
              style={{
                fontSize: 27,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
              }}
            >
              {salvando ? "Salvando" : "Salvar"}
              <br />
              Imagem
            </div>
          </button>

          <button
            type="button"
            onClick={fecharModoSalvar}
            style={{
              marginTop: 24,
              width: "100%",
              borderRadius: 20,
              padding: "16px 18px",
              background: "rgba(255,255,255,.06)",
              color: "rgba(255,255,255,.82)",
              border: "1px solid rgba(255,255,255,.12)",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Fechar
          </button>

          <div
            style={{
              marginTop: 18,
              padding: "16px 16px",
              borderRadius: 20,
              background: "rgba(255,255,255,.06)",
              color: "rgba(255,255,255,.78)",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Toque no ícone acima e escolha{" "}
            <strong style={{ color: "#f6d98a" }}>Salvar Imagem</strong> na
            próxima tela.
          </div>
        </section>
      </main>

      {showSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={fecharPopup}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            display: "grid",
            placeItems: "center",
            zIndex: 999999,
            padding: 20,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 34,
              padding: "34px 26px",
              textAlign: "center",
              background: "linear-gradient(180deg,#03122e,#020814)",
              border: "1px solid rgba(45,255,157,.34)",
              boxShadow: "0 0 70px rgba(45,255,157,.18)",
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                margin: "0 auto 22px",
                background: "radial-gradient(circle,#33e08a,#1cc96f)",
                display: "grid",
                placeItems: "center",
                fontSize: 58,
                color: "#04122a",
                fontWeight: 900,
                boxShadow: "0 0 40px rgba(45,255,157,.45)",
              }}
            >
              ✓
            </div>

            <div
              style={{
                color: "#f6d98a",
                fontWeight: 900,
                letterSpacing: ".14em",
                fontSize: 22,
                marginBottom: 14,
              }}
            >
              CONVITE SALVO
            </div>

            <div
              style={{
                color: "#ffffff",
                fontSize: 30,
                fontWeight: 900,
                fontFamily: "Georgia, serif",
                marginBottom: 18,
              }}
            >
              {nomeConvidado}
            </div>

            <div
              style={{
                color: "rgba(255,255,255,.78)",
                fontSize: 18,
                lineHeight: 1.45,
                marginBottom: 26,
              }}
            >
              O convite foi preparado com o card completo e QR Code individual.
            </div>

            <button
              type="button"
              onClick={fecharPopup}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "18px 34px",
                background: "linear-gradient(180deg,#20294b,#111935)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
