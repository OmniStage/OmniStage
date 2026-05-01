"use client";

import { useEffect, useState } from "react";

export default function ConvitePage() {
  const [nome, setNome] = useState("Convidado Especial");
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const nomes = url.searchParams.get("nomes");

    if (nomes) {
      const decoded = decodeURIComponent(nomes);
      setNome(decoded.replace("|", " & "));
    }
  }, []);

  function tocarMusica() {
    const audio = document.getElementById("audio") as HTMLAudioElement;
    if (audio) {
      audio.play();
      setPlay(true);
    }
  }

  return (
    <main style={container}>
      <audio id="audio" src="/musica.mp3" loop />

      <div style={card}>
        <p style={sub}>Você foi convidado para</p>

        <h1 style={titulo}>Valentina XV</h1>

        <p style={nomeStyle}>{nome}</p>

        <p style={info}>
          16 de Maio • Guerrah Hall • Macaé
        </p>

        {!play && (
          <button onClick={tocarMusica} style={botao}>
            ▶ Ativar Música
          </button>
        )}
      </div>
    </main>
  );
}

const container: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at center, #0f172a, #020617)",
  color: "#fff",
};

const card: React.CSSProperties = {
  padding: 40,
  borderRadius: 24,
  background: "rgba(15,23,42,0.7)",
  border: "1px solid rgba(255,255,255,0.1)",
  textAlign: "center",
  backdropFilter: "blur(10px)",
  maxWidth: 400,
};

const sub: React.CSSProperties = {
  color: "#94a3b8",
};

const titulo: React.CSSProperties = {
  fontSize: 42,
  margin: "10px 0",
  color: "#facc15",
};

const nomeStyle: React.CSSProperties = {
  fontSize: 20,
  marginBottom: 20,
};

const info: React.CSSProperties = {
  color: "#cbd5f5",
  marginBottom: 30,
};

const botao: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 12,
  background: "#facc15",
  border: "none",
  fontWeight: "bold",
  cursor: "pointer",
};
