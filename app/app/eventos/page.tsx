"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type ProgramacaoItem = {
  hora: string;
  titulo: string;
  descricao: string;
};

type Tenant = {
  id: string;
  nome: string;
  plano: string | null;
  status: string | null;
};

type TenantMember = {
  tenant_id: string;
  role: string | null;
  status: string | null;
  tenants: Tenant | Tenant[] | null;
};

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  cidade: string | null;
  tenant_id: string | null;
  status_aprovacao: string | null;
  ativo: boolean | null;
  created_at: string | null;

  data_inicio?: string | null;
  hora_inicio?: string | null;
  data_termino?: string | null;
  hora_termino?: string | null;

  tipo_local?: string | null;
  endereco?: string | null;
  nome_local?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  estado?: string | null;
  mostrar_mapa?: boolean | null;
  mapa_url?: string | null;

  programacao?: ProgramacaoItem[] | null;

  logo_url?: string | null;
  background_url?: string | null;
  musica_url?: string | null;

  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  texto_convite?: string | null;
  observacoes_convite?: string | null;
};

const emptyForm = {
  nome: "",
  data_evento: "",
  local: "",
  cidade: "",

  data_inicio: "",
  hora_inicio: "",
  data_termino: "",
  hora_termino: "",

  tipo_local: "novo",
  endereco: "",
  nome_local: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  estado: "",
  mostrar_mapa: false,
  mapa_url: "",

  programacao: [] as ProgramacaoItem[],

  logo_url: "",
  background_url: "",
  musica_url: "",

  cor_primaria: "#7c3aed",
  cor_secundaria: "#0f172a",
  texto_convite: "",
  observacoes_convite: "",
};

type FormEvento = typeof emptyForm;

