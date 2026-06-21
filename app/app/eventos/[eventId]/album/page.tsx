"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";

type Midia = {
  id: string;
  arquivo_url: string;
  tipo: "image" | "video";
  uploader_nome: string | null;
  criado_em: string;
  curtidas: number;
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
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"fotos" | "qrcode">("fotos");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); }, [eventId]);

  useEffect(() => {
    if (albumToken) gerarQR(albumToken);
  }, [albumToken]);

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

  async function gerarQR(token: string) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${base}/album/${token}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: "#1a0a2e", light: "#ffffff" },
    });
    setQrDataUrl(dataUrl);
  }

  async function gerarToken() {
    const novoToken = `${eventId.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;
    await supabase.from("eventos").update({ album_token: novoToken }).eq("id", eventId);
    setAlbumToken(novoToken);
    toast_show("Link do álbum gerado!", "success");
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !albumToken) return;
    setUploading(true);
    let ok = 0;
    for (const arquivo of Array.from(files)) {
      if (arquivo.size > 50 * 1024 * 1024) { toast_show(`${arquivo.name} excede 50MB`, "error"); continue; }
      try {
        const res = await fetch("/api/album/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: albumToken, nome_arquivo: arquivo.name, tipo_mime: arquivo.type, uploader_nome: "Admin" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        await fetch(json.signed_url, { method: "PUT", headers: { "Content-Type": arquivo.type }, body: arquivo });
        ok++;
      } catch (e: any) { toast_show(e.message || "Erro no upload", "error"); }
    }
    await carregar();
    setUploading(false);
    if (ok > 0) toast_show(`${ok} ${ok === 1 ? "arquivo enviado" : "arquivos enviados"}!`, "success");
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
    toast_show("Mídia removida.", "success");
  }

  function copiarLink() {
    if (!albumToken) return;
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    navigator.clipboard.writeText(`${base}/album/${albumToken}`);
    toast_show("Link copiado!", "success");
  }

  function baixarQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-album-${eventoNome.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  function imprimirQR() {
    if (!qrDataUrl || !albumToken) return;
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${base}/album/${albumToken}`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code – ${eventoNome}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { text-align: center; padding: 48px 40px; border: 1px solid #e2e8f0; border-radius: 24px; max-width: 380px; }
          .evento { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #7c3aed; margin-bottom: 8px; }
          h1 { font-size: 26px; font-weight: 800; color: #1e1e2e; margin-bottom: 4px; }
          .sub { font-size: 14px; color: #64748b; margin-bottom: 28px; }
          img { width: 220px; height: 220px; border-radius: 12px; margin-bottom: 20px; }
          .inst { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 12px; }
          .url { font-size: 11px; color: #94a3b8; word-break: break-all; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="card">
          <p class="evento">Álbum do evento</p>
          <h1>${eventoNome}</h1>
          <p class="sub">Compartilhe suas fotos!</p>
          <img src="${qrDataUrl}" alt="QR Code" />
          <p class="inst">Aponte a câmera do celular<br>para o QR Code e adicione suas fotos</p>
          <p class="url">${url}</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  }

  function toast_show(msg: string, tipo: "success" | "error") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  function formatarData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const totalFotos = midias.filter((m) => m.tipo === "image").length;
  const totalVideos = midias.filter((m) => m.tipo === "video").length;
  const linkAlbum = albumToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/album/${albumToken}` : null;

  return (
    <div style={pageStyle}>
      {/* Page header */}
      <div style={pageHeaderStyle}>
        <div>
          <p style={kickerStyle}>ÁLBUM COMPARTILHADO</p>
          <h1 style={h1Style}>{eventoNome || "Evento"}</h1>
        </div>
        <div style={headerActionsStyle}>
          {albumToken && (
            <button style={btnOutlineStyle} onClick={copiarLink}>
              Copiar link
            </button>
          )}
          {albumToken && (
            <a href={`/album/${albumToken}`} target="_blank" rel="noreferrer" style={btnPrimaryStyle}>
              Abrir álbum ↗
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={statsRowStyle}>
        <div style={statCardStyle}>
          <span style={statNumStyle}>{midias.length}</span>
          <span style={statLabelStyle}>Total de mídias</span>
        </div>
        <div style={statCardStyle}>
          <span style={statNumStyle}>{totalFotos}</span>
          <span style={statLabelStyle}>Fotos</span>
        </div>
        <div style={statCardStyle}>
          <span style={statNumStyle}>{totalVideos}</span>
          <span style={statLabelStyle}>Vídeos</span>
        </div>
        <div style={statCardStyle}>
          <span style={statNumStyle}>{albumToken ? "Ativo" : "—"}</span>
          <span style={statLabelStyle}>Status do álbum</span>
        </div>
      </div>

      {/* Abas */}
      <div style={tabBarStyle}>
        {(["fotos", "qrcode"] as const).map((aba) => (
          <button
            key={aba}
            style={{ ...tabStyle, ...(abaAtiva === aba ? tabActiveStyle : {}) }}
            onClick={() => setAbaAtiva(aba)}
          >
            {aba === "fotos" ? "Fotos e vídeos" : "QR Code / Link"}
          </button>
        ))}
      </div>

      {/* Aba: Fotos */}
      {abaAtiva === "fotos" && (
        <div style={sectionStyle}>
          {!albumToken ? (
            <div style={emptyCardStyle}>
              <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 15 }}>
                Gere um link para ativar o álbum deste evento.
              </p>
              <button style={btnPrimaryStyle} onClick={gerarToken}>
                Gerar link do álbum
              </button>
            </div>
          ) : (
            <>
              {/* Upload */}
              <div style={uploadBarStyle}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <button
                  style={{ ...btnPrimaryStyle, opacity: uploading ? 0.6 : 1 }}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Enviando..." : "+ Adicionar fotos / vídeos"}
                </button>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  Aceita JPG, PNG, HEIC, MP4 · máx 50MB por arquivo
                </span>
              </div>

              {/* Grid */}
              {loading ? (
                <p style={{ color: "var(--muted)", padding: "40px 0" }}>Carregando...</p>
              ) : midias.length === 0 ? (
                <div style={emptyCardStyle}>
                  <p style={{ color: "var(--muted)", fontSize: 15 }}>Nenhuma mídia ainda. Clique em "+ Adicionar" ou compartilhe o link com os convidados.</p>
                </div>
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
                      {m.uploader_nome && <div style={nameTagStyle}>{m.uploader_nome}</div>}
                      {(m.curtidas || 0) > 0 && (
                        <div style={curtidasBadgeStyle}>
                          ♥ {m.curtidas}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Aba: QR Code */}
      {abaAtiva === "qrcode" && (
        <div style={sectionStyle}>
          {!albumToken ? (
            <div style={emptyCardStyle}>
              <p style={{ color: "var(--muted)", marginBottom: 16 }}>Gere o link do álbum primeiro.</p>
              <button style={btnPrimaryStyle} onClick={gerarToken}>Gerar link do álbum</button>
            </div>
          ) : (
            <div style={qrLayoutStyle}>
              {/* QR Card */}
              <div style={qrCardStyle}>
                <p style={cardSectionTitleStyle}>QR Code do álbum</p>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" style={qrImgStyle} />
                ) : (
                  <div style={{ width: 200, height: 200, background: "var(--line)", borderRadius: 12 }} />
                )}
                <div style={qrBtnRowStyle}>
                  <button style={btnOutlineStyle} onClick={baixarQR}>⬇ Baixar PNG</button>
                  <button style={btnPrimaryStyle} onClick={imprimirQR}>🖨 Imprimir</button>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
                  Imprima e deixe nas mesas do evento
                </p>
              </div>

              {/* Link info */}
              <div style={linkInfoCardStyle}>
                <p style={cardSectionTitleStyle}>Link direto</p>
                <div style={linkBoxStyle}>
                  <span style={linkTextStyle}>{linkAlbum}</span>
                  <button style={copyInlineBtnStyle} onClick={copiarLink}>Copiar</button>
                </div>

                <div style={{ marginTop: 24 }}>
                  <p style={cardSectionTitleStyle}>Como funciona</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                    {[
                      ["1", "Imprima o QR Code e coloque nas mesas"],
                      ["2", "Convidado aponta a câmera e abre o link"],
                      ["3", "Digita o nome (opcional) e envia a foto"],
                      ["4", "Aparece aqui em tempo real no painel"],
                    ].map(([num, txt]) => (
                      <div key={num} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <span style={stepNumStyle}>{num}</span>
                        <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{txt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal lightbox */}
      {modalMidia && (
        <div style={overlayStyle} onClick={() => setModalMidia(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setModalMidia(null)}>✕</button>
            {modalMidia.tipo === "video"
              ? <video src={modalMidia.arquivo_url} controls autoPlay playsInline style={modalMediaStyle} />
              : <img src={modalMidia.arquivo_url} alt="" style={modalMediaStyle} />
            }
            <div style={modalFootStyle}>
              <div>
                {modalMidia.uploader_nome && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>por {modalMidia.uploader_nome}</p>}
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>{formatarData(modalMidia.criado_em)}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={modalMidia.arquivo_url} download target="_blank" rel="noreferrer" style={btnOutlineStyle}>⬇ Baixar</a>
                <button
                  style={{ ...btnOutlineStyle, color: "#dc2626", borderColor: "rgba(220,38,38,0.3)", opacity: deletando === modalMidia.id ? 0.5 : 1 }}
                  disabled={deletando === modalMidia.id}
                  onClick={() => deletar(modalMidia)}
                >
                  {deletando === modalMidia.id ? "..." : "Remover"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          ...toastStyle,
          background: toast.tipo === "error" ? "#fee2e2" : "#f0fdf4",
          color: toast.tipo === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${toast.tipo === "error" ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}`,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { maxWidth: 1000, margin: "0 auto", paddingBottom: 60 };
const pageHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" };
const kickerStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "var(--primary, #7c3aed)", fontWeight: 700, marginBottom: 4 };
const h1Style: React.CSSProperties = { fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text)", letterSpacing: "-0.02em" };
const headerActionsStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

const statsRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 };
const statCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4 };
const statNumStyle: React.CSSProperties = { fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" };
const statLabelStyle: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 600 };

const tabBarStyle: React.CSSProperties = { display: "flex", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 28 };
const tabStyle: React.CSSProperties = { padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--muted)", borderBottom: "2px solid transparent", marginBottom: -1, transition: "all 150ms" };
const tabActiveStyle: React.CSSProperties = { color: "var(--primary, #7c3aed)", borderBottomColor: "var(--primary, #7c3aed)" };

const sectionStyle: React.CSSProperties = {};
const emptyCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "40px 32px", textAlign: "center" };
const uploadBarStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" };

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 };
const gridItemStyle: React.CSSProperties = { position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "var(--line)" };
const thumbStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const playStyle: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff", background: "rgba(0,0,0,0.28)", pointerEvents: "none" };
const nameTagStyle: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 8px", fontSize: 11, color: "#fff", background: "linear-gradient(transparent,rgba(0,0,0,0.7))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const curtidasBadgeStyle: React.CSSProperties = { position: "absolute", top: 7, left: 7, background: "rgba(225,29,72,0.85)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, backdropFilter: "blur(4px)" };

const qrLayoutStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" };
const qrCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 28px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: 280 };
const qrImgStyle: React.CSSProperties = { width: 200, height: 200, borderRadius: 12, imageRendering: "pixelated" };
const qrBtnRowStyle: React.CSSProperties = { display: "flex", gap: 8, width: "100%" };
const cardSectionTitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" as const, margin: 0, alignSelf: "flex-start" as const };

const linkInfoCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 28px 24px", display: "flex", flexDirection: "column", gap: 0 };
const linkBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "10px 14px", marginTop: 10, flexWrap: "wrap" as const };
const linkTextStyle: React.CSSProperties = { flex: 1, fontSize: 13, color: "var(--primary, #7c3aed)", wordBreak: "break-all" as const };
const copyInlineBtnStyle: React.CSSProperties = { padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const };
const stepNumStyle: React.CSSProperties = { width: 24, height: 24, minWidth: 24, borderRadius: "50%", background: "rgba(124,58,237,0.1)", color: "var(--primary, #7c3aed)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" };

const btnPrimaryStyle: React.CSSProperties = { padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--primary, #7c3aed)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 };
const btnOutlineStyle: React.CSSProperties = { padding: "10px 18px", borderRadius: 12, border: "1px solid var(--line)", background: "transparent", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 };

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" };
const modalStyle: React.CSSProperties = { position: "relative", maxWidth: 700, width: "100%", background: "var(--card)", borderRadius: 20, overflow: "hidden", border: "1px solid var(--line)" };
const closeBtnStyle: React.CSSProperties = { position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 };
const modalMediaStyle: React.CSSProperties = { width: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", background: "#000" };
const modalFootStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", flexWrap: "wrap" as const, gap: 12 };

const toastStyle: React.CSSProperties = { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" };
