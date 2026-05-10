"use client";

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
  async function salvarImagem() {
    const fileName = `${nomeConvidado || "cartao"}-${token}.png`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]/g, "-");

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();

      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Cartão ${nomeEvento}`,
          text: `Cartão de entrada de ${nomeConvidado}`,
        });

        alert("Cartão salvo.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      alert("Cartão baixado.");
    } catch {
      alert("Não foi possível salvar automaticamente. Tire uma captura de tela.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px",
        display: "grid",
        placeItems: "center",
        background: "#020814",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 430,
          borderRadius: 34,
          padding: "28px 22px",
          textAlign: "center",
          background: backgroundUrl
            ? `linear-gradient(180deg, rgba(7,21,47,.86), rgba(2,8,24,.98)), url("${backgroundUrl}") center/cover no-repeat`
            : "linear-gradient(180deg,#07152f,#020814)",
          border: "1px solid rgba(246,217,138,.42)",
          boxShadow: "0 28px 80px rgba(0,0,0,.55)",
        }}
      >
        <h1
          style={{
            margin: "0 0 14px",
            color: "#f6d98a",
            fontSize: 22,
            letterSpacing: ".16em",
            textTransform: "uppercase",
          }}
        >
          Salvar no App Fotos
        </h1>

        <p style={{ margin: "0 0 22px", color: "rgba(255,255,255,.78)" }}>
          Convite de <strong>{nomeConvidado}</strong>
        </p>

        <div
          style={{
            width: 150,
            height: 210,
            margin: "0 auto 26px",
            borderRadius: 22,
            padding: 16,
            display: "grid",
            placeItems: "center",
            background: backgroundUrl
              ? `linear-gradient(180deg, rgba(5,16,40,.46), rgba(2,8,24,.88)), url("${backgroundUrl}") center/cover no-repeat`
              : "#07152f",
            border: "1px solid rgba(246,217,138,.40)",
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              background: "#fff",
              borderRadius: 16,
              padding: 8,
            }}
          >
            <img
              src={qrUrl}
              alt={`QR Code ${nomeConvidado}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={salvarImagem}
          style={{
            width: 170,
            height: 170,
            borderRadius: 42,
            border: "2px solid rgba(246,217,138,.62)",
            background: "linear-gradient(180deg,#f5f5f7,#d8d9dd)",
            color: "#050505",
            fontSize: 25,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 0 34px rgba(246,217,138,.32)",
          }}
        >
          ⬇<br />
          Salvar<br />
          Imagem
        </button>

        <button
          type="button"
          onClick={() => history.back()}
          style={{
            marginTop: 22,
            width: "100%",
            borderRadius: 18,
            padding: "14px 16px",
            background: "rgba(255,255,255,.06)",
            color: "rgba(255,255,255,.78)",
            border: "1px solid rgba(255,255,255,.13)",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Fechar
        </button>

        <div
          style={{
            marginTop: 18,
            padding: "13px 14px",
            borderRadius: 18,
            background: "rgba(255,255,255,.07)",
            color: "rgba(255,255,255,.78)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          Toque no ícone acima e escolha{" "}
          <strong style={{ color: "#f6d98a" }}>Salvar Imagem</strong> na próxima
          tela.
        </div>
      </section>
    </main>
  );
}
