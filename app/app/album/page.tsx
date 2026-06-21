"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  album_token: string | null;
  total_midias?: number;
};

export default function AlbumListaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerandoToken, setGerandoToken] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    carregar();
  }, []);

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

    const { data: eventosData } = await supabase
      .from("eventos")
      .select("id, nome, data_evento, album_token")
      .eq("tenant_id", membership.tenant_id)
      .order("data_evento", { ascending: false });

    if (!eventosData) { setLoading(false); return; }

    // Conta mídias por evento
    const comContagem = await Promise.all(
      eventosData.map(async (ev) => {
        const { count } = await supabase
          .from("event_album")
          .select("*", { count: "exact", head: true })
          .eq("evento_id", ev.id);
        return { ...ev, total_midias: count || 0 };
      })
    );

    setEventos(comContagem);
    setLoading(false);
  }

  async function gerarToken(eventoId: string) {
    setGerandoToken(eventoId);
    const novoToken = `${eventoId.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;
    await supabase.from("eventos").update({ album_token: novoToken }).eq("id", eventoId);
    setEventos((prev) =>
      prev.map((ev) => ev.id === eventoId ? { ...ev, album_token: novoToken } : ev)
    );
    setGerandoToken(null);
    mostrarToast("Link do álbum gerado!");
  }

  function copiarLink(token: string) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    navigator.clipboard.writeText(`${base}/album/${token}`);
    mostrarToast("Link copiado!");
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
        <p style={subStyle}>Compartilhe um link com os convidados para que enviem fotos e vídeos do evento.</p>
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
                <div>
                  <p style={eventNameStyle}>{ev.nome}</p>
                  {ev.data_evento && (
                    <p style={eventDateStyle}>{formatarData(ev.data_evento)}</p>
                  )}
                </div>
                <div style={badgeStyle}>
                  {ev.total_midias} {ev.total_midias === 1 ? "item" : "itens"}
                </div>
              </div>

              {ev.album_token ? (
                <div style={linkAreaStyle}>
                  <span style={linkTextStyle} title={`/album/${ev.album_token}`}>
                    /album/{ev.album_token}
                  </span>
                  <div style={actionsStyle}>
                    <button style={btnSecStyle} onClick={() => copiarLink(ev.album_token!)}>
                      Copiar link
                    </button>
                    <a
                      href={`/album/${ev.album_token}`}
                      target="_blank"
                      rel="noreferrer"
                      style={btnPrimStyle}
                    >
                      Abrir
                    </a>
                    <Link href={`/app/eventos/${ev.id}/album`} style={btnSecStyle}>
                      Gerenciar
                    </Link>
                  </div>
                </div>
              ) : (
                <button
                  style={{ ...btnGerarStyle, opacity: gerandoToken === ev.id ? 0.6 : 1 }}
                  disabled={gerandoToken === ev.id}
                  onClick={() => gerarToken(ev.id)}
                >
                  {gerandoToken === ev.id ? "Gerando..." : "Gerar link do álbum"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { maxWidth: 860, margin: "0 auto" };
const headerStyle: React.CSSProperties = { marginBottom: 32 };
const kickerStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "var(--primary, #7c3aed)", fontWeight: 700, marginBottom: 4 };
const tituloStyle: React.CSSProperties = { fontSize: 30, fontWeight: 800, margin: "0 0 6px", color: "var(--text)" };
const subStyle: React.CSSProperties = { fontSize: 14, color: "var(--text-secondary, var(--muted))", margin: 0 };
const loadingStyle: React.CSSProperties = { color: "var(--muted)", padding: 40 };
const emptyStyle: React.CSSProperties = { color: "var(--muted)", padding: 60, textAlign: "center" };
const gridStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 18,
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const cardTopStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 };
const eventNameStyle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 };
const eventDateStyle: React.CSSProperties = { fontSize: 13, color: "var(--muted)", margin: "2px 0 0" };
const badgeStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "var(--primary, #7c3aed)",
  background: "rgba(124,58,237,0.08)", borderRadius: 100,
  padding: "4px 10px", whiteSpace: "nowrap",
};
const linkAreaStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10 };
const linkTextStyle: React.CSSProperties = {
  fontSize: 12, color: "var(--primary, #7c3aed)",
  background: "rgba(124,58,237,0.06)", padding: "8px 12px",
  borderRadius: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};
const actionsStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const btnPrimStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 10, background: "var(--primary, #7c3aed)",
  color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", border: "none", cursor: "pointer",
};
const btnSecStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 10,
  border: "1px solid var(--line)", background: "transparent",
  color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none",
};
const btnGerarStyle: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 12, border: "1px dashed var(--line)",
  background: "rgba(124,58,237,0.04)", color: "var(--primary, #7c3aed)",
  fontSize: 14, fontWeight: 600, cursor: "pointer", width: "fit-content",
};
const toastStyle: React.CSSProperties = {
  position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
  background: "#1e1e2e", color: "#fff", padding: "12px 24px",
  borderRadius: 100, fontSize: 14, fontWeight: 500,
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 200, whiteSpace: "nowrap",
};
