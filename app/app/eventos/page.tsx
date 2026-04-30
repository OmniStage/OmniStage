"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EventosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [nome, setNome] = useState("");

  async function carregarEventos() {
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setEventos(data || []);
  }

  async function criarEvento() {
    if (!nome.trim()) {
      alert("Digite o nome do evento");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("eventos").insert({
      nome: nome.trim(),
      status: "ativo",
    });

    if (error) {
      alert("Erro ao criar evento: " + error.message);
      return;
    }

    setNome("");
    carregarEventos();
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 48 }}>Eventos</h1>

      <div style={{ marginTop: 20, marginBottom: 30 }}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do evento"
          style={{
            padding: 12,
            borderRadius: 10,
            marginRight: 10,
            background: "#020617",
            color: "#fff",
            border: "1px solid #334155",
          }}
        />

        <button
          onClick={criarEvento}
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            background: "#22c55e",
            border: "none",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Criar evento
        </button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {eventos.map((evento) => (
          <div
            key={evento.id}
            style={{
              background: "#020617",
              padding: 20,
              borderRadius: 16,
              border: "1px solid #334155",
            }}
          >
            <strong>{evento.nome}</strong>
            <p>Status: {evento.status}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
