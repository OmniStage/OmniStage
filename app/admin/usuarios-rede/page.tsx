"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  email: string;
};

type Network = {
  id: string;
  nome: string;
};

type Member = {
  user_id: string;
  network_id: string;
};

export default function UsuariosRedePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  async function carregarDados() {
    const [{ data: usersData }, { data: networksData }, { data: membersData }] =
      await Promise.all([
        supabase.from("profiles").select("id, email"),
        supabase.from("networks").select("id, nome"),
        supabase.from("network_members").select("user_id, network_id"),
      ]);

    setUsers(usersData || []);
    setNetworks(networksData || []);
    setMembers(membersData || []);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function usuarioTemRede(userId: string, networkId: string) {
    return members.some(
      (m) => m.user_id === userId && m.network_id === networkId
    );
  }

  async function toggleVinculo(userId: string, networkId: string) {
    setLoading(true);

    if (usuarioTemRede(userId, networkId)) {
      await supabase
        .from("network_members")
        .delete()
        .eq("user_id", userId)
        .eq("network_id", networkId);
    } else {
      await supabase.from("network_members").insert({
        user_id: userId,
        network_id: networkId,
        role: "member",
      });
    }

    setLoading(false);
    carregarDados();
  }

  return (
    <main style={{ padding: 40, color: "#fff" }}>
      <h1>Usuários x Redes</h1>

      <p style={{ color: "#94a3b8" }}>
        Vincule quais usuários podem acessar cada rede/franquia.
      </p>

      <div style={{ marginTop: 30 }}>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              border: "1px solid #334155",
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              background: "#020617",
            }}
          >
            <strong>{user.email}</strong>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {networks.map((network) => {
                const ativo = usuarioTemRede(user.id, network.id);

                return (
                  <button
                    key={network.id}
                    onClick={() => toggleVinculo(user.id, network.id)}
                    disabled={loading}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: ativo
                        ? "1px solid #22c55e"
                        : "1px solid #64748b",
                      background: ativo ? "#065f46" : "transparent",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {network.nome}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
