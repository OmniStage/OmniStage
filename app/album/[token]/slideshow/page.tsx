"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

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

const INTERVALO_SLIDE = 6000;
const INTERVALO_POLL = 30000;

export default function SlideshowPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
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
  const [pausado, setPausado] = useState(false);
  const [mutado, setMutado] = useState(false);
  const controleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const slideTimerRef = useRef<ReturnType<typeof setInterval>>();
  const videoRef = useRef<HTMLVideoElement>(null);

  const carregar = useCallback(async (silent = false) => {
    const res = await fetch(`/api/album?token=${token}`);
    if (!res.ok) { if (!silent) setErro("Álbum não encontrado"); setLoading(false); return; }
    const json = await res.json();
    if (!silent) {
      setEvento(json.evento);
      setAlbumNome(json.album?.nome || "");
      setLoading(false);
    }
    const novas = (json.midias || []) as Midia[];
    setMidias((prev) => {
      if (prev.length > 0 && novas.length > prev.length) setNovaFoto(true);
      return novas;
    });
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const interval = setInterval(() => carregar(true), INTERVALO_POLL);
    return () => clearInterval(interval);
  }, [carregar]);

  // Avanço automático — respeita pausa e vídeos
  const avancar = useCallback(() => {
    setVisivel(false);
    setTimeout(() => {
      setIdx((i) => (i + 1) % midias.length);
      setVisivel(true);
    }, 800);
  }, [midias.length]);

  useEffect(() => {
    if (midias.length < 2 || pausado) return;
    const midia = midias[idx];
    // Para vídeos, deixa tocar; o timer é mais longo
    const duracao = midia?.tipo === "video" ? 12000 : INTERVALO_SLIDE;
    slideTimerRef.current = setInterval(avancar, duracao);
    return () => clearInterval(slideTimerRef.current);
  }, [midias, idx, pausado, avancar]);

  useEffect(() => {
    if (!novaFoto) return;
    const t = setTimeout(() => setNovaFoto(false), 4000);
    return () => clearTimeout(t);
  }, [novaFoto]);

  // Atualiza mudo no vídeo
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = mutado;
  }, [mutado, idx]);

  function mostrarControles() {
    setControlesVisiveis(true);
    clearTimeout(controleTimerRef.current);
    controleTimerRef.current = setTimeout(() => setControlesVisiveis(false), 3000);
  }

  function togglePausa(e: React.MouseEvent) {
    e.stopPropagation();
    setPausado((p) => !p);
    mostrarControles();
  }

  function toggleMudo(e: React.MouseEvent) {
    e.stopPropagation();
    setMutado((m) => !m);
    mostrarControles();
  }

  function navegar(direcao: 1 | -1, e: React.MouseEvent) {
    e.stopPropagation();
    setVisivel(false);
    setTimeout(() => {
      setIdx((i) => (i + direcao + midias.length) % midias.length);
      setVisivel(true);
    }, 300);
    mostrarControles();
  }

  function sair(e: React.MouseEvent) {
    e.stopPropagation();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.back();
  }

  const podeFullscreen = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  function toggleFullscreen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!podeFullscreen) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
    mostrarControles();
  }

  const midia = midias[idx];
  const logo = evento?.logo_url || evento?.logo_image || "";
  const temVideo = midia?.tipo === "video";

  if (loading) return <div style={pageStyle}><div style={centerStyle}>Carregando slideshow...</div></div>;
  if (erro) return <div style={pageStyle}><div style={{ ...centerStyle, color: "#f87171" }}>{erro}</div></div>;
  if (midias.length === 0) return (
    <div style={pageStyle}>
      <div style={centerStyle}>
        <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.3 }}>📷</div>
        <p style={{ fontSize: 20, color: "#94a3b8", fontWeight: 600 }}>Aguardando fotos...</p>
        <p style={{ fontSize: 14, color: "#475569", marginTop: 8 }}>Convidados ainda não enviaram fotos.</p>
      </div>
    </div>
  );

  return (
    <div style={pageStyle} onClick={mostrarControles}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; overflow: hidden; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes ken-burns { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes popIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.7); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        .foto-bg { animation: ken-burns ${INTERVALO_SLIDE}ms ease-out forwards; }
        .info-box { animation: slideUp 0.6s ease-out; }
        .nova-badge { animation: pulse 1s ease-in-out 3; }
        .ctrl-btn { transition: opacity 0.25s, transform 0.15s; }
        .ctrl-btn:active { transform: scale(0.9); }
      `}</style>

      {/* MÍDIA DE FUNDO */}
      {midia && (
        <div key={midia.id} style={{ position: "absolute", inset: 0, transition: "opacity 0.8s ease", opacity: visivel ? 1 : 0 }}>
          {midia.tipo === "video" ? (
            <video
              ref={videoRef}
              src={midia.arquivo_url}
              autoPlay
              playsInline
              loop
              muted={mutado}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              className="foto-bg"
              src={midia.arquivo_url}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.45) 100%)" }} />
        </div>
      )}

      {/* TOPO */}
      <div style={topoStyle}>
        {logo && <img src={logo} alt="" style={logoStyle} />}
        <div style={{ flex: 1 }}>
          <p style={eventoNomeStyle}>{evento?.nome}</p>
          <p style={albumNomeStyle}>{albumNome}</p>
        </div>
      </div>

      {/* CONTROLES — aparecem ao tocar */}
      {controlesVisiveis && (
        <>
          {/* Fechar / Sair */}
          <button className="ctrl-btn" onClick={sair} style={fecharBtnStyle} title="Sair da apresentação">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Fullscreen — só desktop */}
          {podeFullscreen && (
            <button className="ctrl-btn" onClick={toggleFullscreen} style={fsBtnStyle} title={fullscreen ? "Sair do fullscreen" : "Fullscreen"}>
              {fullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                  <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
              )}
            </button>
          )}

          {/* Áudio — só para vídeos */}
          {temVideo && (
            <button className="ctrl-btn" onClick={toggleMudo} style={audioBtnStyle} title={mutado ? "Ativar som" : "Silenciar"}>
              {mutado ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              )}
            </button>
          )}

          {/* Setas */}
          <button className="ctrl-btn" onClick={(e) => navegar(-1, e)} style={{ ...navBtn, left: 20 }}>‹</button>
          <button className="ctrl-btn" onClick={(e) => navegar(1, e)} style={{ ...navBtn, right: 20 }}>›</button>

          {/* Play/Pause — centro */}
          <button className="ctrl-btn" onClick={togglePausa} style={playPauseBtnStyle}>
            {pausado ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            )}
          </button>
        </>
      )}

      {/* RODAPÉ */}
      {midia && visivel && (
        <div className="info-box" style={rodapeStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {midia.uploader_nome && <p style={autorStyle}>{midia.uploader_nome}</p>}
            {midia.legenda && <p style={legendaStyle}>"{midia.legenda}"</p>}
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
        <div className="nova-badge" style={novaBadgeStyle}>📸 Nova foto adicionada!</div>
      )}

      {/* INDICADOR PAUSADO */}
      {pausado && !controlesVisiveis && (
        <div style={pausadoStyle}>⏸</div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "#000", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" };
const centerStyle: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" };
const topoStyle: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, padding: "20px 80px 20px 24px", display: "flex", alignItems: "center", gap: 14, zIndex: 10 };
const logoStyle: React.CSSProperties = { width: 48, height: 48, borderRadius: 10, objectFit: "contain" as const, background: "rgba(255,255,255,0.1)", padding: 4, flexShrink: 0 };
const eventoNomeStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" as const };
const albumNomeStyle: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 2 };
const rodapeStyle: React.CSSProperties = { position: "absolute", bottom: 52, left: 0, right: 0, padding: "0 36px", zIndex: 10, display: "flex", alignItems: "flex-end", gap: 20 };
const autorStyle: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)", marginBottom: 4 };
const legendaStyle: React.CSSProperties = { fontSize: 16, color: "rgba(255,255,255,0.85)", fontStyle: "italic", lineHeight: 1.5, textShadow: "0 1px 4px rgba(0,0,0,0.6)", maxWidth: 700 };
const contadorStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 };
const idxStyle: React.CSSProperties = { fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1 };
const totalStyle: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 };
const dotsStyle: React.CSSProperties = { position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 10, flexWrap: "wrap" as const, padding: "0 40px" };
const dotStyle: React.CSSProperties = { width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.3)", transition: "all 0.3s" };
const dotAtivoStyle: React.CSSProperties = { width: 22, borderRadius: 3, background: "#fff" };
const novaBadgeStyle: React.CSSProperties = { position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(124,58,237,0.9)", color: "#fff", padding: "10px 20px", borderRadius: 100, fontSize: 14, fontWeight: 700, zIndex: 20, backdropFilter: "blur(8px)", whiteSpace: "nowrap" as const };
const ctrlBase: React.CSSProperties = { position: "absolute", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer", borderRadius: "50%" };
const fecharBtnStyle: React.CSSProperties = { ...ctrlBase, top: 20, right: 20, width: 42, height: 42 };
const fsBtnStyle: React.CSSProperties = { ...ctrlBase, top: 20, right: 72, width: 42, height: 42 };
const audioBtnStyle: React.CSSProperties = { ...ctrlBase, top: 20, right: 122, width: 42, height: 42 };
const navBtn: React.CSSProperties = { ...ctrlBase, top: "50%", transform: "translateY(-50%)", width: 50, height: 50, fontSize: 28, color: "#fff", lineHeight: 1 };
const playPauseBtnStyle: React.CSSProperties = { ...ctrlBase, top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 72, height: 72, borderRadius: "50%", animation: "popIn 0.2s ease-out" };
const pausadoStyle: React.CSSProperties = { position: "absolute", bottom: 100, right: 24, fontSize: 22, opacity: 0.5, zIndex: 10 };
