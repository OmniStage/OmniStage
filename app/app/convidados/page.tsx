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
  email: string | null;
  grupo: string | null;
  tipo_convite: string | null;
  observacoes: string | null;
  status_rsvp: string | null;
  status_envio: string | null;
  token: string | null;
};

export default function ConvidadosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [convidados, setConvidados] = useState<Convidado[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    grupo: "",
    tipo: "individual",
    observacoes: "",
    status_rsvp: "pendente",
    status_envio: "pendente",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function gerarToken() {
    return "EVT-" + Math.floor(100000 + Math.random() * 900000);
  }

  async function criarConvidado() {
    if (!form.nome.trim()) {
      alert("Digite o nome.");
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
      nome: form.nome,
      telefone: form.telefone,
      email: form.email,
      grupo: form.grupo,
      tipo_convite: form.tipo,
      observacoes: form.observacoes,
      status_rsvp: form.status_rsvp,
      status_envio: form.status_envio,
      token,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setShowForm(false);
    setForm({
      nome: "",
      telefone: "",
      email: "",
      grupo: "",
      tipo: "individual",
      observacoes: "",
      status_rsvp: "pendente",
      status_envio: "pendente",
    });

    carregarConvidados(tenantId, eventoId);
  }

  async function carregarTenant() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (data) setTenantId(data.tenant_id);
  }

  async function carregarEventos(tenant: string) {
    const { data } = await supabase
      .from("eventos")
      .select("id,nome")
      .eq("tenant_id", tenant);

    setEventos(data || []);

    if (data?.length) {
      setEventoId(data[0].id);
      carregarConvidados(tenant, data[0].id);
    }
  }

  async function carregarConvidados(tenant: string, evento: string) {
    const { data } = await supabase
      .from("convidados")
      .select("*")
      .eq("tenant_id", tenant)
      .eq("evento_id", evento)
      .order("created_at", { ascending: false });

    setConvidados(data || []);
  }

  useEffect(() => {
    async function init() {
      const tenant = await carregarTenant();
      if (tenantId) {
        carregarEventos(tenantId);
      }
    }
    init();
  }, [tenantId]);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 48 }}>Convidados</h1>

      <button
        onClick={() => setShowForm(true)}
        style={btnCriar}
      >
        + Criar convidado
      </button>

      {showForm && (
        <div style={modal}>
          <h2>Criar convidado</h2>

          <div style={grid}>
            <input placeholder="Nome" value={form.nome} onChange={(e)=>handleChange("nome", e.target.value)} />
            <input placeholder="Telefone" value={form.telefone} onChange={(e)=>handleChange("telefone", e.target.value)} />
            <input placeholder="E-mail" value={form.email} onChange={(e)=>handleChange("email", e.target.value)} />
            <input placeholder="Grupo/Família" value={form.grupo} onChange={(e)=>handleChange("grupo", e.target.value)} />

            <select value={form.tipo} onChange={(e)=>handleChange("tipo", e.target.value)}>
              <option value="individual">Individual</option>
              <option value="grupo">Grupo</option>
            </select>

            <select value={form.status_rsvp} onChange={(e)=>handleChange("status_rsvp", e.target.value)}>
              <option value="pendente">Pendente</option>
              <option value="confirmado">Confirmado</option>
              <option value="nao">Não vai</option>
            </select>

            <select value={form.status_envio} onChange={(e)=>handleChange("status_envio", e.target.value)}>
              <option value="pendente">Pendente</option>
              <option value="enviado">Enviado</option>
            </select>

            <textarea
              placeholder="Observações"
              value={form.observacoes}
              onChange={(e)=>handleChange("observacoes", e.target.value)}
              style={{ gridColumn: "span 2" }}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <button onClick={criarConvidado} style={btnSalvar}>
              {loading ? "Salvando..." : "Salvar"}
            </button>

            <button onClick={()=>setShowForm(false)} style={btnCancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <section style={{ marginTop: 30, display: "grid", gap: 16 }}>
        {convidados.map((c) => (
          <div key={c.id} style={card}>
            <strong>{c.nome}</strong>
            <p>{c.telefone || "Sem telefone"} · {c.email || "Sem email"}</p>
            <p>Grupo: {c.grupo || "-"}</p>
            <p>RSVP: {c.status_rsvp} · Envio: {c.status_envio}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const modal = {
  marginTop: 20,
  padding: 20,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
};

const card = {
  padding: 20,
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#020617",
};

const btnCriar = {
  marginTop: 20,
  padding: "12px 18px",
  background: "#22c55e",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
};

const btnSalvar = {
  padding: "10px 16px",
  background: "#22c55e",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  marginRight: 10,
};

const btnCancel = {
  padding: "10px 16px",
  background: "#334155",
  border: "none",
  borderRadius: 8,
  color: "#fff",
};
