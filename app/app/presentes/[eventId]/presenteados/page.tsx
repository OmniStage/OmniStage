"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Evento = { id: string; nome: string | null; tenant_id: string | null };

type Convidado = {
  id: string;
  nome: string | null;
  telefone: string | null;
  token: string | null;
  grupo: string | null;
};

type Presente = {
  id: string;
  nome_presente: string | null;
  nome_convidado: string | null;
  telefone_convidado: string | null;
  observacao: string | null;
  foto_url: string | null;
  nota_fiscal_url: string | null;
  tipo_presente: string | null;
  etiqueta_codigo: string | null;
  ia_confianca: number | null;
  status: string | null;
  created_at: string | null;
  ia_processado: boolean | null;
  categoria_detectada: string | null;
  marca_detectada: string | null;
};

type Form = {
  convidado_id: string;
  nome_convidado: string;
  telefone_convidado: string;
  token_convidado: string;
  tipo_presente: string;
  nome_presente: string;
  observacao: string;
  categoria_detectada: string;
  marca_detectada: string;
};

const FORM_VAZIO: Form = {
  convidado_id: "",
  nome_convidado: "",
  telefone_convidado: "",
  token_convidado: "",
  tipo_presente: "presente_fisico",
  nome_presente: "",
  observacao: "",
  categoria_detectada: "",
  marca_detectada: "",
};

const TIPOS_PRESENTE = [
  { value: "presente_fisico", label: "Presente físico" },
  { value: "envelope", label: "Envelope" },
  { value: "sem_identificacao", label: "Sem identificação" },
];

function formatarData(data: string | null) {
  if (!data) return "";
  try {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return data; }
}

