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
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

  useEffect(() => {
    carregar();
  }, [token]);

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/album?token=${token}`);
    const json = await res.json();
    if (!res.ok) {
      setErro(json.error || "Álbum não encontrado");
      setLoading(false);
      return;
    }
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
    if (arquivo.size > MAX_FILE_SIZE) {
      mostrarToast("Arquivo muito grande. Máximo 50MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const res = await fetch("/api/album/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nome_arquivo: arquivo.name,
          tipo_mime: arquivo.type,
          uploader_nome: nomeUploader.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setUploadProgress(40);

      const uploadRes = await fetch(json.signed_url, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });

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

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingStyle}>Carregando álbum...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={pageStyle}>
        <div style={erroStyle}>{erro}</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <p style={kickerStyle}>ÁLBUM DO EVENTO</p>
        <h1 style={tituloStyle}>{evento?.nome}</h1>
        <p style={subStyle}>{midias.length} {midias.length === 1 ? "foto/vídeo" : "fotos e vídeos"}</p>
      </div>

      {/* Upload area */}
      <div style={uploadAreaStyle}>
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
          style={{ ...uploadBtnStyle, opacity: uploading ? 0.6 : 1 }}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? `Enviando... ${uploadProgress}%` : "📷 Adicionar foto ou vídeo"}
        </button>
        {uploading && (
          <div style={progressBarWrapStyle}>
            <div style={{ ...progressBarStyle, width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>

      {/* Grid */}
      {midias.length === 0 ? (
        <div style={emptyStyle}>
          Nenhuma foto ainda. Seja o primeiro a adicionar!
        </div>
      ) : (
        <div style={gridStyle}>
          {midias.map((m) => (
            <div
              key={m.id}
              style={gridItemStyle}
              onClick={() => setModalMidia(m)}
            >
              {m.tipo === "video" ? (
                <div style={videoThumbStyle}>
                  <video src={m.arquivo_url} style={thumbMediaStyle} muted playsInline />
                  <div style={playIconStyle}>▶</div>
                </div>
              ) : (
                <img src={m.arquivo_url} alt="" style={thumbMediaStyle} loading="lazy" />
              )}
              {m.uploader_nome && (
                <div style={uploaderNameStyle}>{m.uploader_nome}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal lightbox */}
      {modalMidia && (
        <div style={modalOverlayStyle} onClick={() => setModalMidia(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button style={modalCloseStyle} onClick={() => setModalMidia(null)}>✕</button>
            {modalMidia.tipo === "video" ? (
              <video
                src={modalMidia.arquivo_url}
                controls
                autoPlay
                style={modalMediaStyle}
                playsInline
              />
            ) : (
              <img src={modalMidia.arquivo_url} alt="" style={modalMediaStyle} />
            )}
            <div style={modalInfoStyle}>
              {modalMidia.uploader_nome && (
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                  por {modalMidia.uploader_nome}
                </span>
              )}
              <a
                href={modalMidia.arquivo_url}
                download
                target="_blank"
                rel="noreferrer"
                style={downloadBtnStyle}
                onClick={(e) => e.stopPropagation()}
              >
                ⬇ Baixar
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0a0f",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  paddingBottom: 60,
};

const headerStyle: React.CSSProperties = {
  padding: "40px 20px 24px",
  textAlign: "center",
  background: "linear-gradient(180deg, #1a0a2e 0%, #0a0a0f 100%)",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.15em",
  color: "#a78bfa",
  fontWeight: 600,
  marginBottom: 8,
};

const tituloStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
  color: "#fff",
};

const subStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.4)",
  marginTop: 6,
};

const uploadAreaStyle: React.CSSProperties = {
  padding: "20px 16px 8px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxWidth: 480,
  margin: "0 auto",
};

const nomeInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const uploadBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 20px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
  color: "#fff",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const progressBarWrapStyle: React.CSSProperties = {
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
  textAlign: "center",
  color: "rgba(255,255,255,0.3)",
  padding: "60px 20px",
  fontSize: 15,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 2,
  padding: "16px 0",
};

const gridItemStyle: React.CSSProperties = {
  position: "relative",
  aspectRatio: "1",
  overflow: "hidden",
  cursor: "pointer",
  background: "#111",
};

const thumbMediaStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const videoThumbStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

const playIconStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  color: "#fff",
  background: "rgba(0,0,0,0.35)",
  pointerEvents: "none",
};

const uploaderNameStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "4px 6px",
  fontSize: 11,
  color: "#fff",
  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.92)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalContentStyle: React.CSSProperties = {
  position: "relative",
  maxWidth: 600,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const modalCloseStyle: React.CSSProperties = {
  position: "absolute",
  top: -40,
  right: 0,
  background: "none",
  border: "none",
  color: "#fff",
  fontSize: 24,
  cursor: "pointer",
  padding: 4,
};

const modalMediaStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: "75vh",
  objectFit: "contain",
  borderRadius: 12,
};

const modalInfoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 4px",
};

const downloadBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: 13,
  textDecoration: "none",
  fontWeight: 500,
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  color: "rgba(255,255,255,0.4)",
  fontSize: 15,
};

const erroStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  color: "rgba(255,100,100,0.8)",
  fontSize: 15,
};

const toastStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#1e1e2e",
  color: "#fff",
  padding: "12px 24px",
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 500,
  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
  zIndex: 200,
  whiteSpace: "nowrap",
};
