"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  tipo_evento: string | null;
  total_albums: number;
  total_fotos: number;
  total_videos: number;
};

export default function AlbumListaPage() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership?.tenant_id) { setLoading(false); return; }

    const res = await fetch(`/api/albums/stats?tenant_id=${membership.tenant_id}`);
    const json = await res.json();
    setEventos(json.eventos || []);
    setLoading(false);
  }

  function formatarData(d: string | null) {
    if (!d) return "";
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  }

  const filtrados = eventos.filter((ev) =>
    ev.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAlbuns = eventos.reduce((s, e) => s + e.total_albums, 0);
  const totalMidias = eventos.reduce((s, e) => s + e.total_fotos + e.total_videos, 0);
  const totalFotos = eventos.reduce((s, e) => s + e.total_fotos, 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 50%, #fff7ed 100%)", border: "1px solid var(--line)", borderRadius: 24, padding: "32px 36px", marginBottom: 28 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.15em", color: "#7c3aed", fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" as const }}>ÁLBUNS COMPARTILHADOS</p>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 8px", color: "var(--text)", letterSpacing: "-0.03em" }}>Álbum Compartilhado</h1>
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0 }}>Gerencie os álbuns de fotos e vídeos dos seus eventos.</p>
      </div>

      {/* Stats totais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "EVENTOS", value: eventos.length },
          { label: "ÁLBUNS", value: totalAlbuns },
          { label: "FOTOS", value: totalFotos },
          { label: "TOTAL DE MÍDIAS", value: totalMidias },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 22px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted)", margin: "0 0 8px", textTransform: "uppercase" as const }}>{label}</p>
            <p style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ position: "relative" as const, flex: 1 }}>
          <svg style={{ position: "absolute" as const, left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar evento..."
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 16px 11px 42px", fontSize: 14, color: "var(--text)", background: "var(--card)", outline: "none", boxSizing: "border-box" as const }}
          />
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" as const }}>
          {filtrados.length} evento{filtrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards de eventos */}
      {loading ? (
        <p style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" as const }}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "60px 32px", textAlign: "center" as const }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📷</p>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>Nenhum evento encontrado.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 16 }}>
          {filtrados.map((ev) => (
            <div key={ev.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 26px" }}>
              {/* Card header */}
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>{ev.nome}</h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {ev.tipo_evento && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(124,58,237,0.08)", color: "#7c3aed", letterSpacing: "0.05em" }}>
                      {ev.tipo_evento.toUpperCase()}
                    </span>
                  )}
                  {ev.data_evento && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--line)" }}>
                      {formatarData(ev.data_evento)}
                    </span>
                  )}
                </div>
              </div>

              {/* Mini stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
                {[
                  { label: "ÁLBUNS", value: ev.total_albums },
                  { label: "FOTOS", value: ev.total_fotos },
                  { label: "VÍDEOS", value: ev.total_videos },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Ações */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  onClick={() => router.push(`/app/eventos/${ev.id}/album`)}
                  style={{ padding: "11px 16px", borderRadius: 12, border: "none", background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Gerenciar álbuns
                </button>
                <button
                  onClick={() => router.push(`/app/eventos/${ev.id}/album?secao=slideshow`)}
                  style={{ padding: "11px 16px", borderRadius: 12, border: "1px solid var(--line)", background: "transparent", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: ev.total_fotos + ev.total_videos === 0 ? 0.4 : 1 }}
                  disabled={ev.total_fotos + ev.total_videos === 0}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  Slideshow
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