export default function RecebidosAntesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params?.eventId || "");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [evento, setEvento] = useState<Evento | null>(null);
  const [presentes, setPresentes] = useState<Presente[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [busca, setBusca] = useState("");

  // Busca de convidado
  const [buscaConvidado, setBuscaConvidado] = useState("");
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [buscandoConvidado, setBuscandoConvidado] = useState(false);
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Câmera - foto do presente
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  // Câmera - NF (no formulário de cadastro)
  const videoNfRef = useRef<HTMLVideoElement>(null);
  const canvasNfRef = useRef<HTMLCanvasElement>(null);
  const streamNfRef = useRef<MediaStream | null>(null);
  const [cameraNfAtiva, setCameraNfAtiva] = useState(false);
  const [nfPreview, setNfPreview] = useState<string | null>(null);
  const [nfFile, setNfFile] = useState<File | null>(null);

  // NF modal nos cards
  const [nfCardAberto, setNfCardAberto] = useState<string | null>(null);
  const [nfCardFile, setNfCardFile] = useState<File | null>(null);
  const [salvandoNfCard, setSalvandoNfCard] = useState(false);
  const videoNfModalRef = useRef<HTMLVideoElement>(null);
  const canvasNfModalRef = useRef<HTMLCanvasElement>(null);
  const streamNfModalRef = useRef<MediaStream | null>(null);
  const [cameraNfModalAtiva, setCameraNfModalAtiva] = useState(false);
  const [facingModeNfModal, setFacingModeNfModal] = useState<"environment" | "user">("environment");

  useEffect(() => {
    if (eventId) carregarTudo();
    return () => { pararCamera(); pararCameraNf(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (cameraNfModalAtiva && streamNfModalRef.current && videoNfModalRef.current) {
      videoNfModalRef.current.srcObject = streamNfModalRef.current;
      videoNfModalRef.current.play().catch(() => {});
    }
  }, [cameraNfModalAtiva]);

  async function carregarTudo() {
    setLoading(true);

    const { data: eventoData } = await supabase
      .from("eventos")
      .select("id, nome, tenant_id")
      .eq("id", eventId)
      .maybeSingle();

    setEvento(eventoData as Evento | null);

    const { data: presentesData, error } = await supabase
      .from("event_gift_records")
      .select("id, nome_presente, nome_convidado, telefone_convidado, observacao, foto_url, nota_fiscal_url, tipo_presente, etiqueta_codigo, ia_confianca, status, created_at, ia_processado, categoria_detectada, marca_detectada")
      .eq("evento_id", eventId)
      .eq("origem", "antes_evento")
      .neq("status", "cancelado")
      .order("created_at", { ascending: false });

    if (error) alert("Erro ao carregar presentes: " + error.message);
    setPresentes((presentesData || []) as Presente[]);
    setLoading(false);
  }

  // Busca convidados com debounce
  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (!buscaConvidado.trim() || buscaConvidado.length < 2) {
      setConvidados([]);
      return;
    }
    buscaTimer.current = setTimeout(() => buscarConvidados(buscaConvidado), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaConvidado]);

  async function buscarConvidados(termo: string) {
    if (!evento?.tenant_id) return;
    setBuscandoConvidado(true);
    const { data } = await supabase
      .from("convidados")
      .select("id, nome, telefone, token, grupo")
      .eq("evento_id", eventId)
      .ilike("nome", `%${termo}%`)
      .limit(8);
    setConvidados((data || []) as Convidado[]);
    setBuscandoConvidado(false);
  }

  function selecionarConvidado(c: Convidado) {
    setForm((prev) => ({
      ...prev,
      convidado_id: c.id,
      nome_convidado: c.nome || "",
      telefone_convidado: c.telefone || "",
      token_convidado: c.token || "",
    }));
    setBuscaConvidado(c.nome || "");
    setConvidados([]);
  }

  // Câmera
  async function iniciarCamera() {
    try {
      pararCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraAtiva(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 80);
    } catch (e: any) {
      alert(e?.message || "Não foi possível abrir a câmera.");
    }
  }

  function pararCamera() {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    setCameraAtiva(false);
    if (videoRef.current) { try { videoRef.current.srcObject = null; } catch {} }
  }

  function tirarFoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(video, 0, 0, w, h);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `presente-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFotoFile(file);
      setFotoPreview(canvas.toDataURL("image/jpeg", 0.88));
      pararCamera();
    }, "image/jpeg", 0.88);
  }

  function descartarFoto() {
    setFotoFile(null);
    setFotoPreview(null);
  }

  // Câmera NF
  async function iniciarCameraNf() {
    try {
      pararCameraNf();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamNfRef.current = stream;
      setCameraNfAtiva(true);
      setTimeout(() => {
        if (videoNfRef.current) { videoNfRef.current.srcObject = stream; void videoNfRef.current.play(); }
      }, 80);
    } catch (e: any) { alert(e?.message || "Não foi possível abrir a câmera."); }
  }

  function pararCameraNf() {
    try { streamNfRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamNfRef.current = null;
    setCameraNfAtiva(false);
    if (videoNfRef.current) { try { videoNfRef.current.srcObject = null; } catch {} }
  }

  function tirarFotoNf() {
    const video = videoNfRef.current;
    const canvas = canvasNfRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")?.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `nf-${Date.now()}.jpg`, { type: "image/jpeg" });
      setNfFile(file);
      setNfPreview(canvas.toDataURL("image/jpeg", 0.88));
      pararCameraNf();
    }, "image/jpeg", 0.88);
  }

  function descartarNf() { setNfFile(null); setNfPreview(null); }

  async function uploadArquivo(file: File, path: string): Promise<string | null> {
    const { error } = await supabase.storage
      .from("event-assets")
      .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (error) { alert("Erro ao enviar arquivo: " + error.message); return null; }
    const { data } = supabase.storage.from("event-assets").getPublicUrl(path);
    return data.publicUrl;
  }

  async function salvar() {
    if (!form.nome_convidado.trim()) {
      alert("Informe quem enviou o presente (busque ou digite o nome).");
      return;
    }

    setSalvando(true);

    if (editandoId) {
      let foto_url: string | undefined = undefined;
      let nota_fiscal_url: string | undefined = undefined;
      if (fotoFile) {
        const url = await uploadArquivo(fotoFile, `event-gifts/${eventId}/antes-evento/${editandoId}-${Date.now()}.jpg`);
        if (url) foto_url = url;
      }
      if (nfFile) {
        const ext = nfFile.name.split(".").pop() || "jpg";
        const url = await uploadArquivo(nfFile, `event-gifts/${eventId}/nf/${editandoId}-nf-${Date.now()}.${ext}`);
        if (url) nota_fiscal_url = url;
      }

      const { error } = await supabase
        .from("event_gift_records")
        .update({
          tipo_presente: form.tipo_presente,
          nome_presente: form.nome_presente.trim() || null,
          nome_convidado: form.nome_convidado.trim(),
          telefone_convidado: form.telefone_convidado.trim() || null,
          token_convidado: form.token_convidado.trim() || null,
          observacao: form.observacao.trim() || null,
          categoria_detectada: form.categoria_detectada.trim() || null,
          marca_detectada: form.marca_detectada.trim() || null,
          ...(form.categoria_detectada.trim() || form.marca_detectada.trim() ? { ia_processado: true } : {}),
          ...(foto_url ? { foto_url } : {}),
          ...(nota_fiscal_url ? { nota_fiscal_url } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editandoId);

      if (error) { alert("Erro ao atualizar: " + error.message); setSalvando(false); return; }
    } else {
      const { data: { user } } = await supabase.auth.getUser();

      const etiquetaCodigo = `PRES-${Date.now().toString().slice(-8)}`;

      const { data: inserido, error } = await supabase
        .from("event_gift_records")
        .insert({
          evento_id: eventId,
          tenant_id: evento?.tenant_id,
          origem: "antes_evento",
          tipo_presente: form.tipo_presente,
          status: "ativo",
          etiqueta_codigo: etiquetaCodigo,
          gerou_etiqueta: true,
          convidado_id: form.convidado_id || null,
          nome_presente: form.nome_presente.trim() || null,
          nome_convidado: form.nome_convidado.trim(),
          telefone_convidado: form.telefone_convidado.trim() || null,
          token_convidado: form.token_convidado.trim() || null,
          observacao: form.observacao.trim() || null,
          registrado_por: user?.id || null,
        })
        .select("id")
        .single();

      if (error) { alert("Erro ao registrar: " + error.message); setSalvando(false); return; }

      if ((fotoFile || nfFile) && inserido?.id) {
        const updates: Record<string, string> = {};
        if (fotoFile) {
          const url = await uploadArquivo(fotoFile, `event-gifts/${eventId}/antes-evento/${inserido.id}-${Date.now()}.jpg`);
          if (url) updates.foto_url = url;
        }
        if (nfFile) {
          const ext = nfFile.name.split(".").pop() || "jpg";
          const url = await uploadArquivo(nfFile, `event-gifts/${eventId}/nf/${inserido.id}-nf-${Date.now()}.${ext}`);
          if (url) updates.nota_fiscal_url = url;
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("event_gift_records").update(updates).eq("id", inserido.id);
        }
        if (fotoFile) {
          await supabase.from("event_gift_ai_queue").insert({
            gift_record_id: inserido.id,
            status: "pendente",
            tentativas: 0,
          });
        }
      }
    }

    setSalvando(false);
    fecharForm();
    carregarTudo();
  }

  async function salvarNfCard(presenteId: string) {
    if (!nfCardFile) return;
    setSalvandoNfCard(true);
    const ext = nfCardFile.name.split(".").pop() || "jpg";
    const url = await uploadArquivo(nfCardFile, `event-gifts/${eventId}/nf/${presenteId}-nf-${Date.now()}.${ext}`);
    if (url) {
      await supabase.from("event_gift_records").update({ nota_fiscal_url: url, updated_at: new Date().toISOString() }).eq("id", presenteId);
    }
    setSalvandoNfCard(false);
    setNfCardAberto(null);
    setNfCardFile(null);
    carregarTudo();
  }

  async function abrirCameraNfModal(facing: "environment" | "user" = "environment") {
    try {
      streamNfModalRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } } });
      streamNfModalRef.current = stream;
      setFacingModeNfModal(facing);
      if (videoNfModalRef.current) {
        videoNfModalRef.current.srcObject = stream;
        videoNfModalRef.current.play().catch(() => {});
      }
      setCameraNfModalAtiva(true);
    } catch { alert("Não foi possível acessar a câmera."); }
  }

  function pararCameraNfModal() {
    streamNfModalRef.current?.getTracks().forEach((t) => t.stop());
    streamNfModalRef.current = null;
    setCameraNfModalAtiva(false);
  }

  async function trocarCameraNfModal() {
    const nova = facingModeNfModal === "environment" ? "user" : "environment";
    await abrirCameraNfModal(nova);
  }

  function tirarFotoNfModal() {
    const video = videoNfModalRef.current;
    const canvas = canvasNfModalRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setNfCardFile(new File([blob], `nf-camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      pararCameraNfModal();
    }, "image/jpeg", 0.92);
  }

  async function cancelarPresente(id: string) {
    if (!confirm("Remover este presente?")) return;
    await supabase
      .from("event_gift_records")
      .update({ status: "cancelado", cancelado_em: new Date().toISOString() })
      .eq("id", id);
    carregarTudo();
  }

  function abrirEdicao(p: Presente) {
    setForm({
      convidado_id: "",
      nome_convidado: p.nome_convidado || "",
      telefone_convidado: p.telefone_convidado || "",
      token_convidado: "",
      tipo_presente: p.tipo_presente || "presente_fisico",
      nome_presente: p.nome_presente || "",
      observacao: p.observacao || "",
      categoria_detectada: p.categoria_detectada || "",
      marca_detectada: p.marca_detectada || "",
    });
    setBuscaConvidado(p.nome_convidado || "");
    setFotoPreview(p.foto_url || null);
    setFotoFile(null);
    setEditandoId(p.id);
    setFormAberto(true);
  }

  function fecharForm() {
    setFormAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setBuscaConvidado("");
    setConvidados([]);
    descartarFoto();
    pararCamera();
    descartarNf();
    pararCameraNf();
  }

  const presentesFiltrados = presentes.filter((p) => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return [p.nome_presente, p.nome_convidado, p.observacao]
      .some((v) => (v || "").toLowerCase().includes(t));
  });

  if (loading) {
    return <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "var(--text)" }}>Carregando...</div>;
  }

  return (
    <div className="page">
      <style>{`
        .page { display:flex; flex-direction:column; gap:20px; color:#0f172a; }
        .hero { background:radial-gradient(circle at 5% 0%,rgba(124,58,237,.12),transparent 34%),#fff; border:1px solid rgba(226,232,240,.95); border-radius:30px; padding:28px 32px; box-shadow:0 28px 80px rgba(15,23,42,.07); display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; }
        .eyebrow { color:#7c3aed; font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.12em; display:block; margin-bottom:8px; }
        .title { margin:0; font-size:34px; font-weight:950; letter-spacing:-.05em; }
        .subtitle { margin:8px 0 0; color:#64748b; font-size:14px; }
        .hero-btns { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-start; }
        .btn-add { background:linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; border:none; border-radius:16px; padding:13px 20px; font-weight:950; cursor:pointer; font-family:inherit; font-size:14px; }
        .btn-back { background:#fff; color:#0f172a; border:1px solid rgba(226,232,240,.95); border-radius:14px; padding:11px 18px; font-weight:900; cursor:pointer; font-family:inherit; font-size:13px; }
        .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; }
        .stat { background:#fff; border:1px solid rgba(226,232,240,.95); border-radius:22px; padding:16px; box-shadow:0 8px 24px rgba(15,23,42,.04); }
        .stat-label { color:#64748b; font-size:11px; font-weight:950; text-transform:uppercase; letter-spacing:.07em; }
        .stat-value { margin-top:6px; font-size:28px; font-weight:950; }
        .toolbar { background:#fff; border:1px solid rgba(226,232,240,.95); border-radius:20px; padding:13px 18px; display:flex; }
        .search { flex:1; border:none; outline:none; font-size:15px; font-weight:800; color:#0f172a; background:transparent; }
        .search::placeholder { color:#94a3b8; }

        /* Formulário */
        .form-overlay { position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; }
        .form-box { background:#fff; border-radius:28px; padding:28px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 40px 100px rgba(15,23,42,.2); display:flex; flex-direction:column; gap:18px; }
        .form-header { display:flex; justify-content:space-between; align-items:center; }
        .form-title { margin:0; font-size:20px; font-weight:950; }
        .btn-fechar { background:none; border:none; font-size:22px; cursor:pointer; color:#64748b; line-height:1; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .label { font-size:13px; font-weight:950; color:#334155; }
        .input { padding:13px 16px; border-radius:14px; border:1.5px solid rgba(203,213,225,.95); background:#fff; color:#0f172a; font-size:14px; font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
        .input:focus { border-color:rgba(124,58,237,.5); box-shadow:0 0 0 3px rgba(124,58,237,.08); }
        .convidado-list { border:1.5px solid rgba(203,213,225,.95); border-radius:14px; overflow:hidden; margin-top:4px; }
        .convidado-item { padding:11px 14px; cursor:pointer; font-size:14px; font-weight:800; color:#0f172a; border-bottom:1px solid rgba(226,232,240,.8); }
        .convidado-item:last-child { border-bottom:none; }
        .convidado-item:hover { background:#f5f3ff; }
        .convidado-sub { font-size:12px; color:#64748b; font-weight:700; }
        .convidado-grupo { font-size:13px; color:#94a3b8; font-weight:700; }
        .convidado-selecionado { background:#ede9fe; border:1.5px solid rgba(124,58,237,.3); border-radius:14px; padding:10px 14px; font-size:14px; font-weight:900; color:#5b21b6; display:flex; justify-content:space-between; align-items:center; }
        .btn-trocar { background:none; border:none; color:#7c3aed; font-weight:900; cursor:pointer; font-size:13px; }

        /* Câmera */
        .foto-area { display:flex; flex-direction:column; gap:10px; }
        .camera-preview { width:100%; border-radius:16px; background:#0f172a; max-height:240px; object-fit:cover; display:block; }
        .foto-preview-img { width:100%; border-radius:16px; object-fit:cover; max-height:240px; display:block; }
        .camera-btns { display:flex; gap:8px; flex-wrap:wrap; }
        .btn-camera { background:#0f172a; color:#fff; border:none; border-radius:12px; padding:11px 16px; font-weight:900; cursor:pointer; font-family:inherit; font-size:13px; flex:1; }
        .btn-snap { background:#7c3aed; color:#fff; border:none; border-radius:12px; padding:11px 16px; font-weight:900; cursor:pointer; font-family:inherit; font-size:13px; flex:1; }
        .btn-discard { background:#fff1f2; color:#be123c; border:1px solid #fecdd3; border-radius:12px; padding:11px 16px; font-weight:900; cursor:pointer; font-family:inherit; font-size:13px; }
        .nf-section { background:#eef2ff; border:1px solid #c7d2fe; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:10px; }
        .nf-section-label { margin:0; font-size:11px; font-weight:950; color:#4338ca; text-transform:uppercase; letter-spacing:.1em; }
        .nf-upload-zone { display:flex; flex-direction:column; gap:6px; background:#fff; border:1.5px dashed #a5b4fc; border-radius:14px; padding:16px; cursor:pointer; }
        .nf-upload-title { font-size:15px; font-weight:950; color:#4338ca; }
        .nf-upload-desc { font-size:13px; color:#475569; font-weight:700; line-height:1.5; }
        .nf-preview-area { display:flex; flex-direction:column; }
        .nf-pdf-label { background:#fff; border:1px solid #c7d2fe; border-radius:12px; padding:12px 16px; font-size:14px; font-weight:800; color:#3730a3; }
        .btn-camera-nf { background:#fff; color:#4338ca; border:1px solid #c7d2fe; border-radius:12px; padding:10px 16px; font-weight:900; cursor:pointer; font-family:inherit; font-size:13px; align-self:flex-start; }
        .btn-file { background:#f8fafc; color:#0f172a; border:1px solid rgba(226,232,240,.95); border-radius:12px; padding:11px 16px; font-weight:900; cursor:pointer; font-family:inherit; font-size:13px; flex:1; text-align:center; }
        .form-actions { display:flex; gap:10px; }
        .btn-save { background:linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; border:none; border-radius:14px; padding:13px 22px; font-weight:950; cursor:pointer; font-family:inherit; font-size:14px; }
        .btn-cancel { background:#f1f5f9; color:#475569; border:none; border-radius:14px; padding:13px 18px; font-weight:950; cursor:pointer; font-family:inherit; font-size:14px; }

        /* Lista */
        .list { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; }
        .card { background:#fff; border:1px solid rgba(226,232,240,.95); border-radius:32px; box-shadow:0 24px 70px rgba(15,23,42,.08); overflow:hidden; }
        .card-photo-wrap { position:relative; aspect-ratio:4/3; background:#f1f5f9; overflow:hidden; }
        .card-photo-wrap img { width:100%; height:100%; display:block; object-fit:cover; transition:transform .35s ease; }
        .card:hover .card-photo-wrap img { transform:scale(1.035); }
        .card-no-photo { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:14px; font-weight:900; }
        .card-ia-badge { position:absolute; left:14px; top:14px; display:inline-flex; align-items:center; border-radius:999px; padding:8px 11px; font-size:11px; font-weight:950; box-shadow:0 10px 24px rgba(15,23,42,.12); }
        .ia-processing { background:rgba(254,243,199,.96); color:#92400e; border:1px solid rgba(253,230,138,.95); }
        .ia-success { background:rgba(220,252,231,.96); color:#166534; border:1px solid rgba(187,247,208,.95); }
        .card-body { padding:20px; }
        .card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:14px; }
        .card-name { margin:0; color:#0f172a; font-size:22px; line-height:1.1; font-weight:950; letter-spacing:-.04em; }
        .card-from { margin:7px 0 0; color:#64748b; font-size:13px; font-weight:850; }
        .card-tipo { flex:0 0 auto; border-radius:999px; background:#f4ebff; color:#6d28d9; padding:8px 10px; font-size:11px; font-weight:950; }
        .info-box { border-radius:18px; background:#f8fafc; border:1px solid rgba(226,232,240,.85); padding:14px; margin-bottom:10px; }
        .info-box span { display:block; color:#64748b; font-size:11px; font-weight:950; text-transform:uppercase; letter-spacing:.07em; }
        .info-box strong { display:block; margin-top:5px; color:#0f172a; font-size:15px; font-weight:950; }
        .card-actions { margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .btn-edit { min-height:42px; border-radius:14px; background:linear-gradient(135deg,#7c3aed,#8b5cf6); color:#fff; border:none; font-size:13px; font-weight:950; cursor:pointer; font-family:inherit; box-shadow:0 14px 28px rgba(124,58,237,.18); transition:transform .16s; }
        .btn-edit:hover { transform:translateY(-1px); }
        .btn-nf { min-height:42px; border-radius:14px; border:1px solid rgba(191,219,254,.95); background:#eff6ff; color:#1d4ed8; font-size:13px; font-weight:950; cursor:pointer; font-family:inherit; transition:transform .16s; display:flex; align-items:center; justify-content:center; }
        .btn-nf:hover { background:#dbeafe; transform:translateY(-1px); }
        .btn-nf-view { min-height:42px; border-radius:14px; border:1px solid rgba(187,247,208,.95); background:#ecfdf5; color:#047857; font-size:13px; font-weight:950; cursor:pointer; font-family:inherit; transition:transform .16s; display:flex; align-items:center; justify-content:center; text-decoration:none; }
        .btn-nf-view:hover { background:#d1fae5; transform:translateY(-1px); }
        .btn-remove { min-height:42px; border-radius:14px; border:1px solid rgba(254,205,211,.95); background:#fff1f2; color:#be123c; font-size:13px; font-weight:950; cursor:pointer; font-family:inherit; transition:transform .16s; }
        .btn-remove:hover { background:#ffe4e6; transform:translateY(-1px); }
        .nf-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.45); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
        .nf-modal { width:min(92vw,480px); border:1px solid rgba(191,219,254,.95); border-radius:24px; background:#fff; padding:20px; box-shadow:0 30px 90px rgba(15,23,42,.28); display:flex; flex-direction:column; gap:14px; max-height:90vh; overflow-y:auto; }
        .nf-pop-header { display:flex; justify-content:space-between; align-items:center; }
        .nf-pop-header span { font-size:11px; font-weight:950; color:#1d4ed8; text-transform:uppercase; letter-spacing:.1em; }
        .nf-pop-close { background:none; border:none; font-size:18px; color:#64748b; cursor:pointer; padding:4px 8px; border-radius:8px; font-family:inherit; }
        .nf-pop-close:hover { background:#f1f5f9; }
        .nf-pop-upload { display:flex; flex-direction:column; gap:8px; min-height:120px; border:1.5px dashed rgba(147,197,253,.95); border-radius:18px; background:#fff; padding:18px; cursor:pointer; transition:background .16s,border-color .16s; }
        .nf-pop-upload:hover { background:#eff6ff; border-color:rgba(59,130,246,.8); }
        .nf-pop-upload strong { color:#1d4ed8; font-size:16px; font-weight:950; }
        .nf-pop-upload small { color:#64748b; font-size:13px; font-weight:800; line-height:1.5; }
        .nf-pop-preview { border-radius:18px; overflow:hidden; border:1px solid rgba(191,219,254,.95); background:#f8fafc; }
        .nf-pop-open { min-height:42px; border-radius:14px; border:1px solid rgba(187,247,208,.95); background:#ecfdf5; color:#047857; font-size:13px; font-weight:950; text-decoration:none; display:flex; align-items:center; justify-content:center; }
        .nf-pop-open:hover { background:#d1fae5; }
        .nf-pop-save { min-height:42px; border-radius:14px; border:1px solid rgba(191,219,254,.95); background:#eff6ff; color:#1d4ed8; font-size:14px; font-weight:950; cursor:pointer; font-family:inherit; }
        .nf-pop-cam { min-height:42px; border-radius:14px; border:1px solid rgba(226,232,240,.95); background:#f8fafc; color:#0f172a; font-size:14px; font-weight:950; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px; }
        .nf-pop-cam:hover { background:#f1f5f9; }
        .nf-pop-cancel { min-height:42px; border-radius:14px; border:1px solid rgba(226,232,240,.95); background:#f1f5f9; color:#475569; font-size:13px; font-weight:950; cursor:pointer; font-family:inherit; padding:0 16px; }
        .card-meta-row { display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:12px; color:#64748b; font-weight:800; }
        .card-meta-row strong { color:#0f172a; font-size:12px; font-weight:950; }
        .card-obs { font-size:13px; color:#64748b; margin-bottom:10px; }
        .empty { background:#fff; border:1px dashed rgba(148,163,184,.4); border-radius:22px; padding:40px; text-align:center; color:#64748b; font-weight:800; }
        @media (max-width:600px) { .list{grid-template-columns:1fr} }
        @media (max-width:600px) { .hero{flex-direction:column} .form-overlay{align-items:flex-end} .form-box{border-radius:24px 24px 0 0; max-height:95vh} }
      `}</style>

      {/* Formulário modal */}
      {formAberto && (
        <div className="form-overlay" onClick={(e) => { if (e.target === e.currentTarget) fecharForm(); }}>
          <div className="form-box">
            <div className="form-header">
              <p className="form-title">{editandoId ? "Editar presente" : "Registrar presente recebido"}</p>
              <button className="btn-fechar" onClick={fecharForm}>×</button>
            </div>

            {/* Busca convidado */}
            <div className="field">
              <label className="label">Quem enviou *</label>
              {form.convidado_id ? (
                <div className="convidado-selecionado">
                  <div>
                    <div>{form.nome_convidado}</div>
                    {form.telefone_convidado && <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 2 }}>{form.telefone_convidado}</div>}
                  </div>
                  <button className="btn-trocar" onClick={() => { setForm({ ...form, convidado_id: "", nome_convidado: "", telefone_convidado: "" }); setBuscaConvidado(""); }}>Trocar</button>
                </div>
              ) : (
                <>
                  <input
                    className="input"
                    placeholder="Buscar convidado pelo nome..."
                    value={buscaConvidado}
                    onChange={(e) => {
                      setBuscaConvidado(e.target.value);
                      setForm({ ...form, nome_convidado: e.target.value });
                    }}
                  />
                  {buscandoConvidado && <span style={{ fontSize: 12, color: "#94a3b8" }}>Buscando...</span>}
                  {convidados.length > 0 && (
                    <div className="convidado-list">
                      {convidados.map((c) => (
                        <div key={c.id} className="convidado-item" onClick={() => selecionarConvidado(c)}>
                          <span>{c.nome}</span>
                          {c.grupo && <span className="convidado-grupo"> · {c.grupo}</span>}
                          {c.telefone && <div className="convidado-sub">{c.telefone}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!buscandoConvidado && buscaConvidado.length >= 2 && convidados.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Não encontrado — o nome digitado será usado.</span>
                  )}
                </>
              )}
            </div>

            {/* Telefone e token (só se não veio do convidado ou para edição) */}
            {!form.convidado_id && (
              <div className="field">
                <label className="label">Telefone (opcional)</label>
                <input className="input" placeholder="(21) 99999-9999" value={form.telefone_convidado} onChange={(e) => setForm({ ...form, telefone_convidado: e.target.value })} />
              </div>
            )}

            <div className="field">
              <label className="label">Token do convidado (opcional)</label>
              <input className="input" placeholder="Ex: EVT-12345678" value={form.token_convidado} onChange={(e) => setForm({ ...form, token_convidado: e.target.value })} />
            </div>

            <div className="field">
              <label className="label">Tipo do presente</label>
              <select className="input" value={form.tipo_presente} onChange={(e) => setForm({ ...form, tipo_presente: e.target.value })}>
                {TIPOS_PRESENTE.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Nome do presente</label>
              <input className="input" placeholder="Ex: Jogo de panelas, Bolsa..." value={form.nome_presente} onChange={(e) => setForm({ ...form, nome_presente: e.target.value })} />
            </div>

            <div className="field">
              <label className="label">Observação (opcional)</label>
              <input className="input" placeholder="Cor, tamanho, marca..." value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>

            <div className="field">
              <label className="label">Categoria detectada</label>
              <select className="input" value={form.categoria_detectada} onChange={(e) => setForm({ ...form, categoria_detectada: e.target.value })} style={{ appearance: "auto" }}>
                <option value="">Selecione uma categoria...</option>
                {["beleza","vestuario","joias","semijoias","bijuterias","eletronicos","decoracao","infantil","calcados","esporte","brinquedos","outros"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Marca detectada</label>
              <input className="input" placeholder="Ex: LEGO, Samsung, Nike..." value={form.marca_detectada} onChange={(e) => setForm({ ...form, marca_detectada: e.target.value })} />
            </div>

            {/* Foto */}
            <div className="field">
              <label className="label">Foto do presente</label>
              <div className="foto-area">
                {cameraAtiva && (
                  <>
                    <video ref={videoRef} className="camera-preview" autoPlay playsInline muted />
                    <div className="camera-btns">
                      <button className="btn-snap" onClick={tirarFoto}>📸 Tirar foto</button>
                      <button className="btn-cancel" onClick={pararCamera}>Cancelar</button>
                    </div>
                  </>
                )}
                {fotoPreview && !cameraAtiva && (
                  <>
                    <img src={fotoPreview} alt="Foto do presente" className="foto-preview-img" />
                    <button className="btn-discard" onClick={descartarFoto}>Remover foto</button>
                  </>
                )}
                {!cameraAtiva && !fotoPreview && (
                  <div className="camera-btns">
                    <button className="btn-camera" onClick={iniciarCamera}>📷 Abrir câmera</button>
                    <label className="btn-file">
                      📁 Galeria / arquivo
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setFotoFile(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Nota Fiscal */}
            <div className="nf-section">
              <p className="nf-section-label">NOTA FISCAL / CUPOM FISCAL</p>

              {cameraNfAtiva ? (
                <div className="foto-area">
                  <video ref={videoNfRef} className="camera-preview" autoPlay playsInline muted />
                  <div className="camera-btns">
                    <button className="btn-snap" onClick={tirarFotoNf}>📸 Fotografar NF</button>
                    <button className="btn-cancel" onClick={pararCameraNf}>Cancelar</button>
                  </div>
                </div>
              ) : nfPreview ? (
                <div className="nf-preview-area">
                  {nfFile?.type === "application/pdf" ? (
                    <div className="nf-pdf-label">📄 {nfFile.name}</div>
                  ) : (
                    <img src={nfPreview} alt="Nota fiscal" className="foto-preview-img" />
                  )}
                  <button className="btn-discard" onClick={descartarNf} style={{ marginTop: 8 }}>Remover NF</button>
                </div>
              ) : (
                <label className="nf-upload-zone">
                  <strong className="nf-upload-title">Anexar comprovante</strong>
                  <span className="nf-upload-desc">No celular, escolha tirar foto, usar galeria ou buscar em arquivos. No computador, selecione JPG, PNG ou PDF.</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    style={{ marginTop: 10 }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setNfFile(file);
                      if (file.type === "application/pdf") {
                        setNfPreview("pdf");
                      } else {
                        const reader = new FileReader();
                        reader.onload = (ev) => setNfPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}

              {!cameraNfAtiva && !nfPreview && (
                <button className="btn-camera-nf" onClick={iniciarCameraNf} style={{ marginTop: 8 }}>📷 Usar câmera</button>
              )}
            </div>

            <canvas ref={canvasNfRef} style={{ display: "none" }} />

            <div className="form-actions">
              <button className="btn-save" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Registrar presente"}
              </button>
              <button className="btn-cancel" onClick={fecharForm}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <section className="hero">
        <div>
          <span className="eyebrow">Presentes</span>
          <h1 className="title">Recebidos Antes</h1>
          <p className="subtitle">{evento?.nome} — Presentes enviados para casa antes do evento.</p>
        </div>
        <div className="hero-btns">
          <button className="btn-back" onClick={() => router.push(`/app/presentes/${eventId}/lista`)}>← Voltar</button>
          <button className="btn-add" onClick={() => { setFormAberto(true); setEditandoId(null); setForm(FORM_VAZIO); setBuscaConvidado(""); }}>+ Registrar presente</button>
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <div className="stat-label">Total registrado</div>
          <div className="stat-value">{presentes.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Com foto</div>
          <div className="stat-value">{presentes.filter((p) => p.foto_url).length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Remetentes</div>
          <div className="stat-value">{new Set(presentes.map((p) => p.nome_convidado).filter(Boolean)).size}</div>
        </div>
      </section>

      <div className="toolbar">
        <input className="search" placeholder="Buscar por presente ou remetente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {presentesFiltrados.length === 0 ? (
        <div className="empty">
          {busca ? "Nenhum resultado para essa busca." : "Nenhum presente registrado. Clique em \"+ Registrar presente\" para começar."}
        </div>
      ) : (
        <div className="list">
          {presentesFiltrados.map((p) => (
            <div key={p.id} className="card">
              <div className="card-photo-wrap">
                {p.foto_url
                  ? <img src={p.foto_url} alt="Presente" />
                  : <div className="card-no-photo">Sem foto</div>
                }
                {p.foto_url && (
                  <span className={`card-ia-badge ${p.ia_processado ? "ia-success" : "ia-processing"}`}>
                    {p.ia_processado ? "IA detectada" : "Processando IA"}
                  </span>
                )}
              </div>
              <div className="card-body">
                <div className="card-head">
                  <div>
                    <h2 className="card-name">{p.nome_convidado || "Convidado"}</h2>
                    <p className="card-from">{p.nome_presente || "Presente sem nome"}</p>
                  </div>
                  <span className="card-tipo">{p.etiqueta_codigo || (p.tipo_presente === "envelope" ? "Envelope" : p.tipo_presente === "sem_identificacao" ? "Sem ID" : "Físico")}</span>
                </div>
                {p.observacao && <p className="card-obs">{p.observacao}</p>}
                <div className="info-box">
                  <span>Categoria detectada</span>
                  <strong>{p.categoria_detectada || "Aguardando IA"}</strong>
                </div>
                <div className="info-box">
                  <span>Marca detectada</span>
                  <strong>{p.marca_detectada || "Aguardando IA"}</strong>
                </div>
                <div className="card-actions" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <button className="btn-edit" onClick={() => abrirEdicao(p)}>Alterar</button>
                  {p.nota_fiscal_url ? (
                    <button className="btn-nf btn-nf-view" onClick={() => { setNfCardAberto(p.id); setNfCardFile(null); }}>Ver NF</button>
                  ) : (
                    <button className="btn-nf" onClick={() => { setNfCardAberto(p.id); setNfCardFile(null); }}>Incluir NF</button>
                  )}
                  <button className="btn-remove" onClick={() => cancelarPresente(p.id)}>Cancelar</button>
                </div>
                <div className="card-meta-row">
                  <span>Confiança IA</span>
                  <strong>{p.ia_confianca ? `${Math.round(Number(p.ia_confianca) * 100)}%` : "-"}</strong>
                </div>
                <div className="card-meta-row">
                  <span>Registrado em</span>
                  <strong>{formatarData(p.created_at)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal NF global */}
      {nfCardAberto && (() => {
        const p = presentes.find((x) => x.id === nfCardAberto);
        if (!p) return null;
        return (
          <div className="nf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setNfCardAberto(null); setNfCardFile(null); pararCameraNfModal(); } }}>
            <div className="nf-modal">
              <div className="nf-pop-header">
                <span>NOTA FISCAL / CUPOM FISCAL</span>
                <button className="nf-pop-close" onClick={() => { setNfCardAberto(null); setNfCardFile(null); pararCameraNfModal(); }}>✕</button>
              </div>
              {p.nota_fiscal_url ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="nf-pop-preview">
                    {String(p.nota_fiscal_url).toLowerCase().includes(".pdf") ? (
                      <iframe src={p.nota_fiscal_url} style={{ width: "100%", height: "50vh", border: 0, borderRadius: 14 }} title="NF" />
                    ) : (
                      <img src={p.nota_fiscal_url} alt="NF" style={{ width: "100%", borderRadius: 14, objectFit: "contain", maxHeight: "50vh" }} />
                    )}
                  </div>
                  <a href={p.nota_fiscal_url} target="_blank" rel="noopener noreferrer" className="nf-pop-open">Abrir NF em nova aba</a>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {cameraNfModalAtiva ? (
                    <>
                      <div style={{ position: "relative" }}>
                        <video ref={videoNfModalRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 14, background: "#0f172a", maxHeight: 260, objectFit: "cover", display: "block" }} />
                        <button type="button" onClick={trocarCameraNfModal} title="Trocar câmera" style={{ position: "absolute", top: 10, right: 10, background: "rgba(15,23,42,.55)", border: "none", borderRadius: 999, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, backdropFilter: "blur(4px)" }}>🔄</button>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="nf-pop-save" style={{ flex: 1 }} onClick={tirarFotoNfModal}>Tirar foto</button>
                        <button type="button" className="nf-pop-cancel" onClick={pararCameraNfModal}>Cancelar</button>
                      </div>
                    </>
                  ) : nfCardFile ? (
                    <>
                      {nfCardFile.type.startsWith("image/") && (
                        <img src={URL.createObjectURL(nfCardFile)} alt="Preview NF" style={{ width: "100%", borderRadius: 14, objectFit: "contain", maxHeight: 220 }} />
                      )}
                      <p style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800, margin: 0 }}>{nfCardFile.name}</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="nf-pop-save" style={{ flex: 1 }} onClick={() => salvarNfCard(nfCardAberto!)} disabled={salvandoNfCard}>
                          {salvandoNfCard ? "Salvando..." : "Confirmar NF"}
                        </button>
                        <button className="nf-pop-cancel" onClick={() => setNfCardFile(null)}>Refazer</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="nf-pop-upload">
                        <strong>Anexar comprovante</strong>
                        <small>No celular, escolha tirar foto, usar galeria ou buscar em arquivos. No computador, selecione JPG, PNG ou PDF.</small>
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          onChange={(e) => setNfCardFile(e.target.files?.[0] || null)} />
                      </label>
                      <button type="button" className="nf-pop-cam" onClick={() => abrirCameraNfModal("environment")}>📷 Usar câmera</button>
                    </>
                  )}
                  <canvas ref={canvasNfModalRef} style={{ display: "none" }} />
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
