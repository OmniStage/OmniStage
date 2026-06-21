"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Midia = {
  id: string;
  arquivo_url: string;
  tipo: "image" | "video";
  uploader_nome: string | null;
  criado_em: string;
};

export default function AlbumAdminPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const [midias, setMidias] = useState<Midia[]>([]);
  const [eventoNome, setEventoNome] = useState("");
  const [albumToken, setAlbumToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [modalMidia, setModalMidia] = useState<Midia | null>(null);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregar();
  }, [eventId]);

  async function carregar() {
    setLoading(true);
    const { data: evento } = await supabase
      .from("eventos")
      .select("nome, album_token")
      .eq("id", eventId)
      .single();

    if (evento) {
      setEventoNome(evento.nome || "");
      setAlbumToken(evento.album_token || null);
    }

    const { data: midiaData } = await supabase
      .from("event_album")
      .select("*")
      .eq("evento_id", eventId)
      .order("criado_em", { ascending: false });

    setMidias(midiaData || []);
    setLoading(false);
  }

  async function gerarToken() {
    const novoToken = `${eventId.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;
    await supabase.from("eventos").update({ album_token: novoToken }).eq("id", eventId);
    setAlbumToken(novoToken);
    mostrarToast("Link do álbum gerado!");
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !albumToken) return;
    setUploading(true);
    for (const arquivo of Array.from(files)) {
      if (arquivo.size > 50 * 1024 * 1024) {
        mostrarToast(`${arquivo.name} é muito grande (máx 50MB)`);
        continue;
      }
      try {
        const res = await fetch("/api/album/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: albumToken,
            nome_arquivo: arquivo.name,
            tipo_mime: arquivo.type,
            uploader_nome: "Admin",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        await fetch(json.signed_url, {
          method: "PUT",
          headers: { "Content-Type": arquivo.type },
          body: arquivo,
        });
      } catch (e: any) {
        mostrarToast(e.message || "Erro no upload");
      }
    }
    await carregar();
    setUploading(false);
    mostrarToast("Upload concluído!");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deletar(midia: Midia) {
    if (!confirm("Remover esta mídia do álbum?")) return;
    setDeletando(midia.id);
    await fetch("/api/album", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: midia.id, arquivo_url: midia.arquivo_url }),
    });
    setMidias((prev) => prev.filter((m) => m.id !== midia.id));
    setModalMidia(null);
    setDeletando(null);
    mostrarToast("Mídia removida.");
  }

  function copiarLink() {
    if (!albumToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/album/${albumToken}`);
    mostrarToast("Link copiado!");
  }

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const linkAlbum = albumToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/album/${albumToken}` : null;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <p style={kickerStyle}>ÁLBUM COMPARTILHADO</p>
          <h1 style={tituloStyle}>{eventoNome || "Evento"}</h1>
          <p style={subStyle}>{midias.length} {midias.length === 1 ? "item" : "itens"} no álbum</p>
        </div>

        {/* Link do álbum */}
        <div style={cardStyle}>
          <p style={cardTitleStyle}>Link do álbum para convidados</p>
          {albumToken ? (
            <div style={linkRowStyle}>
              <span style={linkTextStyle}>/album/{albumToken}</span>
              <button style={copyBtnStyle} onClick={copiarLink}>Copiar link</button>
              <a
                href={`/album/${albumToken}`}
                target="_blank"
                rel="noreferrer"
                style={openBtnStyle}
              >
                Abrir
              </a>
            </div>
          ) : (
            <button style={gerarBtnStyle} onClick={gerarToken}>
              Gerar link do álbum
            </button>
          )}
        </div>

        {/* Upload admin */}
        {albumToken && (
          <div style={uploadAreaStyle}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              style={{ ...uploadBtnStyle, opacity: uploading ? 0.6 : 1 }}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Enviando..." : "＋ Adicionar fotos / vídeos"}
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <p style={loadingStyle}>Carregando...</p>
        ) : midias.length === 0 ? (
          <p style={emptyStyle}>Nenhuma mídia ainda.</p>
        ) : (
          <div style={gridStyle}>
            {midias.map((m) => (
              <div key={m.id} style={gridItemStyle} onClick={() => setModalMidia(m)}>
                {m.tipo === "video" ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <video src={m.arquivo_url} style={thumbStyle} muted playsInline />
                    <div style={playStyle}>▶</div>
                  </div>
                ) : (
                  <img src={m.arquivo_url} alt="" style={thumbStyle} loading="lazy" />
                )}
                {m.uploader_nome && (
                  <div style={nameTagStyle}>{m.uploader_nome}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalMidia && (
        <div style={overlayStyle} onClick={() => setModalMidia(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button style={closeStyle} onClick={() => setModalMidia(null)}>✕</button>
            {modalMidia.tipo === "video" ? (
              <video src={modalMidia.arquivo_url} controls autoPlay style={modalMediaStyle} playsInline />
            ) : (
              <img src={modalMidia.arquivo_url} alt="" style={modalMediaStyle} />
            )}
            <div style={modalActionsStyle}>
              {modalMidia.uploader_nome && (
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  por {modalMidia.uploader_nome}
                </span>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={modalMidia.arquivo_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={actionBtnStyle}
                  onClick={(e) => e.stopPropagation()}
                >
                  ⬇ Baixar
                </a>
                <button
                  style={{ ...actionBtnStyle, background: "rgba(220,38,38,0.2)", color: "#f87171" }}
                  disabled={deletando === modalMidia.id}
                  onClick={() => deletar(modalMidia)}
                >
                  {deletando === modalMidia.id ? "..." : "🗑 Remover"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "var(--background, #07070a)", color: "var(--text, #fff)" };
const containerStyle: React.CSSProperties = { maxWidth: 960, margin: "0 auto", padding: "32px 16px" };
const headerStyle: React.CSSProperties = { marginBottom: 28 };
const kickerStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "var(--primary, #7c3aed)", fontWeight: 600, marginBottom: 4 };
const tituloStyle: React.CSSProperties = { fontSize: 28, fontWeight: 700, margin: "0 0 4px" };
const subStyle: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary, rgba(255,255,255,0.4))", margin: 0 };
const cardStyle: React.CSSProperties = { background: "var(--card, rgba(255,255,255,0.04))", border: "1px solid var(--line, rgba(255,255,255,0.08))", borderRadius: 16, padding: "20px 24px", marginBottom: 20 };
const cardTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--text-secondary, rgba(255,255,255,0.5))", marginBottom: 12 };
const linkRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const linkTextStyle: React.CSSProperties = { flex: 1, fontSize: 13, color: "var(--primary, #a78bfa)", background: "rgba(124,58,237,0.1)", padding: "8px 12px", borderRadius: 8, wordBreak: "break-all" };
const copyBtnStyle: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid var(--line, rgba(255,255,255,0.1))", background: "transparent", color: "var(--text, #fff)", fontSize: 13, cursor: "pointer", fontWeight: 500 };
const openBtnStyle: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, background: "var(--primary, #7c3aed)", color: "#fff", fontSize: 13, textDecoration: "none", fontWeight: 500 };
const gerarBtnStyle: React.CSSProperties = { padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--primary, #7c3aed)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const uploadAreaStyle: React.CSSProperties = { marginBottom: 20 };
const uploadBtnStyle: React.CSSProperties = { padding: "12px 20px", borderRadius: 12, border: "1px dashed var(--line, rgba(255,255,255,0.15))", background: "rgba(124,58,237,0.06)", color: "var(--primary, #a78bfa)", fontSize: 14, fontWeight: 500, cursor: "pointer", width: "100%" };
const loadingStyle: React.CSSProperties = { color: "var(--text-secondary)", textAlign: "center", padding: 40 };
const emptyStyle: React.CSSProperties = { color: "var(--text-secondary)", textAlign: "center", padding: 60 };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 };
const gridItemStyle: React.CSSProperties = { position: "relative", aspectRatio: "1", overflow: "hidden", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.04)" };
const thumbStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const playStyle: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", background: "rgba(0,0,0,0.3)", pointerEvents: "none" };
const nameTagStyle: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 8px", fontSize: 11, color: "#fff", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalStyle: React.CSSProperties = { position: "relative", maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 12 };
const closeStyle: React.CSSProperties = { position: "absolute", top: -44, right: 0, background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" };
const modalMediaStyle: React.CSSProperties = { width: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 12 };
const modalActionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" };
const actionBtnStyle: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, textDecoration: "none", border: "none", cursor: "pointer", fontWeight: 500 };
const toastStyle: React.CSSProperties = { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1e1e2e", color: "#fff", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 200, whiteSpace: "nowrap" };
