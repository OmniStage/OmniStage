"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      alert("Erro ao entrar: " + error.message);
      return;
    }

    window.location.href = "/";
  }

  async function criarConta() {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      alert("Erro ao criar conta: " + error.message);
      return;
    }

    alert("Conta criada. Agora faça login.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        background: "#f5f5f5",
        color: "#111",
      }}
    >
      <section
        style={{
          padding: "80px",
          background:
            "radial-gradient(circle at top left, #f4d06f 0, transparent 28%), linear-gradient(135deg, #f8f8f8, #e8e8e8)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1 style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>
          Bem-vindo ao <span style={{ color: "#c8a64b" }}>OmniStage</span>
        </h1>

        <p style={{ fontSize: 22, maxWidth: 620, color: "#333" }}>
          Crie eventos, envie convites, acompanhe RSVP e controle o check-in em
          uma única plataforma.
        </p>

        <div
          style={{
            marginTop: 50,
            width: "80%",
            height: 300,
            borderRadius: 28,
            background:
              "linear-gradient(135deg, #111827, #020617)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
            padding: 32,
            color: "#fff",
          }}
        >
          <h2 style={{ marginBottom: 18 }}>Sistema RSVP Premium</h2>
          <p style={{ opacity: 0.75 }}>Convites digitais</p>
          <p style={{ opacity: 0.75 }}>Confirmação de presença</p>
          <p style={{ opacity: 0.75 }}>Check-in com QR Code</p>
          <p style={{ opacity: 0.75 }}>Painel do evento em tempo real</p>
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 50,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h2 style={{ fontSize: 42, textAlign: "center", marginBottom: 8 }}>
            OmniStage
          </h2>

          <h3 style={{ fontSize: 28, textAlign: "center", marginBottom: 32 }}>
            Acesse sua conta
          </h3>

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: 10,
              border: "1px solid #d9d9d9",
              marginBottom: 16,
              fontSize: 16,
              background: "#f3f6fb",
            }}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: 10,
              border: "1px solid #d9d9d9",
              marginBottom: 16,
              fontSize: 16,
              background: "#f3f6fb",
            }}
          />

          <button
            onClick={entrar}
            disabled={loading}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 10,
              border: "none",
              background: "#c8a64b",
              color: "#111",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            {loading ? "Aguarde..." : "Entrar"}
          </button>

          <button
            onClick={criarConta}
            disabled={loading}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 10,
              border: "1px solid #c8a64b",
              background: "#fff",
              color: "#111",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 12,
            }}
          >
            Criar conta
          </button>

          <p style={{ textAlign: "center", marginTop: 24, color: "#666" }}>
            Ainda não é cliente? Crie sua conta e comece seu evento.
          </p>
        </div>
      </section>
    </main>
  );
}
