"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Convidado = {
  id: string;
  nome: string;
  grupo: string | null;
  token: string | null;
  status_rsvp: string;
  checkin_status: string | null;
};

export default function CheckinPage({ params }: { params: { id: string } }) {
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  const eventoId = params.id;

  async function carregarConvidados() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select("*")
      .eq("evento_id", eventoId)
      .eq("status_rsvp", "CONFIRMADO");

    if (!error && data) {
      setConvidados(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    carregarConvidados();
  }, []);

  async function confirmarEntrada(token: string | null) {
    if (!token) return;

    // UI otimista
    setConvidados((prev) =>
      prev.map((c) =>
        c.token === token
          ? { ...c, checkin_status: "ENTROU_LOCAL" }
          : c
      )
    );

    const { error } = await supabase
      .from("convidados")
      .update({ checkin_status: "ENTROU" })
      .eq("token", token);

    if (!error) {
      setConvidados((prev) =>
        prev.map((c) =>
          c.token === token
            ? { ...c, checkin_status: "ENTROU" }
            : c
        )
      );
    }
  }

  const filtrados = convidados.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.grupo || "").toLowerCase().includes(busca.toLowerCase()) ||
    (c.token || "").toLowerCase().includes(busca.toLowerCase())
  );

  const total = convidados.length;
  const entrou = convidados.filter(c => c.checkin_status === "ENTROU").length;
  const pendente = convidados.filter(c => !c.checkin_status).length;

  return (
    <main style={{ padding: 24 }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32 }}>Check-in do Evento</h1>
        <p style={{ opacity: 0.7 }}>
          Confirmação manual de convidados
        </p>
      </div>

      {/* STATS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 24
      }}>
        <Card title="Confirmados" value={total} />
        <Card title="Entraram" value={entrou} />
        <Card title="Pendentes" value={pendente} />
      </div>

      {/* BUSCA */}
      <input
        placeholder="Buscar nome, grupo ou token"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{
          width: "100%",
          height: 50,
          padding: "0 16px",
          borderRadius: 12,
          border: "1px solid #333",
          marginBottom: 24
        }}
      />

      {/* LISTA */}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtrados.map((c) => {
            const entrou = c.checkin_status === "ENTROU";

            return (
              <div key={c.id} style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <strong>{c.nome}</strong>
                  <div style={{ opacity: 0.6 }}>
                    {c.grupo || "Individual"}
                  </div>
                </div>

                <button
                  disabled={entrou}
                  onClick={() => confirmarEntrada(c.token)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: entrou ? "#555" : "#22c55e",
                    color: "#fff",
                    border: "none",
                    cursor: entrou ? "not-allowed" : "pointer"
                  }}
                >
                  {entrou ? "Entrou" : "Liberar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Card({ title, value }: any) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      border: "1px solid #333"
    }}>
      <div style={{ opacity: 0.6 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}
