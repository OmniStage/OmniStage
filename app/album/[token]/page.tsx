"use client";

import { useEffect, useRef, useState } from "react";

type Midia = {
  id: string;
  arquivo_url: string;
  tipo: "image" | "video";
  uploader_nome: string | null;
  criado_em: string;
  curtidas: number;
  legenda: string | null;
  uploader_session_id: string | null;
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

type Aba = "home" | "albuns" | "videos" | "fotos" | "compartilhar";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function AlbumPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [evento, setEvento] = useState<Evento | null>(null);
  const [albumNome, setAlbumNome] = useState("");
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
  const [toast, setToast] = useState("");
  const [modalNome, setModalNome] = useState(false);
  const [aba, setAba] = useState<Aba>("home");
  const [visModo, setVisModo] = useState<"grade" | "unica" | "favoritas">("grade");
  const [idxUnica, setIdxUnica] = useState(0);
  const [curtidas, setCurtidas] = useState<Set<string>>(new Set());
  const [origemCamera, setOrigemCamera] = useState(false);
  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [modalLegenda, setModalLegenda] = useState(false);
  const [legenda, setLegenda] = useState("");
  const [sessaoId, setSessaoId] = useState("");
  const [modalEditar, setModalEditar] = useState<{ midia: Midia; legenda: string } | null>(null);
  const [editorFotos, setEditorFotos] = useState(false);
  const [modalEditor, setModalEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const nomeRef = useRef("");

  useEffect(() => { carregar(); }, [token]);

  // Reset idx quando troca aba para evitar out-of-bounds crash
  useEffect(() => { setIdxUnica(0); }, [aba]);

  useEffect(() => {
    const saved = localStorage.getItem(`album-curtidas-${token}`);
    if (saved) setCurtidas(new Set(JSON.parse(saved)));
  }, [token]);

  useEffect(() => {
    const key = `album-sessao-${token}`;
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    setSessaoId(id);
  }, [token]);

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/album?token=${token}`);
    const json = await res.json();
    if (!res.ok) { setErro(json.error || "Álbum não encontrado"); setLoading(false); return; }
    setEvento(json.evento);
    setAlbumNome(json.album?.nome || "");
    setEditorFotos(json.album?.editor_fotos === true);
    setMidias(json.midias || []);
    setConvidados(json.convidados || []);
    setLoading(false);
  }

  async function curtir(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const jaCurtiu = curtidas.has(id);
    const novas = new Set(curtidas);
    jaCurtiu ? novas.delete(id) : novas.add(id);
    setCurtidas(novas);
    localStorage.setItem(`album-curtidas-${token}`, JSON.stringify([...novas]));
    setMidias((prev) => prev.map((m) => m.id === id ? { ...m, curtidas: Math.max(0, (m.curtidas || 0) + (jaCurtiu ? -1 : 1)) } : m));
    await fetch("/api/album", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, descurtir: jaCurtiu }) });
  }

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleNomeChange(valor: string) {
    nomeRef.current = valor;
    setNomeUploader(valor);
    if (valor.trim().length < 2) { setSugestoes([]); return; }
    setSugestoes(convidados.filter((n) => n.toLowerCase().includes(valor.toLowerCase())).slice(0, 6));
  }

  function selecionarNome(nome: string) {
    nomeRef.current = nome;
    setNomeUploader(nome);
    setSugestoes([]);
    setModalNome(false);
    const ref = origemCamera ? cameraInputRef : fileInputRef;
    setTimeout(() => ref.current?.click(), 150);
  }

  function abrirUpload() {
    setOrigemCamera(false);
    if (!nomeRef.current.trim() && !nomeUploader.trim()) { setModalNome(true); }
    else { fileInputRef.current?.click(); }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arquivo = files[0];
    if (arquivo.size > MAX_FILE_SIZE) { mostrarToast("Arquivo muito grande. Máximo 50MB."); return; }
    setArquivoPendente(arquivo);
    setLegenda("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (arquivo.type.startsWith("image") && editorFotos) {
      setPreviewUrl(URL.createObjectURL(arquivo));
      setModalEditor(true);
    } else {
      setPreviewUrl(arquivo.type.startsWith("image") ? URL.createObjectURL(arquivo) : "");
      setModalLegenda(true);
    }
  }

  async function confirmarEditor(blob: Blob) {
    if (!arquivoPendente) return;
    const editado = new File([blob], arquivoPendente.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
    setArquivoPendente(editado);
    setPreviewUrl(URL.createObjectURL(editado));
    setModalEditor(false);
    setModalLegenda(true);
  }

  async function confirmarUpload() {
    if (!arquivoPendente) return;
    setModalLegenda(false);
    setUploading(true);
    setUploadProgress(15);
    try {
      const res = await fetch("/api/album/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nome_arquivo: arquivoPendente.name,
          tipo_mime: arquivoPendente.type,
          uploader_nome: (nomeRef.current || nomeUploader).trim() || null,
          legenda: legenda.trim() || null,
          uploader_session_id: sessaoId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUploadProgress(50);
      const uploadRes = await fetch(json.signed_url, { method: "PUT", headers: { "Content-Type": arquivoPendente.type }, body: arquivoPendente });
      if (!uploadRes.ok) throw new Error("Falha no upload");
      setUploadProgress(90);
      await carregar();
      setUploadProgress(100);
      mostrarToast("Foto adicionada ao álbum!");
      setAba("fotos");
    } catch (e: any) {
      mostrarToast(e.message || "Erro no upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setArquivoPendente(null);
      setPreviewUrl("");
      setLegenda("");
    }
  }

  function toggleSelecao(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function compartilhar() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: evento?.nome || "Álbum do evento", url }); }
      catch {}
    } else {
      navigator.clipboard.writeText(url);
      mostrarToast("Link copiado!");
    }
  }

  function formatarData(d: string | null | undefined) {
    if (!d) return "";
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  async function salvarEdicao() {
    if (!modalEditar || !sessaoId) return;
    const { midia, legenda: novaLegenda } = modalEditar;
    const res = await fetch("/api/album/midia", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: midia.id, uploader_session_id: sessaoId, legenda: novaLegenda.trim() || null }),
    });
    if (res.ok) {
      setMidias((prev) => prev.map((m) => m.id === midia.id ? { ...m, legenda: novaLegenda.trim() || null } : m));
      mostrarToast("Legenda atualizada!");
    } else {
      mostrarToast("Erro ao salvar");
    }
    setModalEditar(null);
  }

  async function excluirFoto(id: string) {
    if (!sessaoId) return;
    const res = await fetch("/api/album/midia", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, uploader_session_id: sessaoId }),
    });
    if (res.ok) {
      setMidias((prev) => prev.filter((m) => m.id !== id));
      mostrarToast("Foto removida.");
    } else {
      mostrarToast("Erro ao remover");
    }
  }

  const bgUrl = evento?.background_url || evento?.background_image || "";
  const logoUrl = evento?.logo_url || evento?.logo_image || "";
  const fotos = midias.filter((m) => m.tipo === "image");
  const videos = midias.filter((m) => m.tipo === "video");

  if (loading) return (
    <div style={pageStyle}>
      <div style={centerStyle}>Carregando álbum...</div>
    </div>
  );

  if (erro) return (
    <div style={pageStyle}>
      <div style={{ ...centerStyle, color: "#dc2626" }}>{erro}</div>
    </div>
  );

  return (
    <div style={pageStyle}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #f8fafc; }
        .thumb:hover { opacity: 0.88; }
        .btn:hover { opacity: 0.9; }
        .sug:hover { background: #f1f5f9; }
        .heart-btn {
          position: absolute; top: 7px; left: 7px;
          background: rgba(0,0,0,0.4); border: none; border-radius: 20px;
          display: flex; align-items: center; gap: 3px;
          padding: 4px 8px; cursor: pointer; backdrop-filter: blur(4px);
          transition: transform 0.15s, background 0.15s;
          color: #fff; font-size: 11px; font-weight: 700;
        }
        .heart-btn:active { transform: scale(1.2); }
        .heart-btn.curtido { background: rgba(225,29,72,0.85); }
        .heart-btn svg { transition: fill 0.2s, transform 0.2s; }
        .heart-btn.curtido svg { fill: #fff; transform: scale(1.15); }
        .tab-btn {
          background: none; border: none; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 8px 10px; color: #94a3b8; font-size: 10px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase; transition: color 0.15s;
          font-family: inherit;
        }
        .tab-btn.active { color: #7c3aed; }
        .action-circle {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          background: none; border: 1.5px solid #e2e8f0; border-radius: 50%;
          width: 68px; height: 68px; cursor: pointer;
          transition: border-color 0.15s, background 0.15s; justify-content: center;
          font-family: inherit;
        }
        .action-circle:hover { border-color: #7c3aed; background: rgba(124,58,237,0.06); }
        .action-circle:active { transform: scale(0.95); }
        .cam-nav-btn:active { transform: scale(0.9); }
        .vis-btn { background: none; border: none; cursor: pointer; padding: 8px 10px; border-radius: 10px; color: #94a3b8; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
        .vis-btn.ativo { background: rgba(124,58,237,0.1); color: #7c3aed; }
        .vis-btn:active { transform: scale(0.9); }
        .carousel-area { position: relative; width: 100%; background: #0f172a; border-radius: 14px; overflow: hidden; }
        .carousel-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 5; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.15); border: none; color: #fff; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .carousel-nav:active { background: rgba(255,255,255,0.3); }
      `}</style>

      {/* Input galeria — sem capture para abrir seletor completo */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*"
        style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
      {/* Input câmera — capture força abrir câmera diretamente */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />

      {uploading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 100, background: "#e2e8f0" }}>
          <div style={{ height: "100%", width: `${uploadProgress}%`, background: "#7c3aed", transition: "width 0.3s" }} />
        </div>
      )}

      {/* ── BOTÃO PARTILHAR (canto superior direito) ── */}
      <button onClick={compartilhar} style={shareTopBtnStyle} title="Compartilhar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>

      {/* ── HERO ── */}
      <div style={heroStyle}>
        {bgUrl
          ? <img src={bgUrl} alt="" style={heroBgStyle} />
          : <div style={{ ...heroBgStyle, background: "linear-gradient(135deg,#4c1d95,#7c3aed)" }} />
        }
        <div style={heroOverlayStyle} />
        <div style={heroInnerStyle}>
          {logoUrl && (
            <div style={logoWrapStyle}>
              <img src={logoUrl} alt={evento?.nome} style={logoImgStyle} />
            </div>
          )}
          <p style={kickerStyle}>{evento?.nome?.toUpperCase()}</p>
          <h1 style={heroTitleStyle}>{albumNome || evento?.nome}</h1>
          {evento?.data_evento && <p style={heroDateStyle}>{formatarData(evento.data_evento)}</p>}
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ height: 1, background: "#e2e8f0", margin: "18px 20px 0" }} />

      {/* ── CONTENT ── */}
      <div style={contentStyle}>

        {/* HOME */}
        {aba === "home" && (
          <div>
            <div style={uploadCardStyle}>
              <p style={sectionKickerStyle}>ADICIONAR MÍDIA</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>Compartilhe um momento</h3>
              <div style={uploadRowStyle}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input type="text" placeholder="Seu nome (opcional)" value={nomeUploader}
                    onChange={(e) => handleNomeChange(e.target.value)}
                    onBlur={() => setTimeout(() => setSugestoes([]), 200)}
                    autoComplete="off" style={inputStyle} />
                  {sugestoes.length > 0 && (
                    <div style={sugestoesStyle}>
                      {sugestoes.map((nome) => (
                        <button key={nome} className="sug" style={sugItemStyle} onClick={() => selecionarNome(nome)}>{nome}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn" style={{ ...uploadBtnStyle, opacity: uploading ? 0.6 : 1 }}
                  disabled={uploading} onClick={abrirUpload}>
                  {uploading ? `${uploadProgress}%` : "+ Adicionar"}
                </button>
              </div>
              {nomeUploader && <p style={{ fontSize: 12, color: "#7c3aed", margin: "8px 0 0", fontWeight: 500 }}>Enviando como: <strong>{nomeUploader}</strong></p>}
            </div>

            {midias.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 10px" }}>
                  <p style={{ ...sectionKickerStyle, margin: 0 }}>ÚLTIMAS ADICIONADAS</p>
                  <button style={verTodosBtnStyle} onClick={() => setAba("albuns")}>Ver todas →</button>
                </div>
                <div style={gridStyle}>
                  {midias.slice(0, 6).map((m) => (
                    <MidiaCard key={m.id} m={m} sel={false} modoSelecao={false}
                      curtido={curtidas.has(m.id)}
                      isMinha={!!sessaoId && m.uploader_session_id === sessaoId}
                      onClick={() => setModalMidia(m)} onLongPress={() => {}}
                      onCurtir={(e) => curtir(m.id, e)}
                      onEditar={() => setModalEditar({ midia: m, legenda: m.legenda || "" })}
                      onExcluir={() => { if (confirm("Remover esta foto do álbum?")) excluirFoto(m.id); }} />
                  ))}
                </div>
              </>
            )}

            {midias.length === 0 && (
              <div style={emptyCardStyle}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.35 }}>📷</div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 4px", color: "#1e293b" }}>Nenhuma foto ainda</p>
                <p style={{ fontSize: 13, margin: 0, color: "#94a3b8" }}>Seja o primeiro a adicionar um momento!</p>
              </div>
            )}
          </div>
        )}

        {/* ÁLBUNS / VÍDEOS / FOTOS — com barra de modo de visualização */}
        {(aba === "albuns" || aba === "videos" || aba === "fotos") && (() => {
          const lista = aba === "albuns" ? midias : aba === "videos" ? videos : fotos;
          const listaFavs = lista.filter((m) => curtidas.has(m.id));
          const listaVis = visModo === "favoritas" ? listaFavs : lista;
          const emptyMsg = aba === "videos" ? "Nenhum vídeo ainda" : aba === "fotos" ? "Nenhuma foto ainda" : "Nenhuma mídia ainda";
          const emptyIcon = aba === "videos" ? "🎬" : "📷";
          const countLabel = aba === "videos"
            ? `${lista.length} ${lista.length === 1 ? "vídeo" : "vídeos"}`
            : aba === "fotos"
            ? `${lista.length} ${lista.length === 1 ? "foto" : "fotos"}`
            : `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"} · ${videos.length} ${videos.length === 1 ? "vídeo" : "vídeos"}`;

          return (
            <div>
              {/* Barra de modos */}
              <div style={visBarStyle}>
                <span style={toolbarCountStyle}>{visModo === "favoritas" ? `${listaFavs.length} favoritas` : countLabel}</span>
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  {/* Grade */}
                  <button className={`vis-btn${visModo === "grade" ? " ativo" : ""}`} onClick={() => setVisModo("grade")} title="Grade">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/>
                      <rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>
                    </svg>
                  </button>
                  {/* Visualização única */}
                  <button className={`vis-btn${visModo === "unica" ? " ativo" : ""}`} onClick={() => { setVisModo("unica"); setIdxUnica(0); }} title="Uma por vez">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2"/>
                    </svg>
                  </button>
                  {/* Favoritas */}
                  <button className={`vis-btn${visModo === "favoritas" ? " ativo" : ""}`} onClick={() => setVisModo("favoritas")} title="Favoritas">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={visModo === "favoritas" ? "#e11d48" : "none"} stroke={visModo === "favoritas" ? "#e11d48" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                  {/* Selecionar (só no modo grade) */}
                  {visModo === "grade" && (
                    <>
                      {modoSelecao && selecionados.size > 0 && (
                        <button style={{ ...selDlBtnStyle, marginLeft: 4 }}
                          onClick={async () => {
                            for (const id of selecionados) {
                              const m = midias.find((x) => x.id === id);
                              if (!m) continue;
                              try {
                                const r = await fetch(m.arquivo_url);
                                const blob = await r.blob();
                                const ext = m.arquivo_url.split("?")[0].split(".").pop() || (m.tipo === "video" ? "mp4" : "jpg");
                                const a = document.createElement("a");
                                a.href = URL.createObjectURL(blob);
                                a.download = `foto.${ext}`;
                                a.click();
                                URL.revokeObjectURL(a.href);
                                await new Promise((res) => setTimeout(res, 300));
                              } catch {}
                            }
                          }}>⬇ {selecionados.size}</button>
                      )}
                      <button style={{ ...selBtnStyle, ...(modoSelecao ? selBtnActiveStyle : {}), marginLeft: 4 }}
                        onClick={() => { setModoSelecao(!modoSelecao); setSelecionados(new Set()); }}>
                        {modoSelecao ? "Cancelar" : "Selecionar"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {listaVis.length === 0 ? (
                <div style={emptyCardStyle}>
                  <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>{visModo === "favoritas" ? "🤍" : emptyIcon}</div>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{visModo === "favoritas" ? "Nenhuma favorita ainda" : emptyMsg}</p>
                </div>
              ) : visModo === "unica" ? (
                /* ── CARROSSEL SCROLL-SNAP NATIVO (sem flash, sem jank) ── */
                <SnapCarousel
                  lista={listaVis}
                  idx={idxUnica}
                  onIdxChange={setIdxUnica}
                  curtidas={curtidas}
                  onCurtir={curtir}
                />
              ) : (
                /* ── GRADE ── */
                <div style={gridStyle}>
                  {listaVis.map((m) => (
                    <MidiaCard key={m.id} m={m} sel={selecionados.has(m.id)} modoSelecao={modoSelecao}
                      curtido={curtidas.has(m.id)}
                      isMinha={!!sessaoId && m.uploader_session_id === sessaoId}
                      onClick={() => {
                        if (modoSelecao) { toggleSelecao(m.id); return; }
                        const idx = listaVis.findIndex(x => x.id === m.id);
                        setIdxUnica(idx);
                        setVisModo("unica");
                      }}
                      onLongPress={() => { setModoSelecao(true); toggleSelecao(m.id); }}
                      onCurtir={(e) => curtir(m.id, e)}
                      onEditar={() => setModalEditar({ midia: m, legenda: m.legenda || "" })}
                      onExcluir={() => { if (confirm("Remover esta foto do álbum?")) excluirFoto(m.id); }} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* COMPARTILHAR */}
        {aba === "compartilhar" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p style={sectionKickerStyle}>COMPARTILHAR ÁLBUM</p>
              <h2 style={sectionHeadStyle}>Convide mais pessoas</h2>
              <p style={{ fontSize: 14, color: "#64748b", margin: "3px 0 0" }}>Envie este link para convidados adicionarem fotos e vídeos.</p>
            </div>
            <div style={shareCardStyle}>
              <p style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, margin: "0 0 8px", letterSpacing: "0.1em" }}>LINK DO ÁLBUM</p>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#7c3aed", wordBreak: "break-all" as const }}>
                  {typeof window !== "undefined" ? window.location.href : ""}
                </span>
              </div>
              <button style={shareBtnStyle} onClick={compartilhar}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Compartilhar / Copiar link
              </button>
            </div>
            <div style={{ ...uploadCardStyle, marginTop: 14 }}>
              <p style={sectionKickerStyle}>ADICIONAR MÍDIA</p>
              <div style={uploadRowStyle}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input type="text" placeholder="Seu nome (opcional)" value={nomeUploader}
                    onChange={(e) => handleNomeChange(e.target.value)}
                    onBlur={() => setTimeout(() => setSugestoes([]), 200)}
                    autoComplete="off" style={inputStyle} />
                  {sugestoes.length > 0 && (
                    <div style={sugestoesStyle}>
                      {sugestoes.map((nome) => (
                        <button key={nome} className="sug" style={sugItemStyle} onClick={() => selecionarNome(nome)}>{nome}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn" style={{ ...uploadBtnStyle, opacity: uploading ? 0.6 : 1 }}
                  disabled={uploading} onClick={abrirUpload}>
                  {uploading ? `${uploadProgress}%` : "+ Adicionar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={bottomNavStyle}>
        <TabBtn label="HOME" ativo={aba === "home"} onClick={() => setAba("home")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </TabBtn>
        <TabBtn label="ÁLBUNS" ativo={aba === "albuns"} onClick={() => setAba("albuns")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </TabBtn>

        {/* Câmera — abre câmera diretamente sem modal intermediário */}
        <button onClick={() => { setOrigemCamera(true); if (!nomeUploader.trim()) { setModalNome(true); } else { cameraInputRef.current?.click(); } }} style={cameraNavBtnStyle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>

        <TabBtn label="VÍDEOS" ativo={aba === "videos"} onClick={() => setAba("videos")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </TabBtn>
        <TabBtn label="FOTOS" ativo={aba === "fotos"} onClick={() => setAba("fotos")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </TabBtn>
      </nav>

      {/* ── LIGHTBOX ── */}
      {modalMidia && (
        <div style={overlayStyle} onClick={() => setModalMidia(null)}>
          <div style={lightboxStyle} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setModalMidia(null)}>✕</button>
            {modalMidia.tipo === "video"
              ? <video src={modalMidia.arquivo_url} controls autoPlay playsInline style={lbMediaStyle} />
              : <img src={modalMidia.arquivo_url} alt="" style={lbMediaStyle} />
            }
            {modalMidia.legenda && (
              <div style={{ padding: "12px 18px 0", borderTop: "1px solid #f1f5f9" }}>
                <p style={{ margin: 0, fontSize: 15, color: "#334155", lineHeight: 1.6, fontStyle: "italic" }}>"{modalMidia.legenda}"</p>
                {modalMidia.uploader_nome && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7c3aed", fontWeight: 700 }}>— {modalMidia.uploader_nome}</p>}
              </div>
            )}
            <div style={lbFootStyle}>
              <div>
                {!modalMidia.legenda && modalMidia.uploader_nome && <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#1e293b" }}>por {modalMidia.uploader_nome}</p>}
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>{new Date(modalMidia.criado_em).toLocaleDateString("pt-BR")}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={(e) => curtir(modalMidia.id, e)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "8px 14px", borderRadius: 10, border: "none",
                    background: curtidas.has(modalMidia.id) ? "#fee2e2" : "#f1f5f9",
                    color: curtidas.has(modalMidia.id) ? "#e11d48" : "#64748b",
                    fontSize: 14, fontWeight: 700, cursor: curtidas.has(modalMidia.id) ? "default" : "pointer",
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={curtidas.has(modalMidia.id) ? "#e11d48" : "none"} stroke={curtidas.has(modalMidia.id) ? "#e11d48" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {midias.find(x => x.id === modalMidia.id)?.curtidas || 0}
                </button>
                <a href={modalMidia.arquivo_url} download target="_blank" rel="noreferrer" style={lbDlBtnStyle}>⬇ Baixar</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NOME ── */}
      {modalNome && (
        <div style={overlayStyle} onClick={() => setModalNome(false)}>
          <div style={nomeModalStyle} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Qual é o seu nome?</p>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 16px" }}>Opcional — para identificar suas fotos no álbum.</p>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Digite seu nome..." value={nomeUploader}
                onChange={(e) => handleNomeChange(e.target.value)}
                onBlur={() => setTimeout(() => setSugestoes([]), 200)}
                autoFocus style={inputStyle} />
              {sugestoes.length > 0 && (
                <div style={sugestoesStyle}>
                  {sugestoes.map((nome) => (
                    <button key={nome} className="sug" style={sugItemStyle} onClick={() => selecionarNome(nome)}>{nome}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={skipBtnStyle} onClick={() => {
                setModalNome(false);
                const ref = origemCamera ? cameraInputRef : fileInputRef;
                setTimeout(() => ref.current?.click(), 100);
              }}>Pular</button>
              <button style={confirmBtnStyle} onClick={() => {
                setModalNome(false);
                const ref = origemCamera ? cameraInputRef : fileInputRef;
                setTimeout(() => ref.current?.click(), 100);
              }}>{origemCamera ? "Confirmar e tirar foto" : "Confirmar e escolher foto"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITOR DE FOTO (Filerobot) ── */}
      {modalEditor && previewUrl && (
        <FilerobotEditorModal
          src={previewUrl}
          onConfirm={confirmarEditor}
          onSkip={() => { setModalEditor(false); setModalLegenda(true); }}
          onClose={() => { setModalEditor(false); setArquivoPendente(null); }}
        />
      )}

      {modalLegenda && arquivoPendente && (
        <div style={overlayStyle}>
          <div style={nomeModalStyle} onClick={(e) => e.stopPropagation()}>
            {/* Preview da foto */}
            {previewUrl && (
              <div style={{ width: "100%", height: 180, borderRadius: 12, overflow: "hidden", marginBottom: 16, background: "#0f172a" }}>
                <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>Adicionar mensagem</p>
              <button onClick={() => { setModalLegenda(false); setArquivoPendente(null); }} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer", padding: "0 0 0 8px", lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 14px" }}>Opcional — escreva algo para acompanhar sua foto.</p>
            {!nomeUploader.trim() && (
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Seu nome (opcional)"
                  value={nomeUploader}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  onBlur={() => setTimeout(() => setSugestoes([]), 200)}
                  style={inputStyle}
                />
                {sugestoes.length > 0 && (
                  <div style={sugestoesStyle}>
                    {sugestoes.map((nome) => (
                      <button key={nome} className="sug" style={sugItemStyle}
                        onClick={() => { setNomeUploader(nome); setSugestoes([]); }}>
                        {nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {nomeUploader.trim() && (
              <p style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, margin: "0 0 10px" }}>Enviando como: <strong>{nomeUploader}</strong></p>
            )}
            <textarea
              placeholder={`"Que momento incrível! Obrigado pela festa..."`}
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "none" as const, width: "100%", lineHeight: 1.6, fontStyle: legenda ? "normal" : "italic" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={skipBtnStyle} onClick={confirmarUpload}>Pular</button>
              <button style={confirmBtnStyle} onClick={confirmarUpload}>
                {legenda.trim() ? "Enviar com mensagem ✉️" : "Enviar foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR LEGENDA ── */}
      {modalEditar && (
        <div style={overlayStyle}>
          <div style={nomeModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>Editar mensagem</p>
              <button onClick={() => setModalEditar(null)} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer", padding: "0 0 0 8px", lineHeight: 1 }}>✕</button>
            </div>
            <textarea
              placeholder="Escreva uma mensagem..."
              value={modalEditar.legenda}
              onChange={(e) => setModalEditar({ ...modalEditar, legenda: e.target.value })}
              rows={3}
              autoFocus
              style={{ ...inputStyle, resize: "none" as const, width: "100%", lineHeight: 1.6, marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={skipBtnStyle} onClick={() => setModalEditar(null)}>Cancelar</button>
              <button style={confirmBtnStyle} onClick={salvarEdicao}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

// ─── TabBtn ────────────────────────────────────────────────────────────────────
function TabBtn({ label, ativo, onClick, children }: { label: string; ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`tab-btn${ativo ? " active" : ""}`} onClick={onClick}>
      {children}
      {label}
    </button>
  );
}

// ─── SnapCarousel — scroll-snap nativo, zero flash ──────────────────────────────
function SnapCarousel({ lista, idx, onIdxChange, curtidas, onCurtir }: {
  lista: { id: string; arquivo_url: string; tipo: "image" | "video"; uploader_nome: string | null; legenda: string | null; curtidas: number }[];
  idx: number;
  onIdxChange: (i: number) => void;
  curtidas: Set<string>;
  onCurtir: (id: string, e: React.MouseEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdxRef = useRef(idx);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const [localIdx, setLocalIdx] = useState(idx);

  // Rola programaticamente quando idx muda externamente (dots, aba)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = idx * el.offsetWidth;
    if (Math.abs(el.scrollLeft - target) > 2) {
      el.scrollTo({ left: target, behavior: "smooth" });
      lastIdxRef.current = idx;
      setLocalIdx(idx);
    }
  }, [idx]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const newIdx = Math.round(el.scrollLeft / el.offsetWidth);
    // Atualiza dots imediatamente (só estado local, sem re-render do pai)
    if (newIdx !== localIdx) setLocalIdx(newIdx);
    // Só avisa o pai DEPOIS que o scroll parou (evita re-render durante animação)
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (newIdx !== lastIdxRef.current && newIdx >= 0 && newIdx < lista.length) {
        lastIdxRef.current = newIdx;
        onIdxChange(newIdx);
      }
    }, 120);
  }

  const safeIdx = Math.min(localIdx, lista.length - 1);
  const midiaAtual = lista[safeIdx] || lista[0];

  return (
    <div>
      {/* Scroll container com snap nativo */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          overflowX: "scroll",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch" as any,
          scrollbarWidth: "none" as any,
          msOverflowStyle: "none" as any,
          aspectRatio: "3/4",
          position: "relative",
          background: "#111",
        } as React.CSSProperties}
      >
        {lista.map((m) => (
          <div key={m.id} style={{ flex: "0 0 100%", scrollSnapAlign: "start", position: "relative", height: "100%", background: "#111" }}>
            {m.tipo === "video"
              ? <VideoPlayer src={m.arquivo_url} style={{ width: "100%", height: "100%", objectFit: "contain" as const, display: "block" }} />
              : <img src={m.arquivo_url} alt="" loading="eager" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            }
            {/* Coração */}
            <button className={`heart-btn${curtidas.has(m.id) ? " curtido" : ""}`}
              onClick={(e) => onCurtir(m.id, e)}
              style={{ top: 10, left: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={curtidas.has(m.id) ? "white" : "none"} stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {(m.curtidas || 0) > 0 && <span>{m.curtidas}</span>}
            </button>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {lista.map((_, i) => (
          <button key={i} onClick={() => onIdxChange(i)} style={{ width: i === safeIdx ? 20 : 7, height: 7, borderRadius: 4, border: "none", background: i === safeIdx ? "#7c3aed" : "#e2e8f0", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
        ))}
      </div>

      {/* Info */}
      {midiaAtual?.legenda && (
        <div style={legendaCardStyle}>
          <p style={{ margin: 0, fontSize: 15, color: "#334155", lineHeight: 1.6, fontStyle: "italic" }}>"{midiaAtual.legenda}"</p>
          {midiaAtual.uploader_nome && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#7c3aed", fontWeight: 700 }}>— {midiaAtual.uploader_nome}</p>}
        </div>
      )}
      {!midiaAtual?.legenda && midiaAtual?.uploader_nome && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", margin: "10px 0 0" }}>por {midiaAtual.uploader_nome}</p>
      )}
      <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>{safeIdx + 1} de {lista.length}</p>
    </div>
  );
}

// ─── VideoThumb — miniatura real via seek no DOM ────────────────────────────────
function VideoThumb({ src, style }: { src: string; style: React.CSSProperties }) {
  return (
    <video
      src={src}
      preload="metadata"
      muted
      playsInline
      style={style}
      onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.5; }}
    />
  );
}

// ─── VideoPlayer — visualização única com miniatura real ─────────────────────────
function VideoPlayer({ src, style }: { src: string; style: React.CSSProperties }) {
  const [playing, setPlaying] = useState(false);
  const thumbRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { setPlaying(false); }, [src]);

  if (playing) {
    return (
      <video
        key={src + "-play"}
        src={src}
        controls
        autoPlay
        playsInline
        preload="auto"
        style={style}
      />
    );
  }

  return (
    <div style={{ ...style, position: "relative", cursor: "pointer" }} onClick={() => setPlaying(true)}>
      <video
        ref={thumbRef}
        src={src}
        preload="metadata"
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        onLoadedMetadata={() => { if (thumbRef.current) thumbRef.current.currentTime = 0.5; }}
      />
      {/* Overlay com botão play */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
    </div>
  );
}

// ─── MidiaCard ─────────────────────────────────────────────────────────────────
function MidiaCard({ m, sel, modoSelecao, curtido, isMinha, onClick, onLongPress, onCurtir, onEditar, onExcluir }: {
  m: Midia; sel: boolean; modoSelecao: boolean; curtido: boolean; isMinha?: boolean;
  onClick: () => void; onLongPress: () => void; onCurtir: (e: React.MouseEvent) => void;
  onEditar?: () => void; onExcluir?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return (
    <div className="thumb" style={{ ...gridItemStyle, ...(sel ? gridItemSelStyle : {}), ...(modoSelecao && !sel ? { opacity: 0.5 } : {}) }}
      onClick={onClick}
      onTouchStart={() => { timer.current = setTimeout(onLongPress, 500); }}
      onTouchEnd={() => clearTimeout(timer.current)}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}>
      {m.tipo === "video"
        ? <VideoThumb src={m.arquivo_url} style={thumbStyle} />
        : <img src={m.arquivo_url} alt="" style={thumbStyle} loading="lazy" />
      }
      {m.tipo === "video" && (
        <div style={videoBadgeStyle}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        </div>
      )}
      {/* Coração */}
      <button className={`heart-btn${curtido ? " curtido" : ""}`} onClick={onCurtir}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill={curtido ? "white" : "none"} stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        {(m.curtidas || 0) > 0 && <span>{m.curtidas}</span>}
      </button>
      {/* Botões editar/excluir — apenas para fotos desta sessão */}
      {isMinha && !modoSelecao && (
        <div style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 5 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEditar?.(); }}
            style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(0,0,0,0.55)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}
            title="Editar legenda">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onExcluir?.(); }}
            style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(220,38,38,0.7)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}
            title="Remover foto">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      )}
      {!m.legenda && m.uploader_nome && <div style={nameTagStyle}>{m.uploader_nome}</div>}
      {m.legenda && (
        <div style={legendaOverlayStyle}>
          {m.uploader_nome && <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>{m.uploader_nome} · </span>}
          <span style={{ fontSize: 10, fontStyle: "italic" }}>"{m.legenda}"</span>
        </div>
      )}
      {modoSelecao && (
        <div style={{ ...checkStyle, ...(sel ? checkSelStyle : {}) }}>
          {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', -apple-system, sans-serif", color: "#0f172a", paddingBottom: 80 };
const centerStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 15, color: "#94a3b8" };

const heroStyle: React.CSSProperties = { position: "relative", height: 280, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" };
const heroBgStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" };
const heroOverlayStyle: React.CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.75) 100%)" };
const heroInnerStyle: React.CSSProperties = { position: "relative", zIndex: 2, textAlign: "center", padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", color: "#fff" };
const logoWrapStyle: React.CSSProperties = { width: 80, height: 80, borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.14)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 };
const logoImgStyle: React.CSSProperties = { width: 72, height: 72, objectFit: "contain" };
const kickerStyle: React.CSSProperties = { fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)", fontWeight: 700, margin: "0 0 4px" };
const heroTitleStyle: React.CSSProperties = { fontSize: 24, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em", textShadow: "0 2px 8px rgba(0,0,0,0.5)" };
const heroDateStyle: React.CSSProperties = { fontSize: 13, margin: "0 0 8px", color: "rgba(255,255,255,0.65)", fontWeight: 500 };
const statsRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 20 };
const statChipStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center" };
const statNumStyle: React.CSSProperties = { fontSize: 18, fontWeight: 800, lineHeight: 1 };
const statLblStyle: React.CSSProperties = { fontSize: 10, letterSpacing: "0.1em", opacity: 0.6, textTransform: "uppercase" };

const shareTopBtnStyle: React.CSSProperties = { position: "fixed", top: 16, right: 16, zIndex: 70, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

const contentStyle: React.CSSProperties = { padding: "20px 16px 0", maxWidth: 860, margin: "0 auto" };
const sectionKickerStyle: React.CSSProperties = { fontSize: 10, letterSpacing: "0.15em", color: "#7c3aed", fontWeight: 800, margin: "0 0 3px" };
const sectionHeadStyle: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: 0, color: "#0f172a" };

const uploadCardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 18px", marginTop: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const uploadRowStyle: React.CSSProperties = { display: "flex", gap: 8 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 11, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 15, outline: "none", color: "#0f172a", boxSizing: "border-box" as const };
const uploadBtnStyle: React.CSSProperties = { padding: "11px 15px", borderRadius: 11, border: "none", background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const };
const verTodosBtnStyle: React.CSSProperties = { fontSize: 12, color: "#7c3aed", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 };

const toolbarStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 };
const visBarStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "8px 0 10px", borderBottom: "1px solid #e2e8f0" };
const toolbarCountStyle: React.CSSProperties = { fontSize: 13, color: "#64748b", fontWeight: 600 };
const selBtnStyle: React.CSSProperties = { padding: "7px 13px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const selBtnActiveStyle: React.CSSProperties = { background: "#f1f5f9", color: "#7c3aed", borderColor: "rgba(124,58,237,0.3)" };
const selDlBtnStyle: React.CSSProperties = { padding: "7px 13px", borderRadius: 10, border: "none", background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 };
const gridItemStyle: React.CSSProperties = { position: "relative", aspectRatio: "3/4", overflow: "hidden", borderRadius: 8, cursor: "pointer", background: "#d1d5db", transition: "opacity 0.1s, outline 0.1s" };
const gridItemSelStyle: React.CSSProperties = { outline: "3px solid #7c3aed", opacity: 1 };
const thumbStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const videoBadgeStyle: React.CSSProperties = { position: "absolute", bottom: 5, right: 5, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "3px 4px", display: "flex" };
const nameTagStyle: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", fontSize: 10, color: "#fff", background: "linear-gradient(transparent,rgba(0,0,0,0.7))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const };
const checkStyle: React.CSSProperties = { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" };
const checkSelStyle: React.CSSProperties = { background: "#7c3aed", border: "2px solid #7c3aed" };
const emptyCardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "44px 20px", textAlign: "center", marginTop: 14 };

const shareCardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 18px" };
const shareBtnStyle: React.CSSProperties = { width: "100%", padding: "12px", borderRadius: 11, border: "none", background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const sugestoesStyle: React.CSSProperties = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" };
const sugItemStyle: React.CSSProperties = { display: "block", width: "100%", padding: "11px 14px", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontSize: 14, textAlign: "left" as const, cursor: "pointer" };

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" };
const nomeModalStyle: React.CSSProperties = { background: "#fff", borderRadius: 20, padding: "26px 22px", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" };
const skipBtnStyle: React.CSSProperties = { flex: 1, padding: "12px", borderRadius: 11, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const confirmBtnStyle: React.CSSProperties = { flex: 2, padding: "12px", borderRadius: 11, border: "none", background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" };

const lightboxStyle: React.CSSProperties = { background: "#fff", borderRadius: 18, overflow: "hidden", maxWidth: 700, width: "100%", position: "relative" };
const closeBtnStyle: React.CSSProperties = { position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 };
const lbMediaStyle: React.CSSProperties = { width: "100%", maxHeight: "72vh", objectFit: "contain", display: "block", background: "#0f172a" };
const lbFootStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px" };
const lbDlBtnStyle: React.CSSProperties = { padding: "8px 14px", borderRadius: 9, background: "#f1f5f9", color: "#0f172a", fontSize: 13, textDecoration: "none", fontWeight: 600 };

const cameraNavBtnStyle: React.CSSProperties = {
  width: 56, height: 56, borderRadius: "50%",
  background: "#7c3aed", border: "3px solid #f8fafc",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
  marginTop: -18, transition: "transform 0.15s", flexShrink: 0,
};

const bottomNavStyle: React.CSSProperties = {
  position: "fixed", bottom: 0, left: 0, right: 0, height: 68,
  background: "rgba(255,255,255,0.96)", backdropFilter: "blur(16px)",
  borderTop: "1px solid #e2e8f0",
  display: "flex", alignItems: "center", justifyContent: "space-around",
  zIndex: 60, paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

const toastStyle: React.CSSProperties = { position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "#fff", padding: "11px 22px", borderRadius: 100, fontSize: 13, fontWeight: 500, zIndex: 200, whiteSpace: "nowrap" as const, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };

const legendaCardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px", margin: "12px 0 0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const legendaOverlayStyle: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 7px 5px", fontSize: 10, color: "#fff", background: "linear-gradient(transparent,rgba(0,0,0,0.82))", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, lineHeight: 1.4 };

// ── Filerobot Image Editor Modal ──
// Lazy-loaded to avoid SSR issues and reduce bundle size for albums without editor
function FilerobotEditorModal({ src, onConfirm, onSkip, onClose }: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let instance: { terminate: () => void } | null = null;

    async function init() {
      const { default: FilerobotImageEditor } = await import("filerobot-image-editor");
      const TABS = (FilerobotImageEditor as any).TABS;
      const TOOLS = (FilerobotImageEditor as any).TOOLS;

      if (destroyed || !containerRef.current) return;

      instance = new (FilerobotImageEditor as any)(containerRef.current, {
        source: src,
        language: "pt",
        tabsIds: TABS ? [TABS.ANNOTATE, TABS.FILTERS, TABS.ADJUST] : undefined,
        defaultTabId: TABS?.ANNOTATE,
        defaultToolId: TOOLS?.TEXT,
        annotationsCommon: { fill: "#ffffff" },
        onSave: async (editedImageObject: { imageCanvas?: HTMLCanvasElement }) => {
          const canvas = editedImageObject.imageCanvas;
          if (!canvas) { onSkip(); return; }
          canvas.toBlob((blob) => {
            if (blob) onConfirm(blob);
            else onSkip();
          }, "image/jpeg", 0.92);
        },
        onClose: (closingReason: string) => {
          if (closingReason === "toolbar-close-button") onSkip();
          else onClose();
        },
        useBackendTranslations: false,
        showCanvasOnly: false,
        theme: {
          palette: { "accent-primary": "#7c3aed", "accent-primary-hover": "#6d28d9" },
        },
      });
    }

    init();
    return () => {
      destroyed = true;
      instance?.terminate();
    };
  }, [src]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f172a" }}>
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
        <button onClick={onSkip} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
          Pular edição →
        </button>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
