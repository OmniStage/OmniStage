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
};

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

  const [form, setForm] = useState({
    nome: "",
    data_evento: "",
    local: "",
    cidade: "",
  });

  useEffect(() => {
    carregarTenantsDoUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .eq("user_id", user.id)
      .eq("status", "ativo");

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
      .select("id,nome,data_evento,local,cidade,tenant_id,status_aprovacao,ativo,created_at")
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

  async function criarEvento() {
    if (!tenantId) {
      alert("Nenhum tenant ativo encontrado para este usuário.");
      return;
    }

    if (!form.nome.trim()) {
      alert("Informe o nome do evento.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("eventos").insert({
      nome: form.nome.trim(),
      data_evento: form.data_evento || null,
      local: form.local.trim() || null,
      cidade: form.cidade.trim() || null,
      tenant_id: tenantId,
      status_aprovacao: "aguardando_aprovacao",
      ativo: false,
    });

    if (error) {
      alert("Erro ao criar evento: " + error.message);
      setSalvando(false);
      return;
    }

    setForm({ nome: "", data_evento: "", local: "", cidade: "" });
    await carregarEventos(tenantId);
    setSalvando(false);
  }

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventos.filter((evento) => {
      if (!termo) return true;

      return [evento.nome, evento.local, evento.cidade, evento.status_aprovacao]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [eventos, busca]);

  const tenantAtual = tenants.find((tenant) => tenant.id === tenantId) || null;

  return (
    <div className="app-events-page">
      <style>{`
        .app-events-page { display: flex; flex-direction: column; gap: 22px; }
        .hero, .panel, .event-card { background: #fff; border: 1px solid rgba(226,232,240,.95); box-shadow: 0 24px 70px rgba(15,23,42,.08); }
        .hero { border-radius: 26px; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
        .eyebrow { color: #7c3aed; font-weight: 950; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
        .title { margin: 8px 0; font-size: 36px; font-weight: 950; color: #0f172a; letter-spacing: -.05em; }
        .subtitle { margin: 0; color: #64748b; font-size: 16px; line-height: 1.45; }
        .primary { border: none; background: linear-gradient(135deg,#7c3aed,#5b21b6); color: #fff; padding: 13px 18px; border-radius: 15px; font-weight: 900; cursor: pointer; box-shadow: 0 12px 26px rgba(124,58,237,.24); }
        .panel { border-radius: 24px; padding: 24px; }
        .panel-title { margin: 0; font-size: 22px; font-weight: 950; color: #0f172a; }
        .panel-text { margin: 6px 0 0; color: #64748b; line-height: 1.4; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
        .filters { display: grid; grid-template-columns: 1fr 260px; gap: 10px; margin-top: 18px; }
        .input { width: 100%; padding: 13px 15px; border-radius: 15px; border: 1px solid rgba(226,232,240,.95); background: #f8fafc; color: #0f172a; outline: none; font-weight: 850; }
        .list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .event-card { border-radius: 20px; padding: 16px; display: flex; justify-content: space-between; gap: 14px; align-items: center; flex-wrap: wrap; transition: transform .17s cubic-bezier(.2,.8,.2,1), box-shadow .17s ease, border-color .17s ease; }
        .event-card:hover { transform: translateY(-1px); box-shadow: 0 18px 42px rgba(15,23,42,.08); border-color: rgba(124,58,237,.22); }
        .item-title { color: #0f172a; font-size: 17px; font-weight: 950; }
        .item-meta { color: #334155; font-size: 14px; font-weight: 850; margin-top: 4px; }
        .small-line { color: #64748b; font-size: 12px; margin-top: 6px; }
        .badge { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 950; display: inline-flex; margin-left: 8px; }
        .badge.active { background: #dcfce7; color: #166534; }
        .badge.blocked { background: #fee2e2; color: #991b1b; }
        .badge.pending { background: #fef3c7; color: #92400e; }
        .badge.neutral { background: #e2e8f0; color: #475569; }
        .empty { padding: 18px; border-radius: 16px; border: 1px dashed rgba(148,163,184,.5); color: #64748b; }
        @media (max-width: 900px) { .grid, .filters { grid-template-columns: 1fr; } }
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

        <button onClick={() => tenantId && carregarEventos(tenantId)} className="primary">
          {loading ? "Carregando..." : "Atualizar"}
        </button>
      </section>

      {tenants.length > 1 && (
        <section className="panel">
          <h2 className="panel-title">Selecionar tenant</h2>
          <select value={tenantId} onChange={(e) => trocarTenant(e.target.value)} className="input" style={{ marginTop: 14 }}>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.nome}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">Criar evento</h2>
        <p className="panel-text">O evento ficará aguardando aprovação do admin.</p>

        <div className="grid">
          <input
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Nome do evento"
            className="input"
          />
          <input
            type="date"
            value={form.data_evento}
            onChange={(e) => setForm((f) => ({ ...f, data_evento: e.target.value }))}
            className="input"
          />
          <input
            value={form.local}
            onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
            placeholder="Local"
            className="input"
          />
          <input
            value={form.cidade}
            onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
            placeholder="Cidade"
            className="input"
          />
        </div>

        <button onClick={criarEvento} disabled={salvando || !tenantId} className="primary" style={{ marginTop: 14 }}>
          {salvando ? "Salvando..." : "Criar evento"}
        </button>
      </section>

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
                  Data: <strong>{evento.data_evento ? formatarData(evento.data_evento) : "Não definida"}</strong>
                </div>
                <div className="small-line">
                  Local: <strong>{evento.local || "Não informado"}</strong> · Cidade:{" "}
                  <strong>{evento.cidade || "Não informada"}</strong>
                </div>
              </div>
            </article>
          ))}

          {!loading && eventosFiltrados.length === 0 && (
            <div className="empty">Nenhum evento encontrado para este tenant.</div>
          )}
        </div>
      </section>
    </div>
  );
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

function formatarData(data: string | null) {
  if (!data) return "Não informado";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

