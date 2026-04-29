"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ClientHomePage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(data.user.email || "");
    }

    checkUser();
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "#fff", padding: 48 }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 44, marginBottom: 8 }}>Área do Cliente</h1>
        <p style={{ color: "#94a3b8", marginBottom: 32 }}>
          Logado como {email}
        </p>

        <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
          <button
            onClick={() => (window.location.href = "/events/new")}
            style={{
              padding: "16px 24px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Criar evento
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            style={{
              padding: "16px 24px",
              borderRadius: 14,
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
