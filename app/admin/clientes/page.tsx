"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tenant = {
  id: string;
  nome: string;
  plano: string | null;
  status: string | null;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Tenant[]>([]);
  const [nome, setNome] = useState("");
  const [plano, setPlano] = useState("free");
  const [loading, setLoading] = useState(false);

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, nome, plano, status")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar clientes: " + error.message);
      return;
    }

    setClientes(data || []);
  }

  async function criarCliente() {
    if (!nome.trim()) {
      alert("Digite o nome da empresa.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("tenants").insert({
      nome: nome.trim(),
      plano,
      status: "ativo",
    });

    setLoading(false);

    if (error) {
      alert("Erro ao criar empresa: " + error.message);
      return;
    }

    setNome("");
    setPlano("free");
    carregarClientes();
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 40,
        background:
          "radial-gradient(circle at top left, rgba(124,58,237,0.25), transparent 28%), linear-gradient(135deg, #030712, #0f172a)",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>Clientes / Empresas</h1>
      <p style={{ color: "#94a3b8", marginBottom: 32 }}>
        🟣 ADMIN — cadastre as empresas que depois poderão entrar em redes/franquias.
      </p>

      <section
        style={{
          background: "rgba(15,23,42,0.86)",
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: 28,
          padding: 28,
          marginBottom: 36,
          maxWidth: 760,
        }}
      >
        <h2>Nova empresa</h2>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da empresa"
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.25)",
            background: "#020617",
            color: "#fff",
            marginBottom: 14,
            fontSize: 16,
          }}
        />

        <select
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.25)",
            background: "#020617",
            color: "#fff",
            marginBottom: 18,
            fontSize: 16,
          }}
        >
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <button
          onClick={criarCliente}
          disabled={loading}
          style={{
            padding: "15px 24px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {loading ? "Criando..." : "Criar empresa"}
        </button>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            style={{
              background: "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.84))",
              border: "1px solid rgba(167,139,250,0.22)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 24 }}>{cliente.nome}</h3>
            <p style={{ color: "#cbd5e1" }}>Plano: {cliente.plano}</p>
            <p style={{ color: "#cbd5e1" }}>Status: {cliente.status}</p>
            <small style={{ color: "#64748b" }}>{cliente.id}</small>
          </div>
        ))}
      </section>
    </main>
  );
}
