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
    <main className="page">
      <div className="shell" style={{ maxWidth: 520 }}>
        <section className="card full">
          <h1 style={{ fontSize: 42, marginBottom: 8 }}>OmniStage</h1>
          <p style={{ opacity: 0.7, marginBottom: 28 }}>
            Acesse sua conta para criar eventos, gerenciar convidados e controlar RSVP.
          </p>

          <div className="list">
            <input
              className="input"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="input"
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <div className="nav" style={{ marginTop: 24 }}>
            <button className="btn gold" onClick={entrar} disabled={loading}>
              {loading ? "Aguarde..." : "Entrar"}
            </button>

            <button className="btn" onClick={criarConta} disabled={loading}>
              Criar conta
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
