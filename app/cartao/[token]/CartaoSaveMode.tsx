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

export default function CartaoSaveMode({
  nomeConvidado,
  nomeEvento,
  token,
  qrUrl,
  logoUrl,
  backgroundUrl,
}: CartaoSaveModeProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  async function salvarImagem() {
    const fileName = `${nomeConvidado || "cartao"}-${token}.png`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]/g, "-");

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();

      const file = new File([blob], fileName, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
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

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setShowSuccess(true);
    } catch {
      alert("Não foi possível salvar automaticamente. Tire uma captura de tela.");
    }
  }

  function fechar() {
    setShowSuccess(false);
  }

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          padding: "26px 16px",
          display: "grid",
          placeItems: "center",
          background: backgroundUrl
            ? `linear-gradient(180deg, rgba(2,8,20,.50), rgba(2,8,20,.98)), url("${backgroundUrl}") center/cover no-repeat`
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
              "linear-gradient(180deg, rgba(7,21,47,.96), rgba(2,8,24,.98))",
            border: "1px solid rgba(246,217,138,.42)",
            boxShadow: "0 30px 90px rgba(0,0,0,.62)",
            position: "relative",
            overflow: "hidden",
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
                  style={{
                    width: "100%",
                    display: "block",
                  }}
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
            aria-label="Salvar imagem"
            style={{
              width: 190,
              height: 190,
              borderRadius: 48,
              border: "3px solid rgba(199,174,99,.85)",
              background: "linear-gradient(180deg,#fbfbfc 0%,#e7e8ec 52%,#d9dbe2 100%)",
              color: "#050505",
              cursor: "pointer",
              boxShadow:
                "0 0 34px rgba(246,217,138,.28), inset 0 2px 8px rgba(255,255,255,.90)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              margin: "0 auto",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg
              width="58"
              height="58"
              viewBox="0 0 64 64"
              aria-hidden="true"
              style={{ display: "block" }}
            >
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
              Salvar
              <br />
              Imagem
            </div>
          </button>

          <button
            type="button"
            onClick={() => history.back()}
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
              onClick={fechar}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "18px 34px",
                background: "linear-gradient(180deg,#20294b,#111935)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 18,
                cursor: "pointer",
                position: "relative",
                zIndex: 1000000,
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
