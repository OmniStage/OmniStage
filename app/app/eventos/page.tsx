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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

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
    setDrawerOpen(false);
    setToast("Evento criado com sucesso. Aguardando aprovação do admin.");

    setTimeout(() => setToast(""), 3500);
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

        .ghost {
          width: 38px;
          height: 38px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 18px;
        }

        .primary:hover,
        .secondary:hover,
        .ghost:hover {
          transform: translateY(-1px);
        }

        .primary:disabled {
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

        .input {
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

        .input:focus {
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
          width: 460px;
          z-index: 50;
          background:
            radial-gradient(circle at top left, rgba(124,58,237,.10), transparent 32%),
            #fff;
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 28px;
          box-shadow:
            -24px 24px 80px rgba(15,23,42,.22),
            inset 0 1px 0 rgba(255,255,255,.75);
          padding: 22px;
          display: flex;
          flex-direction: column;
          animation: drawerIn .42s cubic-bezier(.16,1,.3,1) both;
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

        .drawer-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 22px;
        }

        .field-label {
          color: #475569;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 7px;
        }

        .drawer-footer {
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid rgba(226,232,240,.75);
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
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
          .filters {
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
            height: 92vh;
            border-radius: 28px 28px 0 0;
            animation: drawerMobileIn .42s cubic-bezier(.16,1,.3,1) both;
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
          <button onClick={() => setDrawerOpen(true)} className="primary" disabled={!tenantId}>
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
            <div className="empty">
              Nenhum evento encontrado para este tenant.
            </div>
          )}
        </div>
      </section>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />

          <aside className="drawer">
            <div className="drawer-top">
              <div>
                <span className="drawer-kicker">
                  <span className="drawer-dot" />
                  Novo evento
                </span>
                <h2 className="drawer-title">Criar evento</h2>
                <p className="drawer-sub">
                  Preencha as informações principais. O evento ficará aguardando aprovação do admin.
                </p>
              </div>

              <button className="ghost" onClick={() => setDrawerOpen(false)} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="drawer-form">
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
                <div className="field-label">Data</div>
                <input
                  type="date"
                  value={form.data_evento}
                  onChange={(e) => setForm((f) => ({ ...f, data_evento: e.target.value }))}
                  className="input"
                />
              </label>

              <label>
                <div className="field-label">Local</div>
                <input
                  value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  placeholder="Ex: Guerrah Hall"
                  className="input"
                />
              </label>

              <label>
                <div className="field-label">Cidade</div>
                <input
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  placeholder="Ex: Macaé"
                  className="input"
                />
              </label>
            </div>

            <div className="helper-card">
              Depois da criação, o evento entra como aguardando aprovação. O admin poderá liberar o uso do convite, RSVP, check-in e relatórios.
            </div>

            <div className="drawer-footer">
              <button onClick={criarEvento} disabled={salvando || !tenantId} className="primary">
                {salvando ? "Criando evento..." : "Criar evento"}
              </button>

              <button onClick={() => setDrawerOpen(false)} className="secondary">
                Cancelar
              </button>
            </div>
          </aside>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
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

  const [ano, mes, dia] = data.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano.slice(2)}`;

  return data;
}
