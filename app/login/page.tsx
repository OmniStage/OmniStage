"use client";

import Header from "@/components/Header";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      alert("Preencha email e senha");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha.trim(),
    });

    setLoading(false);

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    window.location.href = "/";
  };

  const handleCadastro = async () => {
    if (!email || !senha) {
      alert("Preencha email e senha");
      return;
    }

    if (senha.length < 6) {
      alert("Senha precisa ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha.trim(),
    });

    console.log("CADASTRO:", data, error);

    setLoading(false);

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    alert("Conta criada com sucesso! Agora faça login.");
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
          {loading ? "Aguarde..." : "Entrar"}
        </button>

        <button onClick={handleCadastro} disabled={loading}>
          Criar conta
        </button>
      </div>
    </>
  );
}