export default function AppEventosPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<
    "dados" | "data" | "local" | "programacao" | "identidade" | "convite"
  >("dados");
  const [modo, setModo] = useState<"criar" | "editar">("criar");
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormEvento>(emptyForm);

  useEffect(() => {
    carregarTenantsDoUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  function abrirCriacao() {
    setModo("criar");
    setEventoEditandoId(null);
    setForm(emptyForm);
    setTab("dados");
    setDrawerOpen(true);
  }

  function abrirEdicao(evento: Evento) {
    setModo("editar");
    setEventoEditandoId(evento.id);
    setTab("dados");

    setForm({
      nome: evento.nome || "",
      data_evento: evento.data_evento || "",
      local: evento.local || "",
      cidade: evento.cidade || "",

      data_inicio: evento.data_inicio || evento.data_evento || "",
      hora_inicio: limparHora(evento.hora_inicio),
      data_termino: evento.data_termino || "",
      hora_termino: limparHora(evento.hora_termino),

      tipo_local: evento.tipo_local || "novo",
      endereco: evento.endereco || "",
      nome_local: evento.nome_local || evento.local || "",
      cep: evento.cep || "",
      rua: evento.rua || "",
      numero: evento.numero || "",
      complemento: evento.complemento || "",
      bairro: evento.bairro || "",
      cidade: evento.cidade || "",
      estado: evento.estado || "",
      mostrar_mapa: Boolean(evento.mostrar_mapa),
      mapa_url: evento.mapa_url || "",

      programacao: Array.isArray(evento.programacao) ? evento.programacao : [],

      logo_url: evento.logo_url || "",
      background_url: evento.background_url || "",
      musica_url: evento.musica_url || "",

      cor_primaria: evento.cor_primaria || "#7c3aed",
      cor_secundaria: evento.cor_secundaria || "#0f172a",
      texto_convite: evento.texto_convite || "",
      observacoes_convite: evento.observacoes_convite || "",
    });

    setDrawerOpen(true);
  }

  async function carregarTenantsDoUsuario() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tenant_members")
      .select(`
        tenant_id,
        role,
        status,
        tenants:tenant_id (
          id,
          nome,
          plano,
          status
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      alert("Erro ao carregar vínculo do tenant: " + error.message);
      setLoading(false);
      return;
    }

    const lista = ((data || []) as TenantMember[])
      .map((item) => (Array.isArray(item.tenants) ? item.tenants[0] : item.tenants))
      .filter(Boolean) as Tenant[];

    setTenants(lista);

    const primeiroTenantId = lista[0]?.id || "";
    setTenantId(primeiroTenantId);

    if (primeiroTenantId) {
      await carregarEventos(primeiroTenantId);
    } else {
      setEventos([]);
    }

    setLoading(false);
  }

  async function carregarEventos(idTenant: string) {
    const { data, error } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        data_evento,
        local,
        cidade,
        tenant_id,
        status_aprovacao,
        ativo,
        created_at,
        data_inicio,
        hora_inicio,
        data_termino,
        hora_termino,
        tipo_local,
        endereco,
        nome_local,
        cep,
        rua,
        numero,
        complemento,
        bairro,
        estado,
        mostrar_mapa,
        mapa_url,
        programacao,
        logo_url,
        background_url,
        musica_url,
        cor_primaria,
        cor_secundaria,
        texto_convite,
        observacoes_convite
      `)
      .eq("tenant_id", idTenant)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return;
    }

    setEventos((data || []) as Evento[]);
  }

  async function trocarTenant(id: string) {
    setTenantId(id);
    if (id) await carregarEventos(id);
  }

  async function salvarEvento() {
    if (!tenantId) {
      alert("Nenhum tenant ativo encontrado para este usuário.");
      return;
    }

    if (!form.nome.trim()) {
      alert("Informe o nome do evento.");
      return;
    }

    setSalvando(true);

    const payload = {
      nome: form.nome.trim(),

      data_evento: form.data_inicio || form.data_evento || null,
      local: form.nome_local || form.local || null,
      cidade: form.cidade || null,

      data_inicio: form.data_inicio || null,
      hora_inicio: form.hora_inicio || null,
      data_termino: form.data_termino || null,
      hora_termino: form.hora_termino || null,

      tipo_local: form.tipo_local || null,
      endereco: montarEndereco(form),
      nome_local: form.nome_local || null,
      cep: form.cep || null,
      rua: form.rua || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      estado: form.estado || null,
      mostrar_mapa: form.mostrar_mapa,
      mapa_url: form.mapa_url || null,

      programacao: form.programacao,

      logo_url: form.logo_url || null,
      background_url: form.background_url || null,
      musica_url: form.musica_url || null,

      cor_primaria: form.cor_primaria || null,
      cor_secundaria: form.cor_secundaria || null,
      texto_convite: form.texto_convite || null,
      observacoes_convite: form.observacoes_convite || null,
    };

    if (modo === "criar") {
      const { error } = await supabase.from("eventos").insert({
        ...payload,
        tenant_id: tenantId,
        status_aprovacao: "aguardando_aprovacao",
        ativo: false,
      });

      if (error) {
        alert("Erro ao criar evento: " + error.message);
        setSalvando(false);
        return;
      }

      showToast("Evento criado com sucesso. Aguardando aprovação do admin.");
    }

    if (modo === "editar" && eventoEditandoId) {
      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", eventoEditandoId)
        .eq("tenant_id", tenantId);

      if (error) {
        alert("Erro ao editar evento: " + error.message);
        setSalvando(false);
        return;
      }

      showToast("Evento atualizado com sucesso.");
    }

    setForm(emptyForm);
    setEventoEditandoId(null);
    setModo("criar");
    setDrawerOpen(false);

    await carregarEventos(tenantId);
    setSalvando(false);
  }

  async function excluirEvento(evento: Evento) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o evento "${evento.nome}"? Essa ação não pode ser desfeita.`
    );

    if (!confirmar || !tenantId) return;

    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", evento.id)
      .eq("tenant_id", tenantId);

    if (error) {
      alert("Erro ao excluir evento: " + error.message);
      return;
    }

    await carregarEventos(tenantId);
    showToast("Evento excluído com sucesso.");
  }

  async function uploadArquivo(
    file: File,
    campo: "logo_url" | "background_url" | "musica_url"
  ) {
    if (!tenantId) {
      alert("Nenhum tenant selecionado.");
      return;
    }

    const extensao = file.name.split(".").pop();
    const nomeArquivo = `${tenantId}/${campo}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extensao}`;

    const { error } = await supabase.storage
      .from("eventos")
      .upload(nomeArquivo, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      alert(
        "Erro ao enviar arquivo. Confirme se o bucket 'eventos' existe no Supabase Storage. Detalhe: " +
          error.message
      );
      return;
    }

    const { data } = supabase.storage.from("eventos").getPublicUrl(nomeArquivo);

    setForm((f) => ({
      ...f,
      [campo]: data.publicUrl,
    }));

    showToast("Arquivo enviado com sucesso.");
  }

  function adicionarProgramacao() {
    setForm((f) => ({
      ...f,
      programacao: [
        ...f.programacao,
        {
          hora: "",
          titulo: "",
          descricao: "",
        },
      ],
    }));
  }

  function removerProgramacao(index: number) {
    setForm((f) => {
      const nova = [...f.programacao];
      nova.splice(index, 1);
      return { ...f, programacao: nova };
    });
  }

  function atualizarProgramacao(
    index: number,
    campo: keyof ProgramacaoItem,
    valor: string
  ) {
    setForm((f) => {
      const nova = [...f.programacao];
      nova[index] = {
        ...nova[index],
        [campo]: valor,
      };
      return { ...f, programacao: nova };
    });
  }

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventos.filter((evento) => {
      if (!termo) return true;

      return [
        evento.nome,
        evento.local,
        evento.cidade,
        evento.nome_local,
        evento.status_aprovacao,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [eventos, busca]);

  const tenantAtual = tenants.find((tenant) => tenant.id === tenantId) || null;

  return (
    <div className="app-events-page">
      <style>{`
        .app-events-page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .hero,
        .panel,
        .event-card {
          background: #fff;
          border: 1px solid rgba(226,232,240,.95);
          box-shadow: 0 24px 70px rgba(15,23,42,.08);
        }

        .hero {
          border-radius: 26px;
          padding: 28px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #7c3aed;
          font-weight: 950;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .title {
          margin: 8px 0;
          font-size: 36px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -.05em;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.45;
        }

        .hero-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .primary,
        .secondary,
        .danger,
        .ghost {
          border: none;
          border-radius: 15px;
          font-weight: 950;
          cursor: pointer;
          transition:
            transform .18s cubic-bezier(.2,.8,.2,1),
            box-shadow .18s ease,
            opacity .18s ease;
        }

        .primary {
          background: linear-gradient(135deg,#7c3aed,#5b21b6);
          color: #fff;
          padding: 13px 18px;
          box-shadow: 0 16px 34px rgba(124,58,237,.26);
        }

        .secondary {
          background: #f1f5f9;
          color: #0f172a;
          padding: 13px 18px;
        }

        .danger {
          background: #fee2e2;
          color: #991b1b;
          padding: 11px 14px;
        }

        .ghost {
          width: 38px;
          height: 38px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 18px;
        }

        .primary:hover,
        .secondary:hover,
        .danger:hover,
        .ghost:hover {
          transform: translateY(-1px);
        }

        .primary:disabled,
        .secondary:disabled,
        .danger:disabled {
          opacity: .55;
          cursor: not-allowed;
          transform: none;
        }

        .panel {
          border-radius: 24px;
          padding: 24px;
        }

        .panel-title {
          margin: 0;
          font-size: 22px;
          font-weight: 950;
          color: #0f172a;
        }

        .filters {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 10px;
          margin-top: 18px;
        }

        .input,
        .textarea,
        .select {
          width: 100%;
          padding: 13px 15px;
          border-radius: 15px;
          border: 1px solid rgba(226,232,240,.95);
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          font-weight: 850;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .textarea {
          min-height: 110px;
          resize: vertical;
          font-family: inherit;
        }

        .input:focus,
        .textarea:focus,
        .select:focus {
          background: #fff;
          border-color: rgba(124,58,237,.45);
          box-shadow: 0 0 0 4px rgba(124,58,237,.10);
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .event-card {
          border-radius: 20px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          animation: cardIn .36s cubic-bezier(.2,.8,.2,1) both;
          transition:
            transform .17s cubic-bezier(.2,.8,.2,1),
            box-shadow .17s ease,
            border-color .17s ease;
        }

        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(15,23,42,.08);
          border-color: rgba(124,58,237,.22);
        }

        .item-title {
          color: #0f172a;
          font-size: 17px;
          font-weight: 950;
        }

        .item-meta {
          color: #334155;
          font-size: 14px;
          font-weight: 850;
          margin-top: 4px;
        }

        .small-line {
          color: #64748b;
          font-size: 12px;
          margin-top: 6px;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 950;
          display: inline-flex;
          margin-left: 8px;
        }

        .badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .badge.blocked {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.neutral {
          background: #e2e8f0;
          color: #475569;
        }

        .empty {
          padding: 24px;
          border-radius: 20px;
          border: 1px dashed rgba(148,163,184,.5);
          color: #64748b;
          background: linear-gradient(180deg,#fff,#f8fafc);
        }

        .drawer-overlay {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(15,23,42,.42);
          backdrop-filter: blur(10px);
          animation: overlayIn .24s ease both;
        }

        .drawer {
          position: fixed;
          top: 14px;
          right: 14px;
          bottom: 14px;
          width: 560px;
          z-index: 50;
          background:
            radial-gradient(circle at top left, rgba(124,58,237,.10), transparent 32%),
            #fff;
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 28px;
          box-shadow:
            -24px 24px 80px rgba(15,23,42,.22),
            inset 0 1px 0 rgba(255,255,255,.75);
          display: flex;
          flex-direction: column;
          animation: drawerIn .42s cubic-bezier(.16,1,.3,1) both;
          overflow: hidden;
        }

        .drawer-content {
          padding: 22px;
          overflow-y: auto;
        }

        .drawer-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(226,232,240,.75);
        }

        .drawer-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #7c3aed;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .drawer-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #7c3aed;
          box-shadow: 0 0 0 6px rgba(124,58,237,.10);
        }

        .drawer-title {
          margin: 10px 0 0;
          font-size: 26px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -.04em;
        }

        .drawer-sub {
          margin: 8px 0 0;
          color: #64748b;
          line-height: 1.45;
          font-weight: 700;
        }

        .tabs {
          display: flex;
          gap: 8px;
          padding: 14px 22px;
          border-bottom: 1px solid rgba(226,232,240,.75);
          overflow-x: auto;
          background: rgba(248,250,252,.8);
        }

        .tabs button {
          border: none;
          white-space: nowrap;
          padding: 10px 13px;
          border-radius: 999px;
          background: transparent;
          color: #64748b;
          font-weight: 950;
          cursor: pointer;
        }

        .tabs button.active {
          background: #fff;
          color: #7c3aed;
          box-shadow: 0 8px 24px rgba(15,23,42,.08);
        }

        .drawer-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field-label {
          color: #475569;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 7px;
        }

        .check-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #334155;
          font-weight: 850;
        }

        .programacao-item {
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226,232,240,.9);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .upload-box {
          border: 1px dashed rgba(148,163,184,.7);
          background: #f8fafc;
          border-radius: 18px;
          padding: 14px;
        }

        .upload-preview {
          margin-top: 10px;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(226,232,240,.9);
        }

        .upload-preview img {
          width: 100%;
          max-height: 180px;
          object-fit: cover;
          display: block;
        }

        .url-line {
          margin-top: 8px;
          font-size: 11px;
          color: #64748b;
          word-break: break-all;
        }

        .helper-card {
          margin-top: 18px;
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226,232,240,.9);
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 750;
        }

        .drawer-footer {
          margin-top: auto;
          padding: 16px 22px;
          border-top: 1px solid rgba(226,232,240,.75);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          background: rgba(255,255,255,.96);
        }

        .toast {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 80;
          background: #0f172a;
          color: #fff;
          border-radius: 18px;
          padding: 14px 16px;
          box-shadow: 0 22px 60px rgba(15,23,42,.25);
          font-weight: 850;
          animation: toastIn .36s cubic-bezier(.16,1,.3,1) both;
          max-width: 360px;
        }

        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes drawerIn {
          from {
            opacity: 0;
            transform: translateX(34px) scale(.985);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 900px) {
          .filters,
          .grid-2 {
            grid-template-columns: 1fr;
          }

          .hero {
            padding: 24px;
          }

          .title {
            font-size: 32px;
          }
        }

        @media (max-width: 640px) {
          .hero-actions {
            width: 100%;
          }

          .hero-actions button {
            flex: 1;
          }

          .drawer {
            top: auto;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 94vh;
            border-radius: 28px 28px 0 0;
            animation: drawerMobileIn .42s cubic-bezier(.16,1,.3,1) both;
          }

          .drawer-footer {
            grid-template-columns: 1fr;
          }

          .toast {
            left: 16px;
            right: 16px;
            bottom: 16px;
            max-width: none;
          }

          @keyframes drawerMobileIn {
            from {
              opacity: 0;
              transform: translateY(42px) scale(.985);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        }
      `}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">OmniStage App</span>
          <h1 className="title">Eventos</h1>
          <p className="subtitle">
            {tenantAtual
              ? `Eventos vinculados ao tenant ${tenantAtual.nome}.`
              : "Nenhum tenant ativo vinculado ao seu usuário."}
          </p>
        </div>

        <div className="hero-actions">
          <button onClick={abrirCriacao} className="primary" disabled={!tenantId}>
            + Criar evento
          </button>

          <button onClick={() => tenantId && carregarEventos(tenantId)} className="secondary">
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </section>

      {tenants.length > 1 && (
        <section className="panel">
          <h2 className="panel-title">Selecionar tenant</h2>
          <select
            value={tenantId}
            onChange={(e) => trocarTenant(e.target.value)}
            className="select"
            style={{ marginTop: 14 }}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.nome}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">Meus eventos</h2>

        <div className="filters">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por evento, local, cidade ou status"
            className="input"
          />
          <div className="input">{eventosFiltrados.length} exibidos</div>
        </div>

        <div className="list">
          {eventosFiltrados.map((evento) => (
            <article key={evento.id} className="event-card">
              <div>
                <strong className="item-title">{evento.nome}</strong>
                <span className={getStatusClass(evento.status_aprovacao)}>
                  {labelStatus(evento.status_aprovacao)}
                </span>

                <div className="item-meta">
                  Data:{" "}
                  <strong>
                    {evento.data_inicio || evento.data_evento
                      ? formatarData(evento.data_inicio || evento.data_evento)
                      : "Não definida"}
                  </strong>
                  {evento.hora_inicio ? ` · ${limparHora(evento.hora_inicio)}` : ""}
                </div>

                <div className="small-line">
                  Local: <strong>{evento.nome_local || evento.local || "Não informado"}</strong> · Cidade:{" "}
                  <strong>{evento.cidade || "Não informada"}</strong>
                </div>
              </div>

              <div className="card-actions">
                <button className="secondary" onClick={() => abrirEdicao(evento)}>
                  Editar
                </button>
                <button className="danger" onClick={() => excluirEvento(evento)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          {!loading && eventosFiltrados.length === 0 && (
            <div className="empty">Nenhum evento encontrado para este tenant.</div>
          )}
        </div>
      </section>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />

          <aside className="drawer">
            <div className="drawer-content">
              <div className="drawer-top">
                <div>
                  <span className="drawer-kicker">
                    <span className="drawer-dot" />
                    {modo === "criar" ? "Novo evento" : "Editar evento"}
                  </span>
                  <h2 className="drawer-title">
                    {modo === "criar" ? "Criar evento" : "Alterar evento"}
                  </h2>
                  <p className="drawer-sub">
                    Centralize todos os dados do evento aqui. Depois o convite digital usará essas informações.
                  </p>
                </div>

                <button className="ghost" onClick={() => setDrawerOpen(false)} aria-label="Fechar">
                  ×
                </button>
              </div>
            </div>

            <div className="tabs">
              <button onClick={() => setTab("dados")} className={tab === "dados" ? "active" : ""}>
                Dados
              </button>
              <button onClick={() => setTab("data")} className={tab === "data" ? "active" : ""}>
                Data
              </button>
              <button onClick={() => setTab("local")} className={tab === "local" ? "active" : ""}>
                Local
              </button>
              <button onClick={() => setTab("programacao")} className={tab === "programacao" ? "active" : ""}>
                Programação
              </button>
              <button onClick={() => setTab("identidade")} className={tab === "identidade" ? "active" : ""}>
                Identidade
              </button>
              <button onClick={() => setTab("convite")} className={tab === "convite" ? "active" : ""}>
                Convite
              </button>
            </div>

            <div className="drawer-content">
              <div className="drawer-form">
                {tab === "dados" && (
                  <>
                    <label>
                      <div className="field-label">Nome do evento</div>
                      <input
                        value={form.nome}
                        onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                        placeholder="Ex: Valentina XV"
                        className="input"
                      />
                    </label>

                    <label>
                      <div className="field-label">Tipo de local</div>
                      <select
                        value={form.tipo_local}
                        onChange={(e) => setForm((f) => ({ ...f, tipo_local: e.target.value }))}
                        className="select"
                      >
                        <option value="novo">Novo local</option>
                        <option value="cadastrado">Local já cadastrado</option>
                        <option value="online">Online</option>
                      </select>
                    </label>

                    <div className="grid-2">
                      <label>
                        <div className="field-label">Cor primária</div>
                        <input
                          type="color"
                          value={form.cor_primaria}
                          onChange={(e) => setForm((f) => ({ ...f, cor_primaria: e.target.value }))}
                          className="input"
                        />
                      </label>

                      <label>
                        <div className="field-label">Cor secundária</div>
                        <input
                          type="color"
                          value={form.cor_secundaria}
                          onChange={(e) => setForm((f) => ({ ...f, cor_secundaria: e.target.value }))}
                          className="input"
                        />
                      </label>
                    </div>
                  </>
                )}

                {tab === "data" && (
                  <div className="grid-2">
                    <label>
                      <div className="field-label">Data de início</div>
                      <input
                        type="date"
                        value={form.data_inicio}
                        onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                        className="input"
                      />
                    </label>

                    <label>
                      <div className="field-label">Hora de início</div>
                      <input
                        type="time"
                        value={form.hora_inicio}
                        onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                        className="input"
                      />
                    </label>

                    <label>
                      <div className="field-label">Data de término</div>
                      <input
                        type="date"
                        value={form.data_termino}
                        onChange={(e) => setForm((f) => ({ ...f, data_termino: e.target.value }))}
                        className="input"
                      />
                    </label>

                    <label>
                      <div className="field-label">Hora de término</div>
                      <input
                        type="time"
                        value={form.hora_termino}
                        onChange={(e) => setForm((f) => ({ ...f, hora_termino: e.target.value }))}
                        className="input"
                      />
                    </label>
                  </div>
                )}

                {tab === "local" && (
                  <>
                    <label>
                      <div className="field-label">Nome do local</div>
                      <input
                        value={form.nome_local}
                        onChange={(e) => setForm((f) => ({ ...f, nome_local: e.target.value }))}
                        placeholder="Ex: Guerrah Hall"
                        className="input"
                      />
                    </label>

                    <div className="grid-2">
                      <label>
                        <div className="field-label">CEP</div>
                        <input
                          value={form.cep}
                          onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                          placeholder="Ex: 27900-000"
                          className="input"
                        />
                      </label>

                      <label>
                        <div className="field-label">Estado</div>
                        <input
                          value={form.estado}
                          onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                          placeholder="RJ"
                          className="input"
                        />
                      </label>
                    </div>

                    <label>
                      <div className="field-label">Rua</div>
                      <input
                        value={form.rua}
                        onChange={(e) => setForm((f) => ({ ...f, rua: e.target.value }))}
                        placeholder="Rua / Avenida"
                        className="input"
                      />
                    </label>

                    <div className="grid-2">
                      <label>
                        <div className="field-label">Número</div>
                        <input
                          value={form.numero}
                          onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                          placeholder="Número"
                          className="input"
                        />
                      </label>

                      <label>
                        <div className="field-label">Complemento</div>
                        <input
                          value={form.complemento}
                          onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                          placeholder="Complemento"
                          className="input"
                        />
                      </label>
                    </div>

                    <div className="grid-2">
                      <label>
                        <div className="field-label">Bairro</div>
                        <input
                          value={form.bairro}
                          onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                          placeholder="Bairro"
                          className="input"
                        />
                      </label>

                      <label>
                        <div className="field-label">Cidade</div>
                        <input
                          value={form.cidade}
                          onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                          placeholder="Cidade"
                          className="input"
                        />
                      </label>
                    </div>

                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={form.mostrar_mapa}
                        onChange={(e) => setForm((f) => ({ ...f, mostrar_mapa: e.target.checked }))}
                      />
                      Mostrar mapa no convite
                    </label>

                    <label>
                      <div className="field-label">URL do mapa</div>
                      <input
                        value={form.mapa_url}
                        onChange={(e) => setForm((f) => ({ ...f, mapa_url: e.target.value }))}
                        placeholder="Link do Google Maps"
                        className="input"
                      />
                    </label>
                  </>
                )}

                {tab === "programacao" && (
                  <>
                    {form.programacao.length === 0 && (
                      <div className="empty">
                        Nenhum horário cadastrado. Adicione a programação do evento.
                      </div>
                    )}

                    {form.programacao.map((item, index) => (
                      <div key={index} className="programacao-item">
                        <div className="grid-2">
                          <label>
                            <div className="field-label">Horário</div>
                            <input
                              type="time"
                              value={item.hora}
                              onChange={(e) => atualizarProgramacao(index, "hora", e.target.value)}
                              className="input"
                            />
                          </label>

                          <label>
                            <div className="field-label">Título</div>
                            <input
                              value={item.titulo}
                              onChange={(e) => atualizarProgramacao(index, "titulo", e.target.value)}
                              placeholder="Ex: Recepção"
                              className="input"
                            />
                          </label>
                        </div>

                        <label>
                          <div className="field-label">Descrição</div>
                          <input
                            value={item.descricao}
                            onChange={(e) => atualizarProgramacao(index, "descricao", e.target.value)}
                            placeholder="Detalhe da programação"
                            className="input"
                          />
                        </label>

                        <button className="danger" onClick={() => removerProgramacao(index)}>
                          Remover horário
                        </button>
                      </div>
                    ))}

                    <button className="secondary" onClick={adicionarProgramacao}>
                      + Adicionar horário
                    </button>
                  </>
                )}

                {tab === "identidade" && (
                  <>
                    <UploadField
                      label="Logomarca do evento"
                      accept="image/*"
                      value={form.logo_url}
                      onFile={(file) => uploadArquivo(file, "logo_url")}
                    />

                    <UploadField
                      label="Background do convite"
                      accept="image/*"
                      value={form.background_url}
                      onFile={(file) => uploadArquivo(file, "background_url")}
                    />

                    <UploadField
                      label="Música do evento"
                      accept="audio/*"
                      value={form.musica_url}
                      onFile={(file) => uploadArquivo(file, "musica_url")}
                    />
                  </>
                )}

                {tab === "convite" && (
                  <>
                    <label>
                      <div className="field-label">Texto principal do convite</div>
                      <textarea
                        value={form.texto_convite}
                        onChange={(e) => setForm((f) => ({ ...f, texto_convite: e.target.value }))}
                        placeholder="Ex: Com alegria convidamos você para celebrar este momento especial..."
                        className="textarea"
                      />
                    </label>

                    <label>
                      <div className="field-label">Observações do convite</div>
                      <textarea
                        value={form.observacoes_convite}
                        onChange={(e) => setForm((f) => ({ ...f, observacoes_convite: e.target.value }))}
                        placeholder="Ex: Traje, estacionamento, confirmação, informações extras..."
                        className="textarea"
                      />
                    </label>

                    <div className="helper-card">
                      Esses dados serão usados depois na aba Convite Digital para montar o preview e preencher o convite automaticamente.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="drawer-footer">
              <button onClick={() => setDrawerOpen(false)} className="secondary">
                Cancelar
              </button>

              <button onClick={salvarEvento} disabled={salvando || !tenantId} className="primary">
                {salvando
                  ? "Salvando..."
                  : modo === "criar"
                  ? "Criar evento"
                  : "Salvar alterações"}
              </button>
            </div>
          </aside>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function UploadField({
  label,
  accept,
  value,
  onFile,
}: {
  label: string;
  accept: string;
  value: string;
  onFile: (file: File) => void;
}) {
  return (
    <div className="upload-box">
      <div className="field-label">{label}</div>
      <input
        type="file"
        accept={accept}
        className="input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />

      {value && (
        <div className="upload-preview">
          {accept.includes("image") ? (
            <img src={value} alt={label} />
          ) : (
            <div style={{ padding: 12 }}>
              <audio src={value} controls style={{ width: "100%" }} />
            </div>
          )}
          <div className="url-line">{value}</div>
        </div>
      )}
    </div>
  );
}

function montarEndereco(form: FormEvento) {
  return [
    form.rua,
    form.numero,
    form.complemento,
    form.bairro,
    form.cidade,
    form.estado,
    form.cep,
  ]
    .filter(Boolean)
    .join(", ");
}

function labelStatus(status: string | null) {
  if (status === "aprovado") return "Aprovado";
  if (status === "bloqueado") return "Bloqueado";
  if (status === "reprovado") return "Reprovado";
  if (status === "aguardando_aprovacao") return "Aguardando aprovação";
  return "Rascunho";
}

function getStatusClass(status: string | null) {
  if (status === "aprovado") return "badge active";
  if (status === "bloqueado" || status === "reprovado") return "badge blocked";
  if (status === "aguardando_aprovacao") return "badge pending";
  return "badge neutral";
}

function formatarData(data: string | null | undefined) {
  if (!data) return "Não informado";

  const [ano, mes, dia] = data.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano.slice(2)}`;

  return data;
}

function limparHora(hora: string | null | undefined) {
  if (!hora) return "";
  return hora.slice(0, 5);
}
