"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role")
      .order("email");

    if (error) {
      alert("Erro ao carregar usuários: " + error.message);
      return;
    }

    setUsuarios(data || []);
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 72, marginBottom: 16 }}>Usuários</h1>
      <p style={{ color: "#94a3b8", marginBottom: 32 }}>
        🟣 ADMIN — usuários cadastrados na plataforma.
      </p>

      <section style={{ display: "grid", gap: 16 }}>
        {usuarios.map((user) => (
          <div
            key={user.id}
            style={{
              background: "rgba(2,6,23,0.72)",
              border: "1px solid rgba(148,163,184,0.22)",
              borderRadius: 20,
              padding: 22,
            }}
          >
            <strong style={{ fontSize: 20 }}>{user.email}</strong>
            <p style={{ color: "#94a3b8" }}>Role: {user.role}</p>
            <small style={{ color: "#64748b" }}>{user.id}</small>
          </div>
        ))}
      </section>
    </main>
  );
}
