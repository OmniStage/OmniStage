"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      window.location.href = "/app";
    }
  };

  const handleCadastro = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome: "Cliente OmniStage",
        },
      },
    });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      alert("Conta criada! Faça login.");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login OmniStage</h1>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Senha"
        onChange={(e) => setSenha(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>Entrar</button>
      <button onClick={handleCadastro}>Criar conta</button>
    </div>
  );
}
