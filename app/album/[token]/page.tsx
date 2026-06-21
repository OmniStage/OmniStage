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
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [nomeUploader, setNomeUploader] = useState("");
  const [modalMidia, setModalMidia] = useState<Midia | null>(null);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nomeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); }, [token]);

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/album?token=${token}`);
    const json = await res.json();
    if (!res.ok) { setErro(json.error || "Álbum não encontrado"); setLoading(false); return; }
    setEvento(json.evento);
    setMidias(json.midias);
    setLoading(false);
  }

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
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
      setUploadProgress(40);
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

  const bgUrl = evento?.background_url || evento?.background_image || "";
  const logoUrl = evento?.logo_url || evento?.logo_image || "";

  if (loading) return (
    <div style={{ ...shellStyle, background: "#0a0a0f" }}>
      <div style={centerStyle}>Carregando álbum...</div>
    </div>
  );

  if (erro) return (
    <div style={{ ...shellStyle, background: "#0a0a0f" }}>
      <div style={{ ...centerStyle, color: "#f87171" }}>{erro}</div>
    </div>
  );

  return (
    <div style={shellStyle}>
      {/* Background do evento */}
      {bgUrl && (
        <div style={{ ...bgImageStyle, backgroundImage: `url(${bgUrl})` }} />
      )}
      <div style={bgOverlayStyle} />

      {/* Header */}
      <div style={headerStyle}>
        {logoUrl && (
          <img src={logoUrl} alt={evento?.nome} style={logoStyle} />
        )}
        <p style={kickerStyle}>ÁLBUM DO EVENTO</p>
        <h1 style={tituloStyle}>{evento?.nome}</h1>
        <p style={subStyle}>
          {midias.length} {midias.length === 1 ? "foto/vídeo" : "fotos e vídeos"}
        </p>
      </div>

      {/* Upload */}
      <div style={uploadSectionStyle}>
        <input
          ref={nomeInputRef}
          type="text"
          placeholder="Seu nome (opcional)"
          value={nomeUploader}
          onChange={(e) => setNomeUploader(e.target.value)}
          style={nomeInputStyle}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          style={{ ...uploadBtnStyle, opacity: uploading ? 0.7 : 1 }}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? `Enviando... ${uploadProgress}%` : "📷  Adicionar foto ou vídeo"}
        </button>
        {uploading && (
          <div style={progressWrapStyle}>
            <div style={{ ...progressBarStyle, width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>

      {/* Grid */}
      {midias.length === 0 ? (
        <p style={emptyStyle}>Nenhuma foto ainda. Seja o primeiro a adicionar!</p>
      ) : (
        <div style={gridStyle}>
          {midias.map((m) => (
            <div key={m.id} style={itemStyle} onClick={() => setModalMidia(m)}>
              {m.tipo === "video" ? (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <video src={m.arquivo_url} style={mediaThumbStyle} muted playsInline />
                  <div style={playOverlayStyle}>▶</div>
                </div>
              ) : (
                <img src={m.arquivo_url} alt="" style={mediaThumbStyle} loading="lazy" />
              )}
              {m.uploader_nome && <div style={nameTagStyle}>{m.uploader_nome}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {modalMidia && (
        <div style={overlayStyle} onClick={() => setModalMidia(null)}>
          <div style={lightboxStyle} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setModalMidia(null)}>✕</button>
            {modalMidia.tipo === "video"
              ? <video src={modalMidia.arquivo_url} controls autoPlay playsInline style={lightboxMediaStyle} />
              : <img src={modalMidia.arquivo_url} alt="" style={lightboxMediaStyle} />
            }
            <div style={lightboxFootStyle}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                {modalMidia.uploader_nome ? `por ${modalMidia.uploader_nome}` : ""}
              </span>
              <a href={modalMidia.arquivo_url} download target="_blank" rel="noreferrer" style={dlBtnStyle}>
                ⬇ Baixar
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

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  fontFamily: "'Inter', sans-serif",
  color: "#fff",
  overflowX: "hidden",
  paddingBottom: 60,
};

const bgImageStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  zIndex: 0,
  filter: "blur(2px) brightness(0.45)",
  transform: "scale(1.05)",
};

const bgOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.90) 100%)",
  zIndex: 1,
};

const headerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  textAlign: "center",
  padding: "48px 20px 28px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

const logoStyle: React.CSSProperties = {
  width: 80,
  height: 80,
  objectFit: "contain",
  borderRadius: 16,
  marginBottom: 8,
  filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.55)",
  fontWeight: 600,
  margin: 0,
};

const tituloStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  margin: 0,
  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
};

const subStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.45)",
  margin: 0,
};

const uploadSectionStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: 480,
  margin: "0 auto",
  padding: "0 16px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const nomeInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  color: "#fff",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const uploadBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "15px 20px",
  borderRadius: 16,
  border: "none",
  background: "linear-gradient(135deg, rgba(124,58,237,0.9), rgba(168,85,247,0.9))",
  backdropFilter: "blur(10px)",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
  boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
};

const progressWrapStyle: React.CSSProperties = {
  height: 4,
  background: "rgba(255,255,255,0.1)",
  borderRadius: 4,
  overflow: "hidden",
};

const progressBarStyle: React.CSSProperties = {
  height: "100%",
  background: "#a855f7",
  borderRadius: 4,
  transition: "width 0.3s ease",
};

const emptyStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  textAlign: "center",
  color: "rgba(255,255,255,0.3)",
  padding: "50px 20px",
  fontSize: 15,
};

const gridStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 3,
};

const itemStyle: React.CSSProperties = {
  position: "relative",
  aspectRatio: "1",
  overflow: "hidden",
  cursor: "pointer",
  background: "rgba(255,255,255,0.05)",
};

const mediaThumbStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  transition: "transform 0.2s ease",
};

const playOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  color: "#fff",
  background: "rgba(0,0,0,0.3)",
  pointerEvents: "none",
};

const nameTagStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "4px 7px",
  fontSize: 11,
  color: "#fff",
  background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.94)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const lightboxStyle: React.CSSProperties = {
  position: "relative",
  maxWidth: 600,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: -44,
  right: 0,
  background: "none",
  border: "none",
  color: "#fff",
  fontSize: 26,
  cursor: "pointer",
};

const lightboxMediaStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: "76vh",
  objectFit: "contain",
  borderRadius: 12,
};

const lightboxFootStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 2px",
};

const dlBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: 13,
  textDecoration: "none",
  fontWeight: 500,
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  fontSize: 15,
  color: "rgba(255,255,255,0.4)",
};

const toastStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(30,30,46,0.95)",
  backdropFilter: "blur(12px)",
  color: "#fff",
  padding: "12px 24px",
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 500,
  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
  zIndex: 200,
  whiteSpace: "nowrap",
};
