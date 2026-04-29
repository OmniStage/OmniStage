"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Guest = {
  id: string;
  nome: string;
  telefone: string | null;
  email?: string | null;
  token: string;
  status_rsvp: string;
  checkin_realizado: boolean;
  data_checkin?: string | null;
  criado_em?: string | null;
};

export function DashboardClient() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function carregar() {
    const { data, error } = await supabase
      .from("convidados")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      setError(`${error.code || ""} - ${error.message}`);
      setLoading(false);
      return;
    }

    setGuests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();

    const channel = supabase
      .channel("dashboard-convidados")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "convidados",
        },
        () => {
          carregar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const total = guests.length;
  const confirmados = guests.filter((g) => g.status_rsvp === "confirmado").length;
  const pendentes = guests.filter((g) => g.status_rsvp === "pendente").length;
  const entradas = guests.filter((g) => g.checkin_realizado === true).length;
  const restantes = confirmados - entradas;

  const ultimaEntrada = useMemo(() => {
    return guests
      .filter((g) => g.checkin_realizado)
      .sort((a, b) => {
        const da = new Date(a.data_checkin || a.criado_em || "").getTime();
        const db = new Date(b.data_checkin || b.criado_em || "").getTime();
        return db - da;
      })[0];
  }, [guests]);

  if (loading) {
    return (
      <section className="card full">
        <h2>Carregando dashboard...</h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card full">
        <h2>Erro ao carregar dados</h2>
        <p>{error}</p>
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="full kpis">
        <div className="card">
          <strong>{total}</strong>
          <p>Total</p>
        </div>

        <div className="card">
          <strong>{confirmados}</strong>
          <p>Confirmados</p>
        </div>

        <div className="card">
          <strong>{pendentes}</strong>
          <p>Pendentes</p>
        </div>

        <div className="card">
          <strong>{entradas}</strong>
          <p>Entradas</p>
        </div>

        <div className="card">
          <strong>{restantes}</strong>
          <p>Restantes</p>
        </div>
      </div>

      <section className="card full">
        <h2>Última entrada</h2>

        {ultimaEntrada ? (
          <div className="guest" style={{ borderColor: "#c7a64a" }}>
            <div>
              <strong>{ultimaEntrada.nome}</strong>
              <p>
                {ultimaEntrada.telefone || "Sem telefone"} · Token {ultimaEntrada.token}
              </p>
            </div>

            <span className="badge entrou">entrou</span>
          </div>
        ) : (
          <p style={{ opacity: 0.6 }}>Nenhuma entrada registrada ainda.</p>
        )}
      </section>

      <section className="card full">
        <h2>Convidados</h2>

        <div className="list">
          {guests.map((g) => {
            const statusFinal = g.checkin_realizado ? "entrou" : g.status_rsvp;

            return (
              <div key={g.id} className="guest">
                <div>
                  <strong>{g.nome}</strong>
                  <p>
                    {g.telefone || "Sem telefone"} · Token {g.token}
                  </p>
                </div>

                <span className={`badge ${statusFinal}`}>
                  {statusFinal}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
