"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ConvitePage() {
  const [nomes, setNomes] = useState<string[]>([]);
  const [tokens, setTokens] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    const nomesParam = url.searchParams.get("nomes");
    const tokensParam = url.searchParams.get("tokens");

    if (nomesParam) {
      const lista = decodeURIComponent(nomesParam).split("|");
      setNomes(lista);
      setSelecionados(lista);
    }

    if (tokensParam) {
      const lista = decodeURIComponent(tokensParam).split("|");
      setTokens(lista);
    }
  }, []);

  function toggleNome(nome: string) {
    if (selecionados.includes(nome)) {
      setSelecionados(selecionados.filter((n) => n !== nome));
    } else {
      setSelecionados([...selecionados, nome]);
    }
  }

  async function confirmarPresenca() {
    if (selecionados.length === 0) {
      alert("Selecione pelo menos um nome.");
      return;
    }

    for (let i = 0; i < nomes.length; i++) {
      const nome = nomes[i];
      const token = tokens[i];

      if (!token) continue;

      const confirmado = selecionados.includes(nome);

      await supabase
        .from("convidados")
        .update({
          status_rsvp: confirmado ? "confirmado" : "nao",
          data_resposta: new Date().toISOString(),
        })
        .eq("token", token);
    }

    alert("Presença confirmada!");
  }

  function tocarMusica() {
    const audio = document.getElementById("audio") as HTMLAudioElement;

    if (!audio) return;

    if (play) {
      audio.pause();
      setPlay(false);
    } else {
      audio.play();
      setPlay(true);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `url("/fundo.jpg") center/cover no-repeat`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <audio id="audio" src="/musica.mp3" loop />

      <div
        style={{
          width: 360,
          borderRadius: 24,
          padding: 24,
          backdropFilter: "blur(20px)",
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          textAlign: "center",
        }}
      >
        {/* botão música */}
        <button
          onClick={tocarMusica}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "#111827",
            border: "none",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: 20,
            cursor: "pointer",
          }}
        >
          {play ? "⏸ Pausar" : "▶ Tocar"}
        </button>

        <img
          src="/logo.png"
          style={{
            width: 180,
            marginBottom: 10,
          }}
        />

        <p style={{ color: "#cbd5f5", fontSize: 12 }}>
          CONVITE DIGITAL
        </p>

        <h1
          style={{
            fontSize: 36,
            color: "#facc15",
            marginBottom: 10,
          }}
        >
          VALENTINA XV
        </h1>

        <p style={{ color: "#cbd5f5" }}>
          16 de maio de 2026 • 21h
        </p>

        <p style={{ marginBottom: 20 }}>
          Guerrah Hall
        </p>

        {/* seleção nomes */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: 12,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          {nomes.map((nome) => (
            <label
              key={nome}
              style={{
                display: "block",
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selecionados.includes(nome)}
                onChange={() => toggleNome(nome)}
                style={{ marginRight: 8 }}
              />
              {nome}
            </label>
          ))}
        </div>

        <button
          onClick={confirmarPresenca}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            background: "#22c55e",
            border: "none",
            color: "#fff",
            fontWeight: "bold",
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          CONFIRMAR PRESENÇA
        </button>

        <button
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            background: "#111827",
            border: "1px solid #334155",
            color: "#fff",
            marginBottom: 10,
          }}
        >
          VER LOCALIZAÇÃO
        </button>

        <button
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            background: "#111827",
            border: "1px solid #334155",
            color: "#fff",
          }}
        >
          ADICIONAR AO CALENDÁRIO
        </button>

        <p style={{ marginTop: 20, color: "#94a3b8" }}>
          Esperamos você ✨
        </p>
      </div>
    </main>
  );
}
