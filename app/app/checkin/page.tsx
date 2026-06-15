"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string | null;
  status: string | null;
  tenant_id: string | null;
  data_evento: string | null;
  cidade: string | null;
  categoria_evento: string | null;
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
      .select("id, nome, status, tenant_id, data_evento, cidade, categoria_evento")
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

      <div style={{ display: "grid", gap: 14 }}>
        {eventos.map((evento) => {
          const dataFormatada = evento.data_evento
            ? new Date(evento.data_evento + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
            : null;
          const statusColor = evento.status === "ativo" ? { bg: "#dcfce7", color: "#166534" }
            : evento.status === "encerrado" ? { bg: "#f1f5f9", color: "var(--muted)" }
            : { bg: "#fef3c7", color: "#92400e" };

          return (
            <Link
              key={evento.id}
              href={`/app/eventos/${evento.id}/checkin`}
              style={{ display: "block", textDecoration: "none", color: "var(--text)" }}
            >
              <div style={{
                padding: "20px 24px",
                borderRadius: 22,
                border: "1px solid var(--line)",
                background: "var(--card)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                transition: "box-shadow .18s, transform .18s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(109,40,217,.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
              >
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: "-.03em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {evento.nome || "Evento sem nome"}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {evento.categoria_evento && (
                      <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 900 }}>
                        {evento.categoria_evento}
                      </span>
                    )}
                    {dataFormatada && (
                      <span style={{ background: "var(--card-strong)", color: "var(--muted)", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 900 }}>
                        {dataFormatada}
                      </span>
                    )}
                    {evento.cidade && (
                      <span style={{ background: "var(--card-strong)", color: "var(--muted)", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 900 }}>
                        {evento.cidade}
                      </span>
                    )}
                    {evento.status && (
                      <span style={{ background: statusColor.bg, color: statusColor.color, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 900 }}>
                        {evento.status}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", padding: "12px 20px", borderRadius: 14, fontWeight: 950, fontSize: 14 }}>
                  Abrir
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
