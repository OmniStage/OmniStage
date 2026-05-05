"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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

  tipo_evento?: string | null;
  categoria_evento?: string | null;

  data_inicio?: string | null;
  hora_inicio?: string | null;
  data_termino?: string | null;
  hora_termino?: string | null;

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

  logo_url?: string | null;
  background_url?: string | null;
  musica_url?: string | null;
};

const TIPOS_EVENTO = ["Esportivo", "Social", "Empresarial", "Cultural"];

const CATEGORIAS_FIXAS = ["15 anos", "Casamento", "Festa infantil", "Corrida"];

const emptyForm = {
  nome: "",
  data_evento: "",
  local: "",
  cidade: "",

  tipo_evento: "",
  categoria_evento: "",
  nova_categoria_evento: "",

  data_inicio: "",
  hora_inicio: "",
  data_termino: "",
  hora_termino: "",

  endereco: "",
  nome_local: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  estado: "",
  mostrar_mapa: true,
  mapa_url: "",

  logo_url: "",
  background_url: "",
  musica_url: "",
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
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [toast, setToast] = useState("");
  const [modo, setModo] = useState<"criar" | "editar">("criar");
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormEvento>(emptyForm);

  useEffect(() => {
    carregarTenantsDoUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapaAutomatico = useMemo(() => gerarLinkMaps(form), [form]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  function abrirCriacao() {
    setModo("criar");
    setEventoEditandoId(null);
    setForm(emptyForm);
    setErroCep("");
    setFormAberto(true);

    setTimeout(() => {
      document.getElementById("form-evento")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function abrirEdicao(evento: Evento) {
    setModo("editar");
    setEventoEditandoId(evento.id);
    setErroCep("");

    const categoriaAtual = evento.categoria_evento || "";
    const categoriaEhFixa = CATEGORIAS_FIXAS.includes(categoriaAtual);

    setForm({
      nome: evento.nome || "",
      data_evento: evento.data_evento || "",
      local: evento.local || "",
      cidade: evento.cidade || "",

      tipo_evento: evento.tipo_evento || "",
      categoria_evento: categoriaEhFixa ? categoriaAtual : categoriaAtual ? "__nova__" : "",
      nova_categoria_evento: categoriaEhFixa ? "" : categoriaAtual,

      data_inicio: evento.data_inicio || evento.data_evento || "",
      hora_inicio: limparHora(evento.hora_inicio),
      data_termino: evento.data_termino || "",
      hora_termino: limparHora(evento.hora_termino),

      endereco: evento.endereco || "",
      nome_local: evento.nome_local || evento.local || "",
      cep: formatarCep(evento.cep || ""),
      rua: evento.rua || "",
      numero: evento.numero || "",
      complemento: evento.complemento || "",
      bairro: evento.bairro || "",
      estado: evento.estado || "",
      mostrar_mapa: evento.mostrar_mapa ?? true,
      mapa_url: evento.mapa_url || "",

      logo_url: evento.logo_url || "",
      background_url: evento.background_url || "",
      musica_url: evento.musica_url || "",
    });

    setFormAberto(true);

    setTimeout(() => {
      document.getElementById("form-evento")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function fecharForm() {
    setModo("criar");
    setEventoEditandoId(null);
    setForm(emptyForm);
    setErroCep("");
    setFormAberto(false);
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
        tipo_evento,
        categoria_evento,
        data_inicio,
        hora_inicio,
        data_termino,
        hora_termino,
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
        logo_url,
        background_url,
        musica_url
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

  async function buscarCep(cepDigitado: string) {
    const cepLimpo = somenteNumeros(cepDigitado);

    setErroCep("");

    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

      if (!response.ok) {
        setErroCep("Não foi possível consultar o CEP.");
        return;
      }

      const data = await response.json();

      if (data.erro) {
        setErroCep("CEP não encontrado.");
        return;
      }

      setForm((f) => {
        const atualizado = {
          ...f,
          cep: formatarCep(cepLimpo),
          rua: data.logradouro || f.rua,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
          estado: data.uf || f.estado,
        };

        return {
          ...atualizado,
          mapa_url: gerarLinkMaps(atualizado),
        };
      });
    } catch {
      setErroCep("Erro ao buscar o CEP. Tente novamente.");
    } finally {
      setBuscandoCep(false);
    }
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

    if (!form.tipo_evento.trim()) {
      alert("Selecione o tipo de evento.");
      return;
    }

    const categoriaFinal =
      form.categoria_evento === "__nova__"
        ? form.nova_categoria_evento.trim()
        : form.categoria_evento.trim();

    if (!categoriaFinal) {
      alert("Selecione ou informe a categoria do evento.");
      return;
    }

    if (!form.data_inicio) {
      alert("Informe a data de início do evento.");
      return;
    }

    if (!form.nome_local.trim()) {
      alert("Informe o nome do local.");
      return;
    }

    if (!form.cidade.trim()) {
      alert("Informe a cidade.");
      return;
    }

    setSalvando(true);

    const enderecoFinal = montarEndereco(form);
    const mapaFinal = form.mapa_url || gerarLinkMaps(form);

    const payload = {
      nome: form.nome.trim(),

      tipo_evento: form.tipo_evento || null,
      categoria_evento: categoriaFinal || null,

      data_evento: form.data_inicio || form.data_evento || null,
      local: form.nome_local || form.local || null,
      cidade: form.cidade || null,

      data_inicio: form.data_inicio || null,
      hora_inicio: form.hora_inicio || null,
      data_termino: form.data_termino || null,
      hora_termino: form.hora_termino || null,

      endereco: enderecoFinal || null,
      nome_local: form.nome_local || null,
      cep: somenteNumeros(form.cep) || null,
      rua: form.rua || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      estado: form.estado || null,
      mostrar_mapa: form.mostrar_mapa,
      mapa_url: mapaFinal || null,

      logo_url: form.logo_url || null,
      background_url: form.background_url || null,
      musica_url: form.musica_url || null,
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

    await carregarEventos(tenantId);

    setForm(emptyForm);
    setEventoEditandoId(null);
    setModo("criar");
    setFormAberto(false);
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

    const { error } = await supabase.storage.from("eventos").upload(nomeArquivo, file, {
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

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventos.filter((evento) => {
      if (!termo) return true;

      return [
        evento.nome,
        evento.local,
        evento.cidade,
        evento.nome_local,
        evento.tipo_evento,
        evento.categoria_evento,
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
        .app-events-page { display: flex; flex-direction: column; gap: 22px; }

        .hero, .panel, .event-card, .event-form-panel {
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

        .hero-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        .primary, .secondary, .danger, .ghost {
          border: none;
          border-radius: 15px;
          font-weight: 950;
          cursor: pointer;
          transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease, opacity .18s ease;
        }

        .primary {
          background: linear-gradient(135deg,#22c55e,#16a34a);
          color: #fff;
          padding: 14px 22px;
          box-shadow: 0 16px 34px rgba(34,197,94,.24);
        }

        .purple {
          background: linear-gradient(135deg,#7c3aed,#5b21b6);
          box-shadow: 0 16px 34px rgba(124,58,237,.26);
        }

        .secondary {
          background: #fff;
          color: #0f172a;
          padding: 13px 18px;
          border: 1px solid rgba(203,213,225,.95);
        }

        .soft { background: #f1f5f9; border: none; }

        .danger {
          background: #fee2e2;
          color: #991b1b;
          padding: 11px 14px;
        }

        .ghost {
          background: #fff;
          color: #0f172a;
          padding: 13px 18px;
          border: 1px solid rgba(203,213,225,.95);
        }

        .primary:hover, .secondary:hover, .danger:hover, .ghost:hover { transform: translateY(-1px); }

        .primary:disabled, .secondary:disabled, .danger:disabled {
          opacity: .55;
          cursor: not-allowed;
          transform: none;
        }

        .panel { border-radius: 24px; padding: 24px; }

        .panel-title {
          margin: 0;
          font-size: 22px;
          font-weight: 950;
          color: #0f172a;
        }

        .event-form-panel {
          border-radius: 28px;
          padding: 32px;
          background:
            radial-gradient(circle at 10% 0%, rgba(124,58,237,.08), transparent 34%),
            radial-gradient(circle at 95% 8%, rgba(34,197,94,.08), transparent 30%),
            linear-gradient(180deg,#ffffff,#f8fafc);
          animation: formIn .28s cubic-bezier(.16,1,.3,1) both;
        }

        .form-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-title {
          margin: 0;
          color: #0f172a;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: -.05em;
        }

        .form-subtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 16px;
          font-weight: 750;
          line-height: 1.45;
        }

        .section {
          margin-top: 20px;
          padding: 24px;
          border-radius: 26px;
          background: rgba(255,255,255,.92);
          border: 1px solid rgba(226,232,240,.95);
          box-shadow: 0 18px 48px rgba(15,23,42,.06);
        }

        .section:first-of-type { margin-top: 0; }

        .section-title {
          margin: 0 0 6px;
          font-size: 24px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -.035em;
        }

        .section-title::after {
          content: "";
          display: block;
          width: 44px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg,#7c3aed,#22c55e);
          margin-top: 10px;
        }

        .section-desc {
          margin: 14px 0 22px;
          color: #64748b;
          font-size: 15px;
          font-weight: 750;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 20px;
        }

        .form-grid-4 {
          display: grid;
          grid-template-columns: 1.2fr .8fr 1.2fr .8fr;
          gap: 18px 20px;
        }

        .full { grid-column: 1 / -1; }

        .field-label {
          display: block;
          color: #334155;
          font-size: 17px;
          font-weight: 950;
          margin-bottom: 10px;
        }

        .required { color: #ef4444; }

        .input, .textarea, .select {
          width: 100%;
          padding: 17px 18px;
          border-radius: 18px;
          border: 1px solid rgba(203,213,225,.95);
          background: #fff;
          color: #0f172a;
          outline: none;
          font-size: 15px;
          font-weight: 800;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .textarea {
          min-height: 130px;
          resize: vertical;
          font-family: inherit;
        }

        .input:focus, .textarea:focus, .select:focus {
          border-color: rgba(124,58,237,.45);
          box-shadow: 0 0 0 4px rgba(124,58,237,.10);
        }

        .field-help {
          margin-top: 8px;
          color: #64748b;
          font-size: 13px;
          font-weight: 750;
        }

        .field-error {
          margin-top: 8px;
          color: #dc2626;
          font-size: 13px;
          font-weight: 850;
        }

        .map-card {
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(226,232,240,.95);
          background: #f8fafc;
        }

        .map-preview {
          width: 100%;
          height: 280px;
          border: 0;
          display: block;
        }

        .map-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px;
          flex-wrap: wrap;
        }

        .map-url {
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          word-break: break-all;
        }

        .filters {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 10px;
          margin-top: 18px;
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
          transition: transform .17s cubic-bezier(.2,.8,.2,1), box-shadow .17s ease, border-color .17s ease;
        }

        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(15,23,42,.08);
          border-color: rgba(124,58,237,.22);
        }

        .item-title { color: #0f172a; font-size: 17px; font-weight: 950; }
        .item-meta { color: #334155; font-size: 14px; font-weight: 850; margin-top: 4px; }
        .small-line { color: #64748b; font-size: 12px; margin-top: 6px; }

        .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .badge {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 950;
          display: inline-flex;
          margin-left: 8px;
        }

        .badge.active { background: #dcfce7; color: #166534; }
        .badge.blocked { background: #fee2e2; color: #991b1b; }
        .badge.pending { background: #fef3c7; color: #92400e; }
        .badge.neutral { background: #e2e8f0; color: #475569; }

        .empty {
          padding: 24px;
          border-radius: 20px;
          border: 1px dashed rgba(148,163,184,.5);
          color: #64748b;
          background: linear-gradient(180deg,#fff,#f8fafc);
        }

        .check-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #334155;
          font-weight: 850;
          margin-top: 4px;
        }

        .upload-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .upload-box {
          border: 1px dashed rgba(148,163,184,.7);
          background: #f8fafc;
          border-radius: 22px;
          padding: 16px;
        }

        .upload-preview {
          margin-top: 12px;
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

        .form-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 28px;
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

        @keyframes toastIn {
          from { opacity: 0; transform: translateY(14px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes formIn {
          from { opacity: 0; transform: translateY(12px) scale(.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px) scale(.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 1100px) {
          .form-grid, .form-grid-4, .upload-grid, .filters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .hero, .panel, .event-form-panel {
            padding: 22px;
            border-radius: 24px;
          }

          .title { font-size: 30px; }
          .form-title { font-size: 26px; }
          .section { padding: 20px; }
          .section-title { font-size: 21px; }
          .field-label { font-size: 16px; }

          .hero-actions, .form-actions { width: 100%; }

          .hero-actions button, .form-actions button { flex: 1; }

          .toast {
            left: 16px;
            right: 16px;
            bottom: 16px;
            max-width: none;
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
          <button onClick={abrirCriacao} className="primary purple" disabled={!tenantId}>
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

      {formAberto && (
        <section id="form-evento" className="event-form-panel">
          <div className="form-head">
            <div>
              <h2 className="form-title">
                {modo === "criar" ? "Criar evento" : "Alterar evento"}
              </h2>
              <p className="form-subtitle">
                Cadastre aqui os dados principais do evento. A programação e o convite digital ficam em abas próprias.
              </p>
            </div>

            <button onClick={fecharForm} className="ghost">
              Fechar
            </button>
          </div>

          <div className="section">
            <h3 className="section-title">1. Dados principais</h3>
            <p className="section-desc">Informações básicas para identificar e classificar o evento.</p>

            <div className="form-grid">
              <label>
                <span className="field-label">
                  Nome do evento <span className="required">*</span>
                </span>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Valentina XV"
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">
                  Tipo de evento <span className="required">*</span>
                </span>
                <select
                  value={form.tipo_evento}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_evento: e.target.value }))}
                  className="select"
                >
                  <option value="">Selecione</option>
                  {TIPOS_EVENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="field-label">
                  Categoria <span className="required">*</span>
                </span>
                <select
                  value={form.categoria_evento}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      categoria_evento: e.target.value,
                      nova_categoria_evento:
                        e.target.value === "__nova__" ? f.nova_categoria_evento : "",
                    }))
                  }
                  className="select"
                >
                  <option value="">Selecione</option>
                  {CATEGORIAS_FIXAS.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                  <option value="__nova__">+ Incluir nova categoria</option>
                </select>
              </label>

              {form.categoria_evento === "__nova__" && (
                <label>
                  <span className="field-label">Nova categoria</span>
                  <input
                    value={form.nova_categoria_evento}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nova_categoria_evento: e.target.value }))
                    }
                    placeholder="Ex: Formatura"
                    className="input"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">2. Data e horário</h3>
            <p className="section-desc">Informe quando o evento vai acontecer.</p>

            <div className="form-grid-4">
              <label>
                <span className="field-label">
                  Data de início <span className="required">*</span>
                </span>
                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">Hora de início</span>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">Data de término</span>
                <input
                  type="date"
                  value={form.data_termino}
                  onChange={(e) => setForm((f) => ({ ...f, data_termino: e.target.value }))}
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">Hora de término</span>
                <input
                  type="time"
                  value={form.hora_termino}
                  onChange={(e) => setForm((f) => ({ ...f, hora_termino: e.target.value }))}
                  className="input"
                />
              </label>
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">3. Local do evento</h3>
            <p className="section-desc">Cadastre o local completo para usar no mapa e nas demais telas.</p>

            <div className="form-grid">
              <label className="full">
                <span className="field-label">
                  Nome do local <span className="required">*</span>
                </span>
                <input
                  value={form.nome_local}
                  onChange={(e) => setForm((f) => ({ ...f, nome_local: e.target.value }))}
                  placeholder="Ex: Guerrah Hall"
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">CEP</span>
                <input
                  value={form.cep}
                  onChange={(e) => {
                    const cep = formatarCep(e.target.value);
                    setForm((f) => ({ ...f, cep }));
                    buscarCep(cep);
                  }}
                  placeholder="Ex: 27900-000"
                  className="input"
                  maxLength={9}
                />
                {buscandoCep && <div className="field-help">Buscando endereço...</div>}
                {erroCep && <div className="field-error">{erroCep}</div>}
              </label>

              <label>
                <span className="field-label">
                  Cidade <span className="required">*</span>
                </span>
                <input
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  placeholder="Ex: Macaé"
                  className="input"
                />
              </label>

              <label className="full">
                <span className="field-label">
                  Av./Rua <span className="required">*</span>
                </span>
                <input
                  value={form.rua}
                  onChange={(e) => setForm((f) => ({ ...f, rua: e.target.value }))}
                  placeholder="Rua / Avenida"
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">Número</span>
                <input
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  placeholder="Número"
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">Complemento</span>
                <input
                  value={form.complemento}
                  onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                  placeholder="Complemento"
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">Bairro</span>
                <input
                  value={form.bairro}
                  onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                  placeholder="Bairro"
                  className="input"
                />
              </label>

              <label>
                <span className="field-label">
                  Estado <span className="required">*</span>
                </span>
                <input
                  value={form.estado}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estado: e.target.value.toUpperCase().slice(0, 2),
                    }))
                  }
                  placeholder="RJ"
                  className="input"
                  maxLength={2}
                />
              </label>

              <label className="full check-row">
                <input
                  type="checkbox"
                  checked={form.mostrar_mapa}
                  onChange={(e) => setForm((f) => ({ ...f, mostrar_mapa: e.target.checked }))}
                />
                Mostrar o endereço no Google Maps
              </label>

              <label className="full">
                <span className="field-label">Link do Google Maps</span>
                <input
                  value={form.mapa_url || mapaAutomatico}
                  onChange={(e) => setForm((f) => ({ ...f, mapa_url: e.target.value }))}
                  placeholder="Gerado automaticamente pelo endereço"
                  className="input"
                />
                <div className="field-help">
                  Se deixar em branco, o sistema usa o endereço digitado para gerar o mapa automaticamente.
                </div>
              </label>

              {form.mostrar_mapa && mapaAutomatico && (
                <div className="full map-card">
                  <iframe
                    title="Preview do mapa"
                    className="map-preview"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      montarEndereco(form)
                    )}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />

                  <div className="map-actions">
                    <div className="map-url">{form.mapa_url || mapaAutomatico}</div>
                    <a
                      className="secondary"
                      href={form.mapa_url || mapaAutomatico}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir no Google Maps
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">4. Identidade visual</h3>
            <p className="section-desc">Arquivos que poderão ser usados no convite digital e nas telas do evento.</p>

            <div className="upload-grid">
              <UploadField
                label="Logomarca"
                accept="image/*"
                value={form.logo_url}
                onFile={(file) => uploadArquivo(file, "logo_url")}
              />

              <UploadField
                label="Background"
                accept="image/*"
                value={form.background_url}
                onFile={(file) => uploadArquivo(file, "background_url")}
              />

              <UploadField
                label="Música"
                accept="audio/*"
                value={form.musica_url}
                onFile={(file) => uploadArquivo(file, "musica_url")}
              />
            </div>
          </div>

          <div className="form-actions">
            <button onClick={salvarEvento} disabled={salvando || !tenantId} className="primary">
              {salvando
                ? "Salvando..."
                : modo === "criar"
                ? "Criar evento"
                : "Salvar alterações"}
            </button>

            <button onClick={fecharForm} className="secondary">
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">Meus eventos</h2>

        <div className="filters">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por evento, local, cidade, tipo, categoria ou status"
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
                  Tipo: <strong>{evento.tipo_evento || "Não informado"}</strong> · Categoria:{" "}
                  <strong>{evento.categoria_evento || "Não informada"}</strong>
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

function gerarLinkMaps(form: FormEvento) {
  const endereco = montarEndereco(form);
  if (!endereco) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    endereco
  )}`;
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCep(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 8);
  if (numeros.length <= 5) return numeros;
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
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
