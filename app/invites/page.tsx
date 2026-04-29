"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function InvitesPage() {
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    const loadInvites = async () => {
      const { data, error } = await supabase
        .from("convidados")
        .select("*")
        .limit(10);

      if (error) {
        console.error(error);
        return;
      }

      setInvites(data || []);
    };

    loadInvites();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Convites</h1>

      <button
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "gold",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
        onClick={() => (window.location.href = "/invites/new")}
      >
        Criar Convite
      </button>

      <div style={{ marginTop: 30 }}>
        {invites.length === 0 ? (
          <p>Nenhum convite encontrado</p>
        ) : (
          invites.map((invite) => (
            <div
              key={invite.id}
              style={{
                padding: 15,
                border: "1px solid #333",
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <strong>{invite.nome}</strong>
              <p>{invite.email}</p>
              <p>Status: {invite.status_rsvp}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
