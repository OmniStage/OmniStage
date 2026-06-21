"use client";

import { useEffect, useRef, useState } from "react";

type Midia = {
  id: string;
  arquivo_url: string;
  tipo: "image" | "video";
  uploader_nome: string | null;
  criado_em: string;
};

type Evento = {
  id: string;
  nome: string;
  data_evento?: string | null;
  background_url?: string | null;
  background_image?: string | null;
  logo_url?: string | null;
  logo_image?: string | null;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function AlbumPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [evento, setEvento] = useState<Evento | null>(null);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [convidados, setConvidados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [nomeUploader, setNomeUploader] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [modalMidia, setModalMidia] = useState<Midia | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);
  const [abaVisu, setAbaVisu] = useState<"grid" | "list">("grid");
  const [toast, setToast] = useState("");
  const [modalNome, setModalNome] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); }, [token]);

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/album?token=${token}`);
    const json = await res.json();
    if (!res.ok) { setErro(json.error || "Álbum não encontrado"); setLoading(false); return; }
    setEvento(json.evento);
    setMidias(json.midias);
    setConvidados(json.convidados || []);
    setLoading(false);
  }

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleNomeChange(valor: string) {
    setNomeUploader(valor);
    if (valor.trim().length < 2) { setSugestoes([]); return; }
    setSugestoes(convidados.filter((n) => n.toLowerCase().includes(valor.toLowerCase())).slice(0, 6));
  }

  function selecionarNome(nome: string) {
    setNomeUploader(nome);
    setSugestoes([]);
    setModalNome(false);
    setTimeout(() => fileInputRef.current?.click(), 100);
  }

  function abrirUpload() {
    if (!nomeUploader.trim()) {
      setModalNome(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arquivo = files[0];
    if (arquivo.size > MAX_FILE_SIZE) { mostrarToast("Arquivo muito grande. Máximo 50MB."); return; }
    setUploading(true);
    setUploadProgress(10);
    try {
      const res = await fetch("/api/album/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nome_arquivo: arquivo.name, tipo_mime: arquivo.type, uploader_nome: nomeUploader.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUploadProgress(50);
      const uploadRes = await fetch(json.signed_url, { method: "PUT", headers: { "Content-Type": arquivo.type }, body: arquivo });
      if (!uploadRes.ok) throw new Error("Falha no upload");
      setUploadProgress(90);
      await carregar();
      setUploadProgress(100);
      mostrarToast("Foto adicionada ao álbum!");
    } catch (e: any) {
      mostrarToast(e.message || "Erro no upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleSelecao(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function formatarData(d: string | null | undefined) {
    if (!d) return "";
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const bgUrl = evento?.background_url || evento?.background_image || "";
  const logoUrl = evento?.logo_url || evento?.logo_image || "";
  const midiasFiltradas = abaVisu === "list" ? midias : midias;

  if (loading) return <div style={centerStyle}>Carregando...</div>;
  if (erro) return <div style={{ ...centerStyle, color: "#f87171" }}>{erro}</div>;

  return (
    <div style={shellStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; }
        .thumb-item:active { opacity: 0.85; transform: scale(0.97); }
        .btn-camera:active { transform: scale(0.93); }
        .sugestao-btn:hover { background: rgba(255,255,255,0.06); }
      `}</style>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" capture="environment"
        style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />

      {/* ── HERO ─────────────────────────────────────────── */}
      <div style={heroStyle}>
        {bgUrl
          ? <img src={bgUrl} alt="" style={heroBgImgStyle} />
          : <div style={{ ...heroBgImgStyle, background: "linear-gradient(135deg,#1a0a2e,#2d1060)" }} />
        }
        <div style={heroOverlayStyle} />
        <div style={heroContentStyle}>
          {logoUrl && <img src={logoUrl} alt={evento?.nome} style={heroLogoStyle} />}
          <h1 style={heroTitleStyle}>{evento?.nome}</h1>
          {evento?.data_evento && <p style={heroDateStyle}>{formatarData(evento.data_evento)}</p>}
        </div>

        {/* Action row */}
        <div style={heroActionsStyle}>
          <button style={addBtnStyle} onClick={abrirUpload}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar fotos
          </button>
          <button style={iconBtnStyle} onClick={() => { setModoSelecao(!modoSelecao); setSelecionados(new Set()); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </button>
          {selecionados.size > 0 && (
            <button style={{ ...iconBtnStyle, background: "rgba(255,255,255,0.25)" }}
              onClick={() => { selecionados.forEach((id) => { const m = midias.find((x) => x.id === id); if (m) { const a = document.createElement("a"); a.href = m.arquivo_url; a.download = ""; a.target = "_blank"; a.click(); } }); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────── */}
      <div style={tabBarStyle}>
        <button style={{ ...tabBtnStyle, ...(abaVisu === "grid" ? tabActiveStyle : {}) }} onClick={() => setAbaVisu("grid")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </button>
        <button style={{ ...tabBtnStyle, ...(abaVisu === "list" ? tabActiveStyle : {}) }} onClick={() => setAbaVisu("list")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        {modoSelecao && selecionados.size > 0 && (
          <span style={selCountStyle}>{selecionados.size} selecionada{selecionados.size > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ── GRID / LIST ──────────────────────────────────── */}
      {midias.length === 0 ? (
        <div style={emptyStyle}>
          <div style={emptyIconStyle}>📷</div>
          <p style={{ margin: "8px 0 4px", fontWeight: 600, fontSize: 16 }}>Nenhuma foto ainda</p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Seja o primeiro a adicionar!</p>
        </div>
      ) : abaVisu === "grid" ? (
        <div style={gridStyle}>
          {midiasFiltradas.map((m) => {
            const sel = selecionados.has(m.id);
            return (
              <div key={m.id} className="thumb-item" style={{ ...gridItemStyle, ...(sel ? gridItemSelStyle : {}) }}
                onClick={() => modoSelecao ? toggleSelecao(m.id) : setModalMidia(m)}
                onContextMenu={(e) => { e.preventDefault(); setModoSelecao(true); toggleSelecao(m.id); }}>
                {m.tipo === "video"
                  ? <video src={m.arquivo_url} style={thumbMediaStyle} muted playsInline />
                  : <img src={m.arquivo_url} alt="" style={thumbMediaStyle} loading="lazy" />
                }
                {m.tipo === "video" && (
                  <div style={videoBadgeStyle}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </div>
                )}
                {m.uploader_nome && <div style={nameTagStyle}>{m.uploader_nome}</div>}
                {modoSelecao && (
                  <div style={{ ...checkCircleStyle, ...(sel ? checkCircleSelStyle : {}) }}>
                    {sel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "8px 0 100px" }}>
          {midiasFiltradas.map((m) => (
            <div key={m.id} style={listItemStyle} onClick={() => setModalMidia(m)}>
              {m.tipo === "video"
                ? <video src={m.arquivo_url} style={listThumbStyle} muted playsInline />
                : <img src={m.arquivo_url} alt="" style={listThumbStyle} loading="lazy" />
              }
              <div style={listInfoStyle}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{m.uploader_nome || "Anônimo"}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  {m.tipo === "video" ? "Vídeo" : "Foto"} · {new Date(m.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <a href={m.arquivo_url} download target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()} style={listDlBtnStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ── BOTTOM NAV ───────────────────────────────────── */}
      <div style={bottomNavStyle}>
        <div style={{ width: 44, height: 44 }} />
        <div style={{ width: 44, height: 44 }} />
        <button className="btn-camera" style={cameraBtnStyle} onClick={abrirUpload}>
          {uploading
            ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          }
        </button>
        <div style={{ width: 44, height: 44 }} />
        <div style={{ width: 44, height: 44 }} />
      </div>

      {/* ── PROGRESS BAR ─────────────────────────────────── */}
      {uploading && (
        <div style={progressWrapStyle}>
          <div style={{ ...progressBarStyle, width: `${uploadProgress}%` }} />
        </div>
      )}

      {/* ── MODAL NOME ───────────────────────────────────── */}
      {modalNome && (
        <div style={overlayStyle} onClick={() => setModalNome(false)}>
          <div style={nomeModalStyle} onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 17 }}>Qual é o seu nome?</p>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Digite seu nome..."
                value={nomeUploader}
                onChange={(e) => handleNomeChange(e.target.value)}
                autoFocus
                style={nomeInputStyle}
              />
              {sugestoes.length > 0 && (
                <div style={sugestoesStyle}>
                  {sugestoes.map((nome) => (
                    <button key={nome} className="sugestao-btn" style={sugestaoItemStyle}
                      onMouseDown={() => selecionarNome(nome)}>
                      {nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={modalSkipBtnStyle} onClick={() => { setModalNome(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                Pular
              </button>
              <button style={modalConfirmBtnStyle} onClick={() => { if (nomeUploader.trim()) { setModalNome(false); setTimeout(() => fileInputRef.current?.click(), 100); } }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ─────────────────────────────────────── */}
      {modalMidia && (
        <div style={overlayStyle} onClick={() => setModalMidia(null)}>
          <div style={lightboxStyle} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setModalMidia(null)}>✕</button>
            {modalMidia.tipo === "video"
              ? <video src={modalMidia.arquivo_url} controls autoPlay playsInline style={lightboxMediaStyle} />
              : <img src={modalMidia.arquivo_url} alt="" style={lightboxMediaStyle} />
            }
            <div style={lightboxFootStyle}>
              <div>
                {modalMidia.uploader_nome && <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>por {modalMidia.uploader_nome}</p>}
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{new Date(modalMidia.criado_em).toLocaleDateString("pt-BR")}</p>
              </div>
              <a href={modalMidia.arquivo_url} download target="_blank" rel="noreferrer" style={dlBtnStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Baixar
              </a>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const shellStyle: React.CSSProperties = { minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Inter', sans-serif", overflowX: "hidden", paddingBottom: 80 };
const centerStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif" };

// Hero
const heroStyle: React.CSSProperties = { position: "relative", height: 260, overflow: "hidden" };
const heroBgImgStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" };
const heroOverlayStyle: React.CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)" };
const heroContentStyle: React.CSSProperties = { position: "absolute", bottom: 60, left: 20, right: 20 };
const heroLogoStyle: React.CSSProperties = { width: 48, height: 48, objectFit: "contain", borderRadius: 10, marginBottom: 8, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" };
const heroTitleStyle: React.CSSProperties = { fontSize: 26, fontWeight: 800, margin: "0 0 2px", textShadow: "0 2px 8px rgba(0,0,0,0.6)" };
const heroDateStyle: React.CSSProperties = { fontSize: 14, margin: 0, color: "rgba(255,255,255,0.7)", fontWeight: 500 };
const heroActionsStyle: React.CSSProperties = { position: "absolute", bottom: 16, left: 16, right: 16, display: "flex", alignItems: "center", gap: 8 };
const addBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 100, border: "none", background: "rgba(255,255,255,0.92)", color: "#1a0a2e", fontSize: 14, fontWeight: 700, cursor: "pointer", flex: 1 };
const iconBtnStyle: React.CSSProperties = { width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

// Tabs
const tabBarStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 20px", background: "#0a0a0f" };
const tabBtnStyle: React.CSSProperties = { padding: "14px 20px", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1 };
const tabActiveStyle: React.CSSProperties = { color: "#fff", borderBottomColor: "#fff" };
const selCountStyle: React.CSSProperties = { marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" };

// Grid
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, paddingBottom: 100 };
const gridItemStyle: React.CSSProperties = { position: "relative", aspectRatio: "1", overflow: "hidden", cursor: "pointer", background: "rgba(255,255,255,0.05)", transition: "transform 0.15s ease" };
const gridItemSelStyle: React.CSSProperties = { outline: "2px solid #fff", outlineOffset: -2 };
const thumbMediaStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const videoBadgeStyle: React.CSSProperties = { position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "3px 5px", display: "flex", alignItems: "center" };
const nameTagStyle: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", fontSize: 10, color: "#fff", background: "linear-gradient(transparent,rgba(0,0,0,0.75))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const checkCircleStyle: React.CSSProperties = { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" };
const checkCircleSelStyle: React.CSSProperties = { background: "#ef4444", border: "2px solid #ef4444" };

// List view
const listItemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" };
const listThumbStyle: React.CSSProperties = { width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 };
const listInfoStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const listDlBtnStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 };

// Bottom nav
const bottomNavStyle: React.CSSProperties = { position: "fixed", bottom: 0, left: 0, right: 0, height: 80, background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 40, paddingBottom: "env(safe-area-inset-bottom)" };
const cameraBtnStyle: React.CSSProperties = { width: 60, height: 60, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.5)", transition: "transform 0.15s ease" };

// Progress
const progressWrapStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.1)", zIndex: 100 };
const progressBarStyle: React.CSSProperties = { height: "100%", background: "#a855f7", transition: "width 0.3s ease" };

// Empty
const emptyStyle: React.CSSProperties = { textAlign: "center", padding: "60px 20px" };
const emptyIconStyle: React.CSSProperties = { fontSize: 48, marginBottom: 8, opacity: 0.4 };

// Modal nome
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" };
const nomeModalStyle: React.CSSProperties = { background: "#1a1a2e", borderRadius: "24px 24px 0 0", padding: "28px 20px 40px", width: "100%", maxWidth: 480 };
const nomeInputStyle: React.CSSProperties = { width: "100%", padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" as const };
const sugestoesStyle: React.CSSProperties = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#2a1a3e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden", zIndex: 10 };
const sugestaoItemStyle: React.CSSProperties = { display: "block", width: "100%", padding: "13px 16px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontSize: 15, textAlign: "left" as const, cursor: "pointer" };
const modalSkipBtnStyle: React.CSSProperties = { flex: 1, padding: "13px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" };
const modalConfirmBtnStyle: React.CSSProperties = { flex: 2, padding: "13px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" };

// Lightbox
const lightboxStyle: React.CSSProperties = { position: "relative", maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 12 };
const closeBtnStyle: React.CSSProperties = { position: "absolute", top: -44, right: 0, background: "none", border: "none", color: "#fff", fontSize: 26, cursor: "pointer" };
const lightboxMediaStyle: React.CSSProperties = { width: "100%", maxHeight: "76vh", objectFit: "contain", borderRadius: 12 };
const lightboxFootStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" };
const dlBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, textDecoration: "none", fontWeight: 500 };

// Toast
const toastStyle: React.CSSProperties = { position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", background: "rgba(30,30,46,0.96)", backdropFilter: "blur(12px)", color: "#fff", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 200, whiteSpace: "nowrap" };
