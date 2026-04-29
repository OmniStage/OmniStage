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
        gridTemplateColumns: "1.15fr 0.85fr",
        background: "#020617",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          padding: "80px",
          background:
            "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.35), transparent 32%), linear-gradient(135deg, #020617, #050816)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1 style={{ fontSize: 64, lineHeight: 1, margin: 0 }}>
          Bem-vindo ao <br />
          <span style={{ color: "#a78bfa" }}>OmniStage</span>
        </h1>

        <p style={{ fontSize: 22, maxWidth: 620, color: "#cbd5e1", marginTop: 24 }}>
          Plataforma premium para criar eventos, gerenciar RSVP, convidados e
          check-in com QR Code.
        </p>

        <div
          style={{
            marginTop: 50,
            maxWidth: 620,
            borderRadius: 28,
            background: "rgba(15,23,42,0.78)",
            border: "1px solid rgba(167,139,250,0.28)",
            boxShadow: "0 30px 90px rgba(124,58,237,0.22)",
            padding: 32,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Sistema RSVP Premium</h2>
          <p style={{ color: "#94a3b8" }}>Convites digitais personalizados</p>
          <p style={{ color: "#94a3b8" }}>Confirmação de presença em tempo real</p>
          <p style={{ color: "#94a3b8" }}>Check-in com QR Code e controle de entrada</p>
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          color: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 50,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h2 style={{ fontSize: 44, textAlign: "center", margin: 0 }}>
            OmniStage
          </h2>

          <h3 style={{ fontSize: 26, textAlign: "center", marginTop: 12, marginBottom: 34 }}>
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
              borderRadius: 12,
              border: "1px solid #d1d5db",
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
              borderRadius: 12,
              border: "1px solid #d1d5db",
              marginBottom: 18,
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
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
              color: "#fff",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 16px 36px rgba(124,58,237,0.35)",
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
              borderRadius: 12,
              border: "1px solid #7c3aed",
              background: "#fff",
              color: "#4c1d95",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 12,
            }}
          >
            Criar conta
          </button>

          <p style={{ textAlign: "center", marginTop: 24, color: "#6b7280" }}>
            Ainda não é cliente? Crie sua conta e comece seu evento.
          </p>
        </div>
      </section>
    </main>
  );
}
