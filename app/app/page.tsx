"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function App() {
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
    <div style={{ padding: 40 }}>
      <h1>Área do Cliente</h1>

      <button onClick={() => window.location.href = "/app/eventos/novo"}>
        Criar Evento
      </button>
    </div>
  );
}
