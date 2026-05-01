"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
};

type Convidado = {
  id: string;
  nome: string;
  telefone: string | null;
  status_rsvp: string | null;
  status_checkin: string | null;
  token: string | null;
  evento_id: string | null;
};

export default function ConvidadosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
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
      alert("Usuário sem empresa vinculada.");
      return null;
    }

    setTenantId(data.tenant_id);
    return data.tenant_id as string;
  }

  async function carregarEventos(tenant: string) {
    const { data, error } = await supabase
      .from("eventos")
      .select("id, nome")
      .eq("tenant_id", tenant)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return;
    }

    setEventos((data || []) as Evento[]);

    if (data && data.length > 0 && !eventoId) {
      setEventoId(data[0].id);
      carregarConvidados(tenant, data[0].id);
    }
  }

  async function carregarConvidados(tenant: string, evento: string) {
    const { data, error } = await supabase
      .from("convidados")
      .select("id, nome, telefone, status_rsvp, status_checkin, token, evento_id")
      .eq("tenant_id", tenant)
      .eq("evento_id", evento)
      .order("nome");

    if (error) {
      alert("Erro ao carregar convidados: " + error.message);
      return;
    }

    setConvidados((data || []) as Convidado[]);
  }

  async function iniciarTela() {
    const tenant = await carregarTenant();
    if (tenant) {
      await carregarEventos(tenant);
    }
  }

  async function trocarEvento(id: string) {
    setEventoId(id);

    if (tenantId && id) {
      await carregarConvidados(tenantId, id);
    }
  }

  function gerarToken() {
    return "EVT-" + Math.floor(100000 + Math.random() * 900000);
  }

  async function criarConvidado() {
    if (!nome.trim()) {
      alert("Digite o nome do convidado.");
      return;
    }

    if (!tenantId || !eventoId) {
      alert("Selecione um evento.");
      return;
    }

    setLoading(true);

    const token = gerarToken();

    const { error } = await supabase.from("convidados").insert({
      tenant_id: tenantId,
      evento_id: eventoId,
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      status_rsvp: "pendente",
      status_checkin: "nao_entrou",
      token,
    });

    setLoading(false);

    if (error) {
      alert("Erro ao criar convidado: " + error.message);
      return;
    }

    setNome("");
    setTelefone("");
    carregarConvidados(tenantId, eventoId);
  }

  useEffect(() => {
    iniciarTela();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 48 }}>Convidados</h1>

      <p style={{ color: "#94a3b8", marginTop: -10 }}>
        🔵 APP — convidados vinculados ao evento selecionado.
      </p>

      <section style={{ marginTop: 24, marginBottom: 28 }}>
        <select
          value={eventoId}
          onChange={(e) => trocarEvento(e.target.value)}
          style={{
            padding: 14,
            borderRadius: 12,
            background: "#020617",
            color: "#fff",
            border: "1px solid #334155",
            minWidth: 320,
          }}
        >
          <option value="">Selecione um evento</option>
          {eventos.map((evento) => (
            <option key={evento.id} value={evento.id}>
              {evento.nome}
            </option>
          ))}
        </select>
      </section>

      <section style={{ display: "flex", gap: 10, marginBottom: 30, flexWrap: "wrap" }}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do convidado"
          style={inputStyle}
        />

        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="Telefone"
          style={inputStyle}
        />

        <button
          onClick={criarConvidado}
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
          {loading ? "Criando..." : "Adicionar convidado"}
        </button>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        {convidados.map((convidado) => (
          <div
            key={convidado.id}
            style={{
              background: "#020617",
              padding: 22,
              borderRadius: 18,
              border: "1px solid #334155",
            }}
          >
            <strong style={{ fontSize: 22 }}>{convidado.nome}</strong>
            <p style={{ color: "#94a3b8" }}>
              {convidado.telefone || "Sem telefone"} · RSVP: {convidado.status_rsvp}
            </p>
            <p style={{ color: "#94a3b8" }}>
              Check-in: {convidado.status_checkin || "nao_entrou"} · Token:{" "}
              <strong style={{ color: "#facc15" }}>{convidado.token || "sem token"}</strong>
            </p>
          </div>
        ))}

        {convidados.length === 0 && (
          <p style={{ color: "#64748b" }}>
            Nenhum convidado cadastrado para este evento.
          </p>
        )}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
  minWidth: 240,
};
};
