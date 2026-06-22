"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Midia = {
  id: string;
  arquivo_url: string;
  tipo: "image" | "video";
  uploader_nome: string | null;
  legenda: string | null;
  curtidas: number;
};

const INTERVALO_SLIDE = 6000;

export default function SlideshowConfigPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [midias, setMidias] = useState<Midia[]>([]);
  const [idx, setIdx] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [controlesVisiveis, setControlesVisiveis] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [mutado, setMutado] = useState(true);
  const [orientacao, setOrientacao] = useState<"horizontal" | "vertical">("horizontal");
  const controleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const slideTimerRef = useRef<ReturnType<typeof setInterval>>();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function carregar() {
      const res = await fetch(`/api/slideshow/${id}`);
      if (!res.ok) { setErro("Configuração não encontrada"); setLoading(false); return; }
      const json = await res.json();
      setMidias(json.midias || []);
      setLoading(false);
    }
    carregar();
  }, [id]);

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
    const duracao = midia?.tipo === "video" ? 12000 : INTERVALO_SLIDE;
    slideTimerRef.current = setInterval(avancar, duracao);
    return () => clearInterval(slideTimerRef.current);
  }, [midias, idx, pausado, avancar]);

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

  function toggleFullscreen(e: React.MouseEvent) {
    e.stopPropagation();
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

  if (loading) return <div style={pageStyle}><div style={centerStyle}>Carregando slideshow...</div></div>;
  if (erro) return <div style={pageStyle}><div style={{ ...centerStyle, color: "#f87171" }}>{erro}</div></div>;
  if (midias.length === 0) return (
    <div style={pageStyle}>
      <div style={centerStyle}>
        <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.3 }}>📷</div>
        <p style={{ fontSize: 20, color: "#94a3b8", fontWeight: 600 }}>Nenhuma foto selecionada.</p>
      </div>
    </div>
  );

  return (
    <div style={pageStyle} onClick={mostrarControles}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; overflow: hidden; }
        @keyframes ken-burns { from { transform: scale(1); } to { transform: scale(1.08); } }
        .foto-bg { animation: ken-burns ${INTERVALO_SLIDE}ms ease-out forwards; }
        .ctrl-btn { transition: opacity 0.25s, transform 0.15s; }
        .ctrl-btn:active { transform: scale(0.9); }
      `}</style>

      {/* MÍDIA */}
      {midia && (
        <div key={midia.id} style={{ position: "absolute", inset: 0, transition: "opacity 0.8s ease", opacity: visivel ? 1 : 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {orientacao === "vertical" ? (
            /* Modo vertical: container 9:16 centralizado */
            <div style={{ position: "relative", height: "100%", aspectRatio: "9/16", maxWidth: "100%", overflow: "hidden", flexShrink: 0 }}>
              {midia.tipo === "video"
                ? <video ref={videoRef} src={midia.arquivo_url} autoPlay playsInline muted={mutado} onEnded={avancar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <img className="foto-bg" src={midia.arquivo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              }
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%)" }} />
            </div>
          ) : (
            /* Modo horizontal: tela cheia */
            <>
              {midia.tipo === "video"
                ? <video ref={videoRef} src={midia.arquivo_url} autoPlay playsInline muted={mutado} onEnded={avancar} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                : <img className="foto-bg" src={midia.arquivo_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              }
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%)" }} />
            </>
          )}
        </div>
      )}

      {/* INFO */}
      {midia && (midia.legenda || midia.uploader_nome) && (
        <div style={{ position: "absolute", bottom: 72, left: 32, right: 32, zIndex: 10 }}>
          {midia.legenda && <p style={{ fontSize: 22, color: "#fff", fontStyle: "italic", fontWeight: 500, textShadow: "0 2px 12px rgba(0,0,0,0.7)", marginBottom: 4 }}>"{midia.legenda}"</p>}
          {midia.uploader_nome && <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>— {midia.uploader_nome}</p>}
        </div>
      )}

      {/* CONTADOR */}
      <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 5 }}>
        {midias.map((_, i) => (
          <div key={i} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, background: i === idx ? "#fff" : "rgba(255,255,255,0.35)", transition: "all 0.3s" }} />
        ))}
      </div>

      {/* CONTROLES */}
      <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: controlesVisiveis ? "auto" : "none", opacity: controlesVisiveis ? 1 : 0, transition: "opacity 0.3s" }}>
        {/* Botões topo direita */}
        <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 10 }}>
          {/* Orientação */}
          <button className="ctrl-btn" onClick={(e) => { e.stopPropagation(); setOrientacao(o => o === "horizontal" ? "vertical" : "horizontal"); mostrarControles(); }} style={ctrlBtnStyle} title={orientacao === "horizontal" ? "Modo vertical" : "Modo horizontal"}>
            {orientacao === "horizontal"
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
            }
          </button>
          <button className="ctrl-btn" onClick={toggleMudo} style={ctrlBtnStyle} title={mutado ? "Ativar som" : "Silenciar"}>
            {mutado
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            }
          </button>
          <button className="ctrl-btn" onClick={toggleFullscreen} style={ctrlBtnStyle} title="Tela cheia">
            {fullscreen
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            }
          </button>
        </div>

        {/* Play/Pause centro */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
          <button className="ctrl-btn" onClick={togglePausa} style={{ ...ctrlBtnStyle, width: 64, height: 64 }}>
            {pausado
              ? <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            }
          </button>
        </div>

        {/* Navegar */}
        <button className="ctrl-btn" onClick={(e) => navegar(-1, e)} style={{ ...ctrlBtnStyle, position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button className="ctrl-btn" onClick={(e) => navegar(1, e)} style={{ ...ctrlBtnStyle, position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "'Inter', sans-serif", overflow: "hidden" };
const centerStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12 };
const ctrlBtnStyle: React.CSSProperties = { width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
