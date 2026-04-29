"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Guest = {
  id: string;
  nome: string;
  telefone: string | null;
  token: string;
  status_rsvp: string;
  checkin_realizado: boolean;
};

export function DashboardClient() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("convidados")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setGuests(data || []);
      }

      setLoading(false);
    }

    carregar();
  }, []);

  const total = guests.length;
  const confirmados = guests.filter((g) => g.status_rsvp === "confirmado").length;
  const pendentes = guests.filter((g) => g.status_rsvp === "pendente").length;
  const entradas = guests.filter((g) => g.checkin_realizado === true).length;

  if (loading) {
    return (
      <section className="card full">
        <h2>Carregando dados...</h2>
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
        <div className="card"><strong>{total}</strong><p>Total</p></div>
        <div className="card"><strong>{confirmados}</strong><p>Confirmados</p></div>
        <div className="card"><strong>{pendentes}</strong><p>Pendentes</p></div>
        <div className="card"><strong>{entradas}</strong><p>Entradas</p></div>
      </div>

      <section className="card full">
        <h2>Convidados</h2>

        <div className="list">
          {guests.length === 0 ? (
            <p style={{ opacity: 0.6 }}>Nenhum convidado encontrado no banco.</p>
          ) : (
            guests.map((g) => (
              <div key={g.id} className="guest">
                <div>
                  <strong>{g.nome}</strong>
                  <p>{g.telefone || "Sem telefone"} · Token {g.token}</p>
                </div>

                <span className={`badge ${g.checkin_realizado ? "entrou" : g.status_rsvp}`}>
                  {g.checkin_realizado ? "entrou" : g.status_rsvp}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
