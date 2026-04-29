"use client";
console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10));

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function DashboardClient() {
  const [status, setStatus] = useState("Carregando...");
  const [dados, setDados] = useState<any[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("convidados")
        .select("*");

      if (error) {
        setErro(`${error.code || ""} - ${error.message}`);
        setStatus("Erro");
        return;
      }

      setDados(data || []);
      setStatus("Conectado");
    }

    carregar();
  }, []);

  return (
    <section className="card full">
      <h2>Diagnóstico Supabase</h2>

      <p>Status: {status}</p>
      <p>Registros encontrados: {dados.length}</p>

      {erro && (
        <>
          <h3>Erro:</h3>
          <p>{erro}</p>
        </>
      )}

      <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
        {JSON.stringify(dados, null, 2)}
      </pre>
    </section>
  );
}
