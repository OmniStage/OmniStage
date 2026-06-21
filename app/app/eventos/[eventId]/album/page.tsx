"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";

type Album = {
  id: string;
  nome: string;
  descricao: string | null;
  album_token: string;
  criado_em: string;
  total_midias: number;
};

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
  const [eventoNome, setEventoNome] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumAtivo, setAlbumAtivo] = useState<Album | null>(null);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [modalMidia, setModalMidia] = useState<Midia | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"fotos" | "qrcode">("fotos");
  const [modalNovoAlbum, setModalNovoAlbum] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaDesc, setNovaDesc] = useState("");
  const [criando, setCriando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); }, [eventId]);

  useEffect(() => {
    if (albumAtivo) {
      carregarMidias(albumAtivo.id);
      gerarQR(albumAtivo.album_token);
    }
  }, [albumAtivo]);

  async function carregar() {
    setLoading(true);
    const { data: evento } = await supabase.from("eventos").select("nome").eq("id", eventId).single();
    if (evento) setEventoNome(evento.nome || "");

    const res = await fetch(`/api/albums?evento_id=${eventId}`);
    const json = await res.json();
    const lista: Album[] = json.albums || [];
    setAlbums(lista);
    if (lista.length > 0 && !albumAtivo) setAlbumAtivo(lista[0]);
    setLoading(false);
  }

  async function carregarMidias(albumId: string) {
    const { data } = await supabase
      .from("event_album")
      .select("*")
      .eq("album_id", albumId)
      .order("criado_em", { ascending: false });
    setMidias(data || []);
  }

  async function gerarQR(token: string) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${base}/album/${token}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: "#1a0a2e", light: "#ffffff" },
    });
    setQrDataUrl(dataUrl);
  }

  async function criarAlbum() {
    if (!novoNome.trim()) return;
    setCriando(true);
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventId, nome: novoNome, descricao: novaDesc }),
    });
    const json = await res.json();
    if (!res.ok) { toast_show(json.error || "Erro ao criar", "error"); setCriando(false); return; }
    setModalNovoAlbum(false);
    setNovoNome("");
    setNovaDesc("");
    setCriando(false);
    await carregar();
    setAlbumAtivo(json.album);
    toast_show("Álbum criado!", "success");
  }

  async function deletarAlbum(album: Album) {
    if (!confirm(`Remover álbum "${album.nome}" e todas as ${album.total_midias} mídias?`)) return;
    await fetch("/api/albums", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: album.id }),
    });
    const novaLista = albums.filter((a) => a.id !== album.id);
    setAlbums(novaLista);
    if (albumAtivo?.id === album.id) {
      setAlbumAtivo(novaLista[0] || null);
      setMidias([]);
    }
    toast_show("Álbum removido.", "success");
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !albumAtivo) return;
    setUploading(true);
    let ok = 0;
    for (const arquivo of Array.from(files)) {
      if (arquivo.size > 50 * 1024 * 1024) { toast_show(`${arquivo.name} excede 50MB`, "error"); continue; }
      try {
        const res = await fetch("/api/album/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: albumAtivo.album_token, nome_arquivo: arquivo.name, tipo_mime: arquivo.type, uploader_nome: "Admin" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        await fetch(json.signed_url, { method: "PUT", headers: { "Content-Type": arquivo.type }, body: arquivo });
        ok++;
      } catch (e: any) { toast_show(e.message || "Erro no upload", "error"); }
    }
    await carregarMidias(albumAtivo.id);
    const res2 = await fetch(`/api/albums?evento_id=${eventId}`);
    const json2 = await res2.json();
    setAlbums(json2.albums || []);
    setUploading(false);
    if (ok > 0) toast_show(`${ok} ${ok === 1 ? "arquivo enviado" : "arquivos enviados"}!`, "success");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deletarMidia(midia: Midia) {
    if (!confirm("Remover esta mídia?")) return;
    setDeletando(midia.id);
    await fetch("/api/album", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: midia.id, arquivo_url: midia.arquivo_url }),
    });
    setMidias((prev) => prev.filter((m) => m.id !== midia.id));
    setModalMidia(null);
    setDeletando(null);
    const r = await fetch(`/api/albums?evento_id=${eventId}`);
    const j = await r.json();
    setAlbums(j.albums || []);
    toast_show("Mídia removida.", "success");
  }

  function copiarLink() {
    if (!albumAtivo) return;
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    navigator.clipboard.writeText(`${base}/album/${albumAtivo.album_token}`);
    toast_show("Link copiado!", "success");
  }

  function baixarQR() {
    if (!qrDataUrl || !albumAtivo) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${albumAtivo.nome.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  function imprimirQR() {
    if (!qrDataUrl || !albumAtivo) return;
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${base}/album/${albumAtivo.album_token}`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR – ${albumAtivo.nome}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{text-align:center;padding:48px 40px;border:1px solid #e2e8f0;border-radius:24px;max-width:380px}.kicker{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;margin-bottom:8px}h1{font-size:24px;font-weight:800;color:#1e1e2e;margin-bottom:4px}.sub{font-size:13px;color:#64748b;margin-bottom:24px}img{width:210px;height:210px;border-radius:12px;margin-bottom:18px}.inst{font-size:13px;color:#64748b;line-height:1.5;margin-bottom:10px}.url{font-size:11px;color:#94a3b8;word-break:break-all}@media print{body{-webkit-print-color-adjust:exact}}</style>
      </head><body><div class="card"><p class="kicker">${eventoNome}</p><h1>${albumAtivo.nome}</h1><p class="sub">Compartilhe suas fotos!</p>
      <img src="${qrDataUrl}" alt="QR"/><p class="inst">Aponte a câmera do celular para o QR Code</p><p class="url">${url}</p></div>
      <script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  }

  function toast_show(msg: string, tipo: "success" | "error") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  function formatarData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  const linkAtivo = albumAtivo ? `${typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) : ""}/album/${albumAtivo.album_token}` : null;
  const totalFotos = midias.filter((m) => m.tipo === "image").length;
  const totalVideos = midias.filter((m) => m.tipo === "video").length;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={pageHeaderStyle}>
        <div>
          <p style={kickerStyle}>ÁLBUNS COMPARTILHADOS</p>
          <h1 style={h1Style}>{eventoNome || "Evento"}</h1>
        </div>
        <button style={btnPrimaryStyle} onClick={() => setModalNovoAlbum(true)}>
          + Novo álbum
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", padding: 40 }}>Carregando...</p>
      ) : albums.length === 0 ? (
        <div style={emptyCardStyle}>
          <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 15 }}>Nenhum álbum criado ainda.</p>
          <button style={btnPrimaryStyle} onClick={() => setModalNovoAlbum(true)}>Criar primeiro álbum</button>
        </div>
      ) : (
        <div style={layoutStyle}>
          {/* Sidebar de álbuns */}
          <div style={sidebarStyle}>
            <p style={sidebarTitleStyle}>ÁLBUNS ({albums.length})</p>
            {albums.map((a) => (
              <div key={a.id} style={{ ...albumItemStyle, ...(albumAtivo?.id === a.id ? albumItemActiveStyle : {}) }}
                onClick={() => setAlbumAtivo(a)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={albumItemNomeStyle}>{a.nome}</p>
                  {a.descricao && <p style={albumItemDescStyle}>{a.descricao}</p>}
                  <p style={albumItemMetaStyle}>{a.total_midias} mídias · {formatarData(a.criado_em)}</p>
                </div>
                <button style={deletarAlbumBtnStyle} onClick={(e) => { e.stopPropagation(); deletarAlbum(a); }} title="Remover álbum">✕</button>
              </div>
            ))}
          </div>

          {/* Conteúdo do álbum ativo */}
          {albumAtivo && (
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header do álbum */}
              <div style={albumHeaderStyle}>
                <div>
                  <h2 style={albumTitleStyle}>{albumAtivo.nome}</h2>
                  {albumAtivo.descricao && <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>{albumAtivo.descricao}</p>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  <button style={btnOutlineStyle} onClick={copiarLink}>Copiar link</button>
                  <a href={`/album/${albumAtivo.album_token}`} target="_blank" rel="noreferrer" style={btnPrimaryStyle}>Abrir ↗</a>
                </div>
              </div>

              {/* Stats */}
              <div style={statsRowStyle}>
                <div style={statCardStyle}><span style={statNumStyle}>{midias.length}</span><span style={statLabelStyle}>Total</span></div>
                <div style={statCardStyle}><span style={statNumStyle}>{totalFotos}</span><span style={statLabelStyle}>Fotos</span></div>
                <div style={statCardStyle}><span style={statNumStyle}>{totalVideos}</span><span style={statLabelStyle}>Vídeos</span></div>
              </div>

              {/* Abas */}
              <div style={tabBarStyle}>
                {(["fotos", "qrcode"] as const).map((aba) => (
                  <button key={aba} style={{ ...tabStyle, ...(abaAtiva === aba ? tabActiveStyle : {}) }} onClick={() => setAbaAtiva(aba)}>
                    {aba === "fotos" ? "Fotos e vídeos" : "QR Code / Link"}
                  </button>
                ))}
              </div>

              {/* Fotos */}
              {abaAtiva === "fotos" && (
                <div>
                  <div style={uploadBarStyle}>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
                    <button style={{ ...btnPrimaryStyle, opacity: uploading ? 0.6 : 1 }} disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}>
                      {uploading ? "Enviando..." : "+ Adicionar fotos / vídeos"}
                    </button>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>JPG, PNG, HEIC, MP4 · máx 50MB</span>
                  </div>

                  {midias.length === 0 ? (
                    <div style={emptyCardStyle}>
                      <p style={{ color: "var(--muted)", fontSize: 15 }}>Nenhuma mídia ainda. Adicione ou compartilhe o link com os convidados.</p>
                    </div>
                  ) : (
                    <div style={gridStyle}>
                      {midias.map((m) => (
                        <div key={m.id} style={gridItemStyle} onClick={() => setModalMidia(m)}>
                          {m.tipo === "video"
                            ? <div style={{ position: "relative", width: "100%", height: "100%" }}><video src={m.arquivo_url} style={thumbStyle} muted playsInline /><div style={playStyle}>▶</div></div>
                            : <img src={m.arquivo_url} alt="" style={thumbStyle} loading="lazy" />
                          }
                          {m.uploader_nome && <div style={nameTagStyle}>{m.uploader_nome}</div>}
                          {(m.curtidas || 0) > 0 && <div style={curtidasBadgeStyle}>♥ {m.curtidas}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QR */}
              {abaAtiva === "qrcode" && (
                <div style={qrLayoutStyle}>
                  <div style={qrCardStyle}>
                    <p style={cardSectionTitleStyle}>QR Code</p>
                    {qrDataUrl
                      ? <img src={qrDataUrl} alt="QR Code" style={qrImgStyle} />
                      : <div style={{ width: 200, height: 200, background: "var(--line)", borderRadius: 12 }} />
                    }
                    <div style={qrBtnRowStyle}>
                      <button style={btnOutlineStyle} onClick={baixarQR}>⬇ PNG</button>
                      <button style={btnPrimaryStyle} onClick={imprimirQR}>🖨 Imprimir</button>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Imprima e deixe nas mesas</p>
                  </div>
                  <div style={linkInfoCardStyle}>
                    <p style={cardSectionTitleStyle}>Link direto</p>
                    <div style={linkBoxStyle}>
                      <span style={linkTextStyle}>{linkAtivo}</span>
                      <button style={copyInlineBtnStyle} onClick={copiarLink}>Copiar</button>
                    </div>
                    <div style={{ marginTop: 24 }}>
                      <p style={cardSectionTitleStyle}>Como funciona</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                        {[["1","Imprima o QR Code e coloque nas mesas"],["2","Convidado aponta a câmera e abre o link"],["3","Digita o nome e envia a foto"],["4","Aparece aqui em tempo real"]].map(([n,t]) => (
                          <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            <span style={stepNumStyle}>{n}</span>
                            <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>{new Date(modalMidia.criado_em).toLocaleDateString("pt-BR")}</p>
                {(modalMidia.curtidas || 0) > 0 && <p style={{ fontSize: 12, color: "#e11d48", margin: "2px 0 0" }}>♥ {modalMidia.curtidas} curtida{modalMidia.curtidas !== 1 ? "s" : ""}</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={modalMidia.arquivo_url} download target="_blank" rel="noreferrer" style={btnOutlineStyle}>⬇ Baixar</a>
                <button style={{ ...btnOutlineStyle, color: "#dc2626", borderColor: "rgba(220,38,38,0.3)", opacity: deletando === modalMidia.id ? 0.5 : 1 }}
                  disabled={deletando === modalMidia.id} onClick={() => deletarMidia(modalMidia)}>
                  {deletando === modalMidia.id ? "..." : "Remover"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo álbum */}
      {modalNovoAlbum && (
        <div style={overlayStyle} onClick={() => setModalNovoAlbum(false)}>
          <div style={{ ...modalStyle, maxWidth: 460, borderRadius: 20 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "28px 28px 24px" }}>
              <p style={kickerStyle}>NOVO ÁLBUM</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "0 0 20px" }}>Criar álbum</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nome do álbum *</label>
                  <input type="text" placeholder="Ex: Cerimônia, Festa, Família..." value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)} autoFocus style={inputStyle}
                    onKeyDown={(e) => e.key === "Enter" && criarAlbum()} />
                </div>
                <div>
                  <label style={labelStyle}>Descrição (opcional)</label>
                  <input type="text" placeholder="Descrição curta..." value={novaDesc}
                    onChange={(e) => setNovaDesc(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button style={btnOutlineStyle} onClick={() => setModalNovoAlbum(false)}>Cancelar</button>
                <button style={{ ...btnPrimaryStyle, flex: 1, opacity: criando || !novoNome.trim() ? 0.6 : 1 }}
                  disabled={criando || !novoNome.trim()} onClick={criarAlbum}>
                  {criando ? "Criando..." : "Criar álbum"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ ...toastStyle, background: toast.tipo === "error" ? "#fee2e2" : "#f0fdf4", color: toast.tipo === "error" ? "#991b1b" : "#166534", border: `1px solid ${toast.tipo === "error" ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}` }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", paddingBottom: 60 };
const pageHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" as const };
const kickerStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.15em", color: "var(--primary, #7c3aed)", fontWeight: 700, marginBottom: 4 };
const h1Style: React.CSSProperties = { fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text)", letterSpacing: "-0.02em" };

const layoutStyle: React.CSSProperties = { display: "flex", gap: 24, alignItems: "flex-start" };

const sidebarStyle: React.CSSProperties = { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 };
const sidebarTitleStyle: React.CSSProperties = { fontSize: 10, letterSpacing: "0.12em", color: "var(--muted)", fontWeight: 700, marginBottom: 8 };
const albumItemStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--card)", cursor: "pointer", transition: "all 150ms" };
const albumItemActiveStyle: React.CSSProperties = { background: "rgba(124,58,237,0.06)", borderColor: "rgba(124,58,237,0.3)" };
const albumItemNomeStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const };
const albumItemDescStyle: React.CSSProperties = { fontSize: 12, color: "var(--muted)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const };
const albumItemMetaStyle: React.CSSProperties = { fontSize: 11, color: "var(--muted)", margin: "4px 0 0" };
const deletarAlbumBtnStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: 14, cursor: "pointer", padding: "2px 4px", flexShrink: 0 };

const albumHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" as const };
const albumTitleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: 0, color: "var(--text)" };

const statsRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 };
const statCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 };
const statNumStyle: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "var(--text)" };
const statLabelStyle: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 600 };

const tabBarStyle: React.CSSProperties = { display: "flex", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 24 };
const tabStyle: React.CSSProperties = { padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--muted)", borderBottom: "2px solid transparent", marginBottom: -1, transition: "all 150ms" };
const tabActiveStyle: React.CSSProperties = { color: "var(--primary, #7c3aed)", borderBottomColor: "var(--primary, #7c3aed)" };

const emptyCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "40px 32px", textAlign: "center" };
const uploadBarStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" as const };

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 };
const gridItemStyle: React.CSSProperties = { position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "var(--line)" };
const thumbStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const playStyle: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff", background: "rgba(0,0,0,0.28)", pointerEvents: "none" };
const nameTagStyle: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 8px", fontSize: 11, color: "#fff", background: "linear-gradient(transparent,rgba(0,0,0,0.7))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const };
const curtidasBadgeStyle: React.CSSProperties = { position: "absolute", top: 7, left: 7, background: "rgba(225,29,72,0.85)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20 };

const qrLayoutStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" };
const qrCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 270 };
const qrImgStyle: React.CSSProperties = { width: 200, height: 200, borderRadius: 12, imageRendering: "pixelated" };
const qrBtnRowStyle: React.CSSProperties = { display: "flex", gap: 8, width: "100%" };
const cardSectionTitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" as const, margin: 0, alignSelf: "flex-start" as const };
const linkInfoCardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px", display: "flex", flexDirection: "column", gap: 0 };
const linkBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "10px 14px", marginTop: 10, flexWrap: "wrap" as const };
const linkTextStyle: React.CSSProperties = { flex: 1, fontSize: 13, color: "var(--primary, #7c3aed)", wordBreak: "break-all" as const };
const copyInlineBtnStyle: React.CSSProperties = { padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const stepNumStyle: React.CSSProperties = { width: 24, height: 24, minWidth: 24, borderRadius: "50%", background: "rgba(124,58,237,0.1)", color: "var(--primary, #7c3aed)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" };

const btnPrimaryStyle: React.CSSProperties = { padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--primary, #7c3aed)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 };
const btnOutlineStyle: React.CSSProperties = { padding: "10px 18px", borderRadius: 12, border: "1px solid var(--line)", background: "transparent", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 };

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontSize: 15, outline: "none", boxSizing: "border-box" as const };

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" };
const modalStyle: React.CSSProperties = { position: "relative", maxWidth: 700, width: "100%", background: "var(--card)", borderRadius: 20, overflow: "hidden", border: "1px solid var(--line)" };
const closeBtnStyle: React.CSSProperties = { position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 };
const modalMediaStyle: React.CSSProperties = { width: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", background: "#000" };
const modalFootStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", flexWrap: "wrap" as const, gap: 12 };
const toastStyle: React.CSSProperties = { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap" as const, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" };
