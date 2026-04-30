"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
  status: string | null;
  tenant_id: string;
  created_at: string;
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [nome, setNome] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function carregarTenant() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado");
      return null;
    }

    const { data, error } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error || !data?.tenant_id) {
      alert("Este usuário ainda não está vinculado a uma empresa.");
      return null;
    }

    setTenantId(data.tenant_id);
    return data.tenant_id as string;
  }

  async function carregarEventos(tenant: string) {
    const { data, error } = await supabase
      .from("eventos")
      .select("id, nome, status, tenant_id, created_at")
      .eq("tenant_id", tenant)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return;
    }

    setEventos((data || []) as Evento[]);
  }

  async function iniciarTela() {
    const tenant = await carregarTenant();
    if (tenant) {
      await carregarEventos(tenant);
    }
  }

  async function criarEvento() {
    if (!nome.trim()) {
      alert("Digite o nome do evento");
      return;
    }

    let tenant = tenantId;

    if (!tenant) {
      tenant = await carregarTenant();
    }

    if (!tenant) return;

    setLoading(true);

    const { error } = await supabase.from("eventos").insert({
      nome: nome.trim(),
      status: "ativo",
      tenant_id: tenant,
    });

    setLoading(false);

    if (error) {
      alert("Erro ao criar evento: " + error.message);
      return;
    }

    setNome("");
    carregarEventos(tenant);
  }

  useEffect(() => {
    iniciarTela();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 48 }}>Eventos</h1>

      <p style={{ color: "#94a3b8", marginTop: -10 }}>
        🔵 APP — eventos vinculados à empresa do usuário.
      </p>

      <div style={{ marginTop: 24, marginBottom: 30 }}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do evento"
          style={{
            padding: 14,
            borderRadius: 12,
            marginRight: 10,
            background: "#020617",
            color: "#fff",
            border: "1px solid #334155",
            minWidth: 280,
          }}
        />

        <button
          onClick={criarEvento}
          disabled={loading}
          style={{
            padding: "14px 20px",
            borderRadius: 12,
            background: "#22c55e",
            border: "none",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Criando..." : "Criar evento"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {eventos.map((evento) => (
          <div
            key={evento.id}
            style={{
              background: "#020617",
              padding: 22,
              borderRadius: 18,
              border: "1px solid #334155",
            }}
          >
            <strong style={{ fontSize: 22 }}>{evento.nome}</strong>
            <p style={{ color: "#94a3b8" }}>Status: {evento.status}</p>
            <small style={{ color: "#64748b" }}>Tenant: {evento.tenant_id}</small>
          </div>
        ))}
      </div>
    </main>
  );
}
   
