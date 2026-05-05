"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string | null;
  status: string | null;
  tenant_id: string | null;
};

export default function CheckinPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarEventosDoCliente();
  }, []);

  async function carregarEventosDoCliente() {
    setLoading(true);
    setErro(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (authError || !userId) {
      setErro("Login não encontrado. Saia e entre novamente.");
      setEventos([]);
      setLoading(false);
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();

    if (memberError || !member?.tenant_id) {
      setErro("Seu usuário ainda não está vinculado a uma empresa ativa.");
      setEventos([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("eventos")
      .select("id, nome, status, tenant_id")
      .eq("tenant_id", member.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      setErro(`Erro ao carregar eventos: ${error.message}`);
      setEventos([]);
      setLoading(false);
      return;
    }

    setEventos((data || []) as Evento[]);
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 8,
          }}
        >
          OmniStage Check-in
        </div>

        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            margin: 0,
          }}
        >
          Escolha o evento
        </h1>

        <p
          style={{
            marginTop: 10,
            color: "var(--muted)",
            fontSize: 16,
          }}
        >
          Selecione apenas eventos vinculados à empresa do usuário logado.
        </p>
      </div>

      {erro && (
        <div
          style={{
            padding: 20,
            border: "1px solid rgba(225,29,72,.24)",
            borderRadius: 16,
            background: "rgba(255,228,230,.7)",
            color: "#be123c",
            marginBottom: 16,
            fontWeight: 800,
          }}
        >
          {erro}
        </div>
      )}

      {loading && !erro && (
        <div
          style={{
            padding: 20,
            border: "1px solid var(--line)",
            borderRadius: 16,
            background: "var(--card)",
            color: "var(--muted)",
            fontWeight: 750,
          }}
        >
          Carregando eventos...
        </div>
      )}

      {!loading && !erro && !eventos.length && (
        <div
          style={{
            padding: 20,
            border: "1px solid var(--line)",
            borderRadius: 16,
            background: "var(--card)",
            color: "var(--muted)",
            fontWeight: 750,
          }}
        >
          Nenhum evento encontrado para este cliente.
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {eventos.map((evento) => (
          <Link
            key={evento.id}
            href={`/app/eventos/${evento.id}/checkin`}
            style={{
              display: "block",
              padding: 20,
              borderRadius: 18,
              border: "1px solid var(--line)",
              background: "var(--card)",
              textDecoration: "none",
              color: "var(--text)",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                  {evento.nome || "Evento sem nome"}
                </h2>

                <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                  ID: {evento.id}
                  {evento.status && ` • ${evento.status}`}
                </div>
              </div>

              <div
                style={{
                  alignSelf: "center",
                  background: "#6d28d9",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 12,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                Abrir
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
