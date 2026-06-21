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
  const [toast, setToast] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("tenant_members").select("tenant_id").eq("user_id", user.id).maybeSingle();
    if (!membership?.tenant_id) { setLoading(false); return; }

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

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function formatarData(d: string | null) {
    if (!d) return "";
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <p style={kickerStyle}>ÁLBUM COMPARTILHADO</p>
        <h1 style={tituloStyle}>Álbuns de Fotos</h1>
        <p style={subStyle}>Crie álbuns por evento e compartilhe com os convidados via QR Code ou link.</p>
      </div>

      {loading ? (
        <p style={loadingStyle}>Carregando eventos...</p>
      ) : eventos.length === 0 ? (
        <p style={emptyStyle}>Nenhum evento encontrado.</p>
      ) : (
        <div style={gridStyle}>
          {eventos.map((ev) => (
            <div key={ev.id} style={cardStyle}>
              <div style={cardTopStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={eventNameStyle}>{ev.nome}</p>
                  {ev.data_evento && <p style={eventDateStyle}>{formatarData(ev.data_evento)}</p>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={badgeStyle}>{ev.total_albums} {ev.total_albums === 1 ? "álbum" : "álbuns"}</div>
                  {ev.total_midias > 0 && <div style={{ ...badgeStyle, background: "rgba(16,185,129,0.08)", color: "#059669" }}>{ev.total_midias} mídias</div>}
                </div>
              </div>
              <div style={actionsStyle}>
                <Link href={`/app/eventos/${ev.id}/album`} style={btnPrimStyle}>
                  Gerenciar álbuns →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

const pageStyle: React.CSSProperties = { maxWidth: 860, margin: "0 auto" };
const headerStyle: React.CSSProperties = { marginBottom: 32 };
const kickerStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "var(--primary, #7c3aed)", fontWeight: 700, marginBottom: 4 };
const tituloStyle: React.CSSProperties = { fontSize: 30, fontWeight: 800, margin: "0 0 6px", color: "var(--text)" };
const subStyle: React.CSSProperties = { fontSize: 14, color: "var(--muted)", margin: 0 };
const loadingStyle: React.CSSProperties = { color: "var(--muted)", padding: 40 };
const emptyStyle: React.CSSProperties = { color: "var(--muted)", padding: 60, textAlign: "center" };
const gridStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10 };
const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 };
const cardTopStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const };
const eventNameStyle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 };
const eventDateStyle: React.CSSProperties = { fontSize: 13, color: "var(--muted)", margin: "2px 0 0" };
const badgeStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--primary, #7c3aed)", background: "rgba(124,58,237,0.08)", borderRadius: 100, padding: "4px 10px", whiteSpace: "nowrap" as const };
const actionsStyle: React.CSSProperties = { display: "flex", gap: 8 };
const btnPrimStyle: React.CSSProperties = { padding: "9px 18px", borderRadius: 11, background: "var(--primary, #7c3aed)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" };
const toastStyle: React.CSSProperties = { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1e1e2e", color: "#fff", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 200, whiteSpace: "nowrap" as const };
