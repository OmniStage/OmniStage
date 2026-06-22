"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  total_albums: number;
  total_midias: number;
};

export default function AlbumListaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [tenantNome, setTenantNome] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id, tenants:tenant_id(nome)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership?.tenant_id) { setLoading(false); return; }

    const tenantNomeVal = Array.isArray((membership as any).tenants)
      ? (membership as any).tenants[0]?.nome
      : (membership as any).tenants?.nome;
    setTenantNome(tenantNomeVal || "");

    const { data: eventosData } = await supabase
      .from("eventos")
      .select("id, nome, data_evento")
      .eq("tenant_id", membership.tenant_id)
      .order("data_evento", { ascending: false });

    if (!eventosData) { setLoading(false); return; }

    const comContagem = await Promise.all(
      eventosData.map(async (ev) => {
        const { data: albs } = await supabase
          .from("albums").select("id").eq("evento_id", ev.id);
        const albumIds = (albs || []).map((a) => a.id);

        let total_midias = 0;
        if (albumIds.length > 0) {
          const { count } = await supabase
            .from("event_album")
            .select("*", { count: "exact", head: true })
            .in("album_id", albumIds);
          total_midias = count || 0;
        }

        return { ...ev, total_albums: albumIds.length, total_midias };
      })
    );

    setEventos(comContagem);
    setLoading(false);
  }

  function formatarData(d: string | null) {
    if (!d) return "";
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  }

  const filtrados = eventos.filter((ev) =>
    ev.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 32px", marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: "0.15em", color: "#7c3aed", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase" as const }}>OMNISTAGE APP</p>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 6px", color: "var(--text)", letterSpacing: "-0.03em" }}>Álbum Compartilhado</h1>
          {tenantNome && (
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
              Álbuns vinculados ao tenant {tenantNome}.
            </p>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 28px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 18px", color: "var(--text)" }}>Meus eventos</h2>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" as const }}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por evento"
            style={{ flex: 1, minWidth: 200, border: "1px solid var(--line)", borderRadius: 12, padding: "11px 16px", fontSize: 14, color: "var(--text)", background: "var(--bg)", outline: "none" }}
          />
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "11px 18px", fontSize: 14, fontWeight: 700, color: "var(--muted)", background: "var(--bg)", whiteSpace: "nowrap" as const }}>
            {filtrados.length} exibidos
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center" as const }}>Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center" as const }}>Nenhum evento encontrado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {filtrados.map((ev) => (
              <div key={ev.id} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>{ev.nome}</p>
                  {ev.data_evento && (
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "3px 0 0" }}>
                      Data: {formatarData(ev.data_evento)}
                      {ev.total_albums > 0 && ` · ${ev.total_albums} ${ev.total_albums === 1 ? "álbum" : "álbuns"}`}
                      {ev.total_midias > 0 && ` · ${ev.total_midias} mídias`}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={`/app/eventos/${ev.id}/album`}
                    style={{ padding: "9px 18px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                  >
                    Gerenciar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
