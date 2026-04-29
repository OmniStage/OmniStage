"use client";

import Header from "@/components/Header";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      alert("Erro: " + error.message);
    } else {
      window.location.href = "/";
    }
  };

  const handleCadastro = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome: "Cliente OmniStage",
        },
      },
    });

    setLoading(false);

    if (error) {
      alert("Erro: " + error.message);
    } else {
      alert("Conta criada! Faça login.");
    }
  };

  return (
    <>
      <Header />

      <div style={{ padding: 40 }}>
        <h1>Login OmniStage</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            display: "block",
            marginBottom: 10,
            padding: 10,
            width: 300,
          }}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{
            display: "block",
            marginBottom: 20,
            padding: 10,
            width: 300,
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ marginRight: 10 }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button onClick={handleCadastro} disabled={loading}>
          Criar conta
        </button>
      </div>
    </>
  );
}
