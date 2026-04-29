"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AppPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verificarUsuario() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(data.user.email || "");
      setLoading(false);
    }

    verificarUsuario();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#020617", color: "#fff", padding: 48 }}>
        <h1>Carregando...</h1>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "#fff", padding: 48 }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 44, marginBottom: 8 }}>Área do Cliente</h1>
            <p style={{ color: "#94a3b8" }}>Logado como {email}</p>
          </div>

          <button
            onClick={sair}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sair
          </button>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 36, marginBottom: 36 }}>
          <button
            onClick={() => (window.location.href = "/events/new")}
            style={{
              padding: "16px 24px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 16px 36px rgba(124,58,237,0.35)",
            }}
          >
            Criar evento
          </button>

          <button
            onClick={() => (window.location.href = "/invites")}
            style={{
              padding: "16px 24px",
              borderRadius: 14,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Convites
          </button>
        </div>

        <div
          style={{
            border: "1px solid rgba(167,139,250,0.24)",
            background: "rgba(15,23,42,0.72)",
            borderRadius: 24,
            padding: 32,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Meus eventos</h2>
          <p style={{ color: "#94a3b8" }}>
            Seus eventos aparecerão aqui depois que forem criados.
          </p>
        </div>
      </section>
    </main>
  );
}
