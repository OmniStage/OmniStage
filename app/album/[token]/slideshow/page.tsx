"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Midia = {
  id: string;
  arquivo_url: string;
  tipo: "image" | "video";
  uploader_nome: string | null;
  legenda: string | null;
  criado_em: string;
};

type Evento = {
  nome: string;
  logo_url?: string | null;
  logo_image?: string | null;
};

const INTERVALO_SLIDE = 6000;   // ms entre fotos
const INTERVALO_POLL = 30000;   // ms para buscar novas fotos

export default function SlideshowPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [midias, setMidias] = useState<Midia[]>([]);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [albumNome, setAlbumNome] = useState("");
  const [idx, setIdx] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const [novaFoto, setNovaFoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [controlesVisiveis, setControlesVisiveis] = useState(false);
  const controleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const carregar = useCallback(async (silent = false) => {
    const res = await fetch(`/api/album?token=${token}`);
    if (!res.ok) { if (!silent) setErro("Álbum não encontrado"); setLoading(false); return; }
    const json = await res.json();
    if (!silent) {
      setEvento(json.evento);
      setAlbumNome(json.album?.nome || "");
      setLoading(false);
    }
    const novas = (json.midias || []).filter((m: Midia) => m.tipo === "image");
    setMidias((prev) => {
      if (prev.length > 0 && novas.length > prev.length) setNovaFoto(true);
      return novas;
    });
  }, [token]);

  // Carga inicial
  useEffect(() => { carregar(); }, [carregar]);

  // Polling para novas fotos
  useEffect(() => {
    const interval = setInterval(() => carregar(true), INTERVALO_POLL);
    return () => clearInterval(interval);
  }, [carregar]);

  // Avanço automático
  useEffect(() => {
    if (midias.length < 2) return;
    const timer = setInterval(() => {
      setVisivel(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % midias.length);
        setVisivel(true);
      }, 800);
    }, INTERVALO_SLIDE);
    return () => clearInterval(timer);
  }, [midias.length]);

  // Badge "nova foto" some após 4s
  useEffect(() => {
    if (!novaFoto) return;
    const t = setTimeout(() => setNovaFoto(false), 4000);
    return () => clearTimeout(t);
  }, [novaFoto]);

  function mostrarControles() {
    setControlesVisiveis(true);
    clearTimeout(controleTimerRef.current);
    controleTimerRef.current = setTimeout(() => setControlesVisiveis(false), 3000);
  }

  const podeFullscreen = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  function toggleFullscreen() {
    if (!podeFullscreen) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  }

  const midia = midias[idx];
  const logo = evento?.logo_url || evento?.logo_image || "";

  if (loading) return (
    <div style={pageStyle}>
      <div style={centerStyle}>Carregando slideshow...</div>
    </div>
  );

  if (erro) return (
    <div style={pageStyle}>
      <div style={{ ...centerStyle, color: "#f87171" }}>{erro}</div>
    </div>
  );

  if (midias.length === 0) return (
    <div style={pageStyle}>
      <div style={centerStyle}>
        <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.3 }}>📷</div>
        <p style={{ fontSize: 20, color: "#94a3b8", fontWeight: 600 }}>Aguardando fotos...</p>
        <p style={{ fontSize: 14, color: "#475569", marginTop: 8 }}>Convidados ainda não enviaram fotos para este álbum.</p>
      </div>
    </div>
  );

  return (
    <div style={pageStyle} onClick={mostrarControles}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; overflow: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes ken-burns { from { transform: scale(1); } to { transform: scale(1.08); } }
        .foto-bg { animation: ken-burns ${INTERVALO_SLIDE}ms ease-out forwards; }
        .info-box { animation: slideUp 0.6s ease-out; }
        .nova-badge { animation: pulse 1s ease-in-out 3; }
      `}</style>

      {/* FOTO DE FUNDO */}
      {midia && (
        <div key={midia.id} style={{ position: "absolute", inset: 0, transition: `opacity 0.8s ease`, opacity: visivel ? 1 : 0 }}>
          <img
            className="foto-bg"
            src={midia.arquivo_url}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Overlay gradiente */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)" }} />
        </div>
      )}

      {/* TOPO — logo + nome do evento */}
      <div style={topoStyle}>
        {logo && <img src={logo} alt="" style={logoStyle} />}
        <div>
          <p style={eventoNomeStyle}>{evento?.nome}</p>
          <p style={albumNomeStyle}>{albumNome}</p>
        </div>
      </div>

      {/* RODAPÉ — nome do autor + legenda + contador */}
      {midia && visivel && (
        <div className="info-box" style={rodapeStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {midia.uploader_nome && (
              <p style={autorStyle}>{midia.uploader_nome}</p>
            )}
            {midia.legenda && (
              <p style={legendaStyle}>"{midia.legenda}"</p>
            )}
          </div>
          <div style={contadorStyle}>
            <span style={idxStyle}>{idx + 1}</span>
            <span style={totalStyle}>/ {midias.length}</span>
          </div>
        </div>
      )}

      {/* DOTS */}
      {midias.length <= 20 && (
        <div style={dotsStyle}>
          {midias.map((_, i) => (
            <div key={i} style={{ ...dotStyle, ...(i === idx ? dotAtivoStyle : {}) }} />
          ))}
        </div>
      )}

      {/* BADGE nova foto */}
      {novaFoto && (
        <div className="nova-badge" style={novaBadgeStyle}>
          📸 Nova foto adicionada!
        </div>
      )}

      {/* BOTÃO FULLSCREEN — só no desktop com suporte */}
      {podeFullscreen && controlesVisiveis && (
      <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} style={fsBtn} title={fullscreen ? "Sair do fullscreen" : "Fullscreen"}>
        {fullscreen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
            <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        )}
      </button>
      )}

      {/* NAVEGAÇÃO manual — só aparece ao tocar */}
      {controlesVisiveis && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setVisivel(false); setTimeout(() => { setIdx(i => (i - 1 + midias.length) % midias.length); setVisivel(true); }, 300); }}
            style={{ ...navBtn, left: 20 }}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); setVisivel(false); setTimeout(() => { setIdx(i => (i + 1) % midias.length); setVisivel(true); }, 300); }}
            style={{ ...navBtn, right: 20 }}>›</button>
        </>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "#000", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" };
const centerStyle: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" };

const topoStyle: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, padding: "24px 32px", display: "flex", alignItems: "center", gap: 16, zIndex: 10 };
const logoStyle: React.CSSProperties = { width: 52, height: 52, borderRadius: 12, objectFit: "contain", background: "rgba(255,255,255,0.1)", padding: 4 };
const eventoNomeStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" };
const albumNomeStyle: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 2, textShadow: "0 2px 8px rgba(0,0,0,0.5)" };

const rodapeStyle: React.CSSProperties = { position: "absolute", bottom: 60, left: 0, right: 0, padding: "0 40px", zIndex: 10, display: "flex", alignItems: "flex-end", gap: 20 };
const autorStyle: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)", marginBottom: 4 };
const legendaStyle: React.CSSProperties = { fontSize: 17, color: "rgba(255,255,255,0.85)", fontStyle: "italic", lineHeight: 1.5, textShadow: "0 1px 4px rgba(0,0,0,0.6)", maxWidth: 700 };
const contadorStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 };
const idxStyle: React.CSSProperties = { fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1 };
const totalStyle: React.CSSProperties = { fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 500 };

const dotsStyle: React.CSSProperties = { position: "absolute", bottom: 24, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 10, flexWrap: "wrap", padding: "0 40px" };
const dotStyle: React.CSSProperties = { width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.3)", transition: "all 0.3s" };
const dotAtivoStyle: React.CSSProperties = { width: 22, borderRadius: 3, background: "#fff" };

const novaBadgeStyle: React.CSSProperties = { position: "absolute", top: 24, right: 80, background: "rgba(124,58,237,0.9)", color: "#fff", padding: "10px 20px", borderRadius: 100, fontSize: 14, fontWeight: 700, zIndex: 20, backdropFilter: "blur(8px)" };

const fsBtn: React.CSSProperties = { position: "absolute", top: 24, right: 24, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 };

const navBtn: React.CSSProperties = { position: "absolute", top: "50%", transform: "translateY(-50%)", width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, lineHeight: 1 };
