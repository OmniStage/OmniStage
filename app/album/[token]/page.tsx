"use client";

import { useEffect, useRef, useState } from "react";

type Midia = {
  id: string;
  arquivo_url: string;
  tipo: "image" | "video";
  uploader_nome: string | null;
  criado_em: string;
  curtidas: number;
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

type Aba = "home" | "albuns" | "videos" | "fotos" | "recados" | "compartilhar";

type Mensagem = {
  id: string;
  autor_nome: string | null;
  mensagem: string;
  criado_em: string;
};

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
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); carregarMensagens(); }, [token]);

  useEffect(() => {
    const saved = localStorage.getItem(`album-curtidas-${token}`);
    if (saved) setCurtidas(new Set(JSON.parse(saved)));
  }, [token]);

  async function carregarMensagens() {
    const res = await fetch(`/api/album/mensagens?token=${token}`);
    if (res.ok) {
      const json = await res.json();
      setMensagens(json.mensagens || []);
    }
  }

  async function enviarMensagem() {
    if (!novaMensagem.trim()) return;
    setEnviandoMsg(true);
    try {
      const res = await fetch("/api/album/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, autor_nome: nomeUploader.trim() || null, mensagem: novaMensagem.trim() }),
      });
      if (res.ok) {
        setNovaMensagem("");
        await carregarMensagens();
        mostrarToast("Recado enviado!");
      }
    } finally {
      setEnviandoMsg(false);
    }
  }

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/album?token=${token}`);
    const json = await res.json();
    if (!res.ok) { setErro(json.error || "Álbum não encontrado"); setLoading(false); return; }
    setEvento(json.evento);
    setAlbumNome(json.album?.nome || "");
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
    setNomeUploader(valor);
    if (valor.trim().length < 2) { setSugestoes([]); return; }
    setSugestoes(convidados.filter((n) => n.toLowerCase().includes(valor.toLowerCase())).slice(0, 6));
  }

  function selecionarNome(nome: string) {
    setNomeUploader(nome);
    setSugestoes([]);
    setModalNome(false);
    const ref = origemCamera ? cameraInputRef : fileInputRef;
    setTimeout(() => ref.current?.click(), 100);
  }

  function abrirUpload() {
    if (!nomeUploader.trim()) { setModalNome(true); }
    else { fileInputRef.current?.click(); }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arquivo = files[0];
    if (arquivo.size > MAX_FILE_SIZE) { mostrarToast("Arquivo muito grande. Máximo 50MB."); return; }
    setUploading(true);
    setUploadProgress(15);
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
      setAba("fotos");
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
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 6px 6px; color: #94a3b8; font-size: 9px; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase; transition: color 0.15s;
          font-family: inherit; min-width: 0; flex: 1;
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
          <div style={statsRowStyle}>
            <div style={statChipStyle}>
              <span style={statNumStyle}>{fotos.length}</span>
              <span style={statLblStyle}>fotos</span>
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)" }} />
            <div style={statChipStyle}>
              <span style={statNumStyle}>{videos.length}</span>
              <span style={statLblStyle}>vídeos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION CIRCLES (igual à referência) ── */}
      <div style={actionRowStyle}>
        <button className="action-circle" onClick={abrirUpload}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.1em" }}>FOTO</span>
        </button>
        <button className="action-circle" onClick={compartilhar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em" }}>PARTILHAR</span>
        </button>
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ height: 1, background: "#e2e8f0", margin: "18px 20px 0" }} />

      {/* ── CONTENT ── */}
      <div style={contentStyle}>

        {/* HOME */}
        {aba === "home" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p style={sectionKickerStyle}>SOBRE O EVENTO</p>
              <h2 style={sectionHeadStyle}>{evento?.nome}</h2>
              {evento?.data_evento && <p style={{ fontSize: 14, color: "#64748b", margin: "3px 0 0" }}>{formatarData(evento.data_evento)}</p>}
            </div>

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
                        <button key={nome} className="sug" style={sugItemStyle} onMouseDown={() => selecionarNome(nome)}>{nome}</button>
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
                      onClick={() => setModalMidia(m)} onLongPress={() => {}}
                      onCurtir={(e) => curtir(m.id, e)} />
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
            : `${lista.length} ${lista.length === 1 ? "item" : "itens"}`;

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
                  {visModo === "grade" && aba !== "videos" && (
                    <>
                      {modoSelecao && selecionados.size > 0 && (
                        <button style={{ ...selDlBtnStyle, marginLeft: 4 }}
                          onClick={() => selecionados.forEach((id) => {
                            const m = midias.find((x) => x.id === id);
                            if (m) { const a = document.createElement("a"); a.href = m.arquivo_url; a.download = ""; a.target = "_blank"; a.click(); }
                          })}>⬇ {selecionados.size}</button>
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
                /* ── CARROSSEL ── */
                <div>
                  <div className="carousel-area" style={{ aspectRatio: "1" }}>
                    {listaVis[idxUnica].tipo === "video"
                      ? <video key={listaVis[idxUnica].id} src={listaVis[idxUnica].arquivo_url} controls playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      : <img key={listaVis[idxUnica].id} src={listaVis[idxUnica].arquivo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                    }
                    {idxUnica > 0 && (
                      <button className="carousel-nav" style={{ left: 10 }} onClick={() => setIdxUnica(i => i - 1)}>‹</button>
                    )}
                    {idxUnica < listaVis.length - 1 && (
                      <button className="carousel-nav" style={{ right: 10 }} onClick={() => setIdxUnica(i => i + 1)}>›</button>
                    )}
                    {/* Coração no carrossel */}
                    <button className={`heart-btn${curtidas.has(listaVis[idxUnica].id) ? " curtido" : ""}`}
                      onClick={(e) => curtir(listaVis[idxUnica].id, e)}
                      style={{ top: 10, left: 10 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={curtidas.has(listaVis[idxUnica].id) ? "white" : "none"} stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      {(listaVis[idxUnica].curtidas || 0) > 0 && <span>{listaVis[idxUnica].curtidas}</span>}
                    </button>
                  </div>
                  {/* Dots */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    {listaVis.map((_, i) => (
                      <button key={i} onClick={() => setIdxUnica(i)} style={{ width: i === idxUnica ? 20 : 7, height: 7, borderRadius: 4, border: "none", background: i === idxUnica ? "#7c3aed" : "#e2e8f0", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
                    ))}
                  </div>
                  {/* Info */}
                  {listaVis[idxUnica].uploader_nome && (
                    <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", margin: "10px 0 0" }}>por {listaVis[idxUnica].uploader_nome}</p>
                  )}
                  <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>{idxUnica + 1} de {listaVis.length}</p>
                </div>
              ) : (
                /* ── GRADE ── */
                <div style={gridStyle}>
                  {listaVis.map((m) => (
                    <MidiaCard key={m.id} m={m} sel={selecionados.has(m.id)} modoSelecao={modoSelecao}
                      curtido={curtidas.has(m.id)}
                      onClick={() => {
                        if (modoSelecao) { toggleSelecao(m.id); return; }
                        const idx = listaVis.findIndex(x => x.id === m.id);
                        setIdxUnica(idx);
                        setVisModo("unica");
                      }}
                      onLongPress={() => { setModoSelecao(true); toggleSelecao(m.id); }}
                      onCurtir={(e) => curtir(m.id, e)} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* RECADOS */}
        {aba === "recados" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p style={sectionKickerStyle}>LIVRO DE VISITAS</p>
              <h2 style={sectionHeadStyle}>Recados</h2>
              <p style={{ fontSize: 14, color: "#64748b", margin: "3px 0 0" }}>Deixe uma mensagem para os anfitriões e convidados.</p>
            </div>

            {/* Caixa de envio */}
            <div style={uploadCardStyle}>
              {nomeUploader && (
                <p style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, margin: "0 0 8px" }}>Enviando como: <strong>{nomeUploader}</strong></p>
              )}
              <textarea
                placeholder="Escreva seu recado..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "none" as const, width: "100%", marginBottom: 10, lineHeight: 1.5 }}
              />
              {!nomeUploader && (
                <input
                  type="text"
                  placeholder="Seu nome (opcional)"
                  value={nomeUploader}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 10 }}
                />
              )}
              <button
                style={{ ...uploadBtnStyle, width: "100%", opacity: enviandoMsg || !novaMensagem.trim() ? 0.6 : 1 }}
                disabled={enviandoMsg || !novaMensagem.trim()}
                onClick={enviarMensagem}>
                {enviandoMsg ? "Enviando..." : "Enviar recado ✉️"}
              </button>
            </div>

            {/* Lista de mensagens */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {mensagens.length === 0 ? (
                <div style={emptyCardStyle}>
                  <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>✉️</div>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Nenhum recado ainda</p>
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Seja o primeiro a deixar uma mensagem!</p>
                </div>
              ) : (
                mensagens.map((msg) => (
                  <div key={msg.id} style={msgCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={avatarStyle}>
                        {(msg.autor_nome || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                          {msg.autor_nome || "Anônimo"}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                          {new Date(msg.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" as const }}>{msg.mensagem}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
                        <button key={nome} className="sug" style={sugItemStyle} onMouseDown={() => selecionarNome(nome)}>{nome}</button>
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

        {/* Câmera — abre câmera diretamente */}
        <button onClick={() => {
          if (!nomeUploader.trim()) { setOrigemCamera(true); setModalNome(true); return; }
          cameraInputRef.current?.click();
        }} style={cameraNavBtnStyle}>
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
        <TabBtn label="RECADOS" ativo={aba === "recados"} onClick={() => setAba("recados")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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
            <div style={lbFootStyle}>
              <div>
                {modalMidia.uploader_nome && <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#1e293b" }}>por {modalMidia.uploader_nome}</p>}
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
                onChange={(e) => handleNomeChange(e.target.value)} autoFocus style={inputStyle} />
              {sugestoes.length > 0 && (
                <div style={sugestoesStyle}>
                  {sugestoes.map((nome) => (
                    <button key={nome} className="sug" style={sugItemStyle} onMouseDown={() => selecionarNome(nome)}>{nome}</button>
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

// ─── MidiaCard ─────────────────────────────────────────────────────────────────
function MidiaCard({ m, sel, modoSelecao, curtido, onClick, onLongPress, onCurtir }: {
  m: Midia; sel: boolean; modoSelecao: boolean; curtido: boolean;
  onClick: () => void; onLongPress: () => void; onCurtir: (e: React.MouseEvent) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return (
    <div className="thumb" style={{ ...gridItemStyle, ...(sel ? gridItemSelStyle : {}) }}
      onClick={onClick}
      onTouchStart={() => { timer.current = setTimeout(onLongPress, 500); }}
      onTouchEnd={() => clearTimeout(timer.current)}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}>
      {m.tipo === "video"
        ? <video src={m.arquivo_url} style={thumbStyle} muted playsInline />
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
      {m.uploader_nome && <div style={nameTagStyle}>{m.uploader_nome}</div>}
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

const actionRowStyle: React.CSSProperties = { display: "flex", justifyContent: "center", gap: 28, padding: "18px 20px 0" };

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
const gridItemStyle: React.CSSProperties = { position: "relative", aspectRatio: "1", overflow: "hidden", borderRadius: 8, cursor: "pointer", background: "#e2e8f0", transition: "opacity 0.15s" };
const gridItemSelStyle: React.CSSProperties = { outline: "3px solid #7c3aed" };
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

const msgCardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const avatarStyle: React.CSSProperties = { width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 };
