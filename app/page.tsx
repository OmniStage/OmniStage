"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
      }
    };

    checkUser();
  }, []);

  return (
    <main className="page">
      <div className="shell">
        <h1>Área do Cliente</h1>
        <p>Gerencie seus eventos, convidados, RSVP e check-in.</p>

        <div className="nav" style={{ marginTop: 24 }}>
          <button
            className="btn gold"
            onClick={() => (window.location.href = "/eventos/novo")}
          >
            Criar Evento
          </button>

          <button
            className="btn"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Ver Dashboard
          </button>

          <button
            className="btn"
            onClick={() => (window.location.href = "/checkin")}
          >
            Ir para Check-in
          </button>
        </div>
      </div>
    </main>
  );
}
