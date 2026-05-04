"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Status = "ativo" | "bloqueado";
type Permissao = "owner" | "admin" | "operador" | "visualizador";

type Plano = {
  id: string;
  nome: string;
  ativo: boolean | null;
};

type Tenant = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  status: Status | string | null;
  created_at: string | null;
  plano_id: string | null;
  tipo: string | null;
  responsavel_nome: string | null;
  onboarding_completed: boolean | null;
  planos?: { nome: string | null } | null;
};

type Usuario = {
  id: string;
  nome: string | null;
  email: string | null;
  papel: string | null;
  user_id: string | null;
};

type TenantMember = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: Permissao | string | null;
  status: Status | string | null;
  created_at: string | null;
};

type TenantForm = {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  status: Status;
  plano_id: string;
  tipo: string;
  responsavel_nome: string;
};

const formInicial: TenantForm = {
  nome: "",
  documento: "",
  telefone: "",
  email: "",
  status: "ativo",
  plano_id: "",
  tipo: "empresa",
  responsavel_nome: "",
};

export default function AdminClientesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [membros, setMembros] = useState<TenantMember[]>([]);
  const [tenantSelecionadoId, setTenantSelecionadoId] = useState<string | null>(null);
  const [editandoTenantId, setEditandoTenantId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");

  const [form, setForm] = useState<TenantForm>(formInicial);
  const [usuarioSelecionadoAuthId, setUsuarioSelecionadoAuthId] = useState("");
  const [permissao, setPermissao] = useState<Permissao>("admin");

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setLoading(true);
    await Promise.all([carregarTenants(), carregarUsuarios(), carregarPlanos()]);
    setLoading(false);
  }

  async function carregarTenants() {
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        id,
        nome,
        documento,
        telefone,
        email,
        status,
        created_at,
        plano_id,
        tipo,
        responsavel_nome,
        onboarding_completed,
        planos:plano_id (
          nome
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar clientes/empresas: " + error.message);
      return;
    }

    const lista = normalizarTenants((data || []) as Tenant[]);
    setTenants(lista);

    const tenantAtual = tenantSelecionadoId || lista[0]?.id || null;

    if (tenantAtual) {
      setTenantSelecionadoId(tenantAtual);
      await carregarMembros(tenantAtual);
    }
  }

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email, papel, user_id")
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar usuários: " + error.message);
      return;
    }

    setUsuarios((data || []) as Usuario[]);
  }

  async function carregarPlanos() {
    const { data, error } = await supabase
      .from("planos")
      .select("id, nome, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar planos: " + error.message);
      return;
    }

    setPlanos((data || []) as Plano[]);
  }

  async function carregarMembros(tenantId: string) {
    const { data, error } = await supabase
      .from("tenant_members")
      .select("id, tenant_id, user_id, role, status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar usuários vinculados: " + error.message);
      return;
    }

    setMembros((data || []) as TenantMember[]);
  }

  const tenantsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return tenants.filter((tenant) => {
      if (!termo) return true;

      return [
        tenant.nome,
        tenant.documento,
        tenant.telefone,
        tenant.email,
        tenant.status,
        tenant.planos?.nome,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [tenants, busca]);

  const tenantSelecionado = useMemo(() => {
    return tenants.find((tenant) => tenant.id === tenantSelecionadoId) || null;
  }, [tenants, tenantSelecionadoId]);

  const usuariosDisponiveis = useMemo(() => {
    const idsVinculados = new Set(membros.map((membro) => membro.user_id));

    return usuarios.filter((usuario) => {
      if (!usuario.user_id) return false;
      return !idsVinculados.has(usuario.user_id);
    });
  }, [usuarios, membros]);

  const stats = useMemo(() => {
    return {
      total: tenants.length,
      ativos: tenants.filter((t) => t.status === "ativo").length,
      bloqueados: tenants.filter((t) => t.status === "bloqueado").length,
      usuariosVinculados: membros.length,
    };
  }, [tenants, membros]);

  function limparForm() {
    setForm(formInicial);
    setEditandoTenantId(null);
  }

  function preencherForm(tenant: Tenant) {
    setForm({
      nome: tenant.nome || "",
      documento: tenant.documento || "",
      telefone: tenant.telefone || "",
      email: tenant.email || "",
      status: (tenant.status as Status) || "ativo",
      plano_id: tenant.plano_id || "",
      tipo: tenant.tipo || "empresa",
      responsavel_nome: tenant.responsavel_nome || "",
    });

    setEditandoTenantId(tenant.id);
    setTenantSelecionadoId(tenant.id);
    carregarMembros(tenant.id);
  }

  async function salvarTenant() {
    if (!form.nome.trim()) {
      alert("Informe o nome do cliente/empresa.");
      return;
    }

    setSalvando(true);

    const payload = {
      nome: form.nome.trim(),
      documento: form.documento.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      status: form.status,
      plano_id: form.plano_id || null,
      tipo: form.tipo || "empresa",
      responsavel_nome: form.responsavel_nome.trim() || null,
      onboarding_completed: true,
    };

    if (editandoTenantId) {
      const { error } = await supabase
        .from("tenants")
        .update(payload)
        .eq("id", editandoTenantId);

      if (error) {
        alert("Erro ao atualizar cliente/empresa: " + error.message);
        setSalvando(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("tenants")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        alert("Erro ao criar cliente/empresa: " + error.message);
        setSalvando(false);
        return;
      }

      setTenantSelecionadoId(data.id);
    }

    await carregarTenants();
    limparForm();
    setSalvando(false);
  }

  async function alterarStatusTenant(tenant: Tenant, status: Status) {
    const { error } = await supabase
      .from("tenants")
      .update({ status })
      .eq("id", tenant.id);

    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }

    setTenants((current) =>
      current.map((item) => (item.id === tenant.id ? { ...item, status } : item)),
    );
  }

  async function selecionarTenant(tenant: Tenant) {
    setTenantSelecionadoId(tenant.id);
    await carregarMembros(tenant.id);
  }

  async function vincularUsuario() {
    if (!tenantSelecionadoId) {
      alert("Selecione um cliente/empresa primeiro.");
      return;
    }

    if (!usuarioSelecionadoAuthId) {
      alert("Selecione um usuário.");
      return;
    }

    const { error } = await supabase.from("tenant_members").insert({
      tenant_id: tenantSelecionadoId,
      user_id: usuarioSelecionadoAuthId,
      role: permissao,
      status: "active",
    });

    if (error) {
      alert("Erro ao vincular usuário: " + error.message);
      return;
    }

    setUsuarioSelecionadoAuthId("");
    setPermissao("admin");
    await carregarMembros(tenantSelecionadoId);
  }

  async function atualizarMembro(membro: TenantMember, campos: Partial<TenantMember>) {
    const { error } = await supabase
      .from("tenant_members")
      .update(campos)
      .eq("id", membro.id);

    if (error) {
      alert("Erro ao atualizar vínculo: " + error.message);
      return;
    }

    if (tenantSelecionadoId) await carregarMembros(tenantSelecionadoId);
  }

  async function removerMembro(membro: TenantMember) {
    const ok = window.confirm("Remover este usuário da empresa?");
    if (!ok) return;

    const { error } = await supabase
      .from("tenant_members")
      .delete()
      .eq("id", membro.id);

    if (error) {
      alert("Erro ao remover vínculo: " + error.message);
      return;
    }

    if (tenantSelecionadoId) await carregarMembros(tenantSelecionadoId);
  }

  function usuarioDoMembro(membro: TenantMember) {
    return usuarios.find((usuario) => usuario.user_id === membro.user_id) || null;
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .cliente-card,
        .vinculo-card {
          transition:
            transform 170ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease,
            border-color 170ms ease,
            background 170ms ease;
        }

        .cliente-card:hover,
        .vinculo-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 42px rgba(15,23,42,0.08);
          border-color: rgba(124,58,237,0.22);
          background: #ffffff;
        }

        button:focus-visible,
        input:focus-visible,
        select:focus-visible {
          outline: 3px solid rgba(124,58,237,0.24);
          outline-offset: 3px;
        }

        @media (max-width: 900px) {
          .clientes-grid {
            grid-template-columns: 1fr !important;
          }

          .form-grid {
            grid-template-columns: 1fr !important;
          }

          .cliente-row {
            grid-template-columns: 1fr !important;
          }

          .vinculo-actions {
            justify-content: flex-start !important;
          }

          .link-box {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Admin OmniStage</span>
          <h1 style={titleStyle}>Clientes / Empresas</h1>
          <p style={subtitleStyle}>
            Cadastre empresas, vincule usuários, selecione planos e controle acesso.
          </p>
        </div>

        <button onClick={carregarTudo} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Empresas" value={stats.total} detail="Cadastradas" color="#7c3aed" bg="#ede9fe" />
        <MetricCard label="Ativas" value={stats.ativos} detail="Liberadas" color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Bloqueadas" value={stats.bloqueados} detail="Sem acesso" color="#dc2626" bg="#fee2e2" />
        <MetricCard label="Usuários" value={stats.usuariosVinculados} detail="Vinculados à empresa" color="#2563eb" bg="#dbeafe" />
      </section>

      <section className="clientes-grid" style={gridStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Cadastro da empresa</h2>
              <p style={panelTextStyle}>Tenant, contratante ou responsável financeiro.</p>
            </div>

            <button onClick={limparForm} style={secondaryButtonStyle}>
              Novo
            </button>
          </div>

          <div className="form-grid" style={formGridStyle}>
            <label style={fieldStyle}>
              Nome / Empresa
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Virgens e Vilões"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Responsável
              <input
                value={form.responsavel_nome}
                onChange={(e) => setForm((f) => ({ ...f, responsavel_nome: e.target.value }))}
                placeholder="Ex: Ursula Ferraz"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              CPF / CNPJ
              <input
                value={form.documento}
                onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                placeholder="Documento"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Telefone
              <input
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                placeholder="5522999999999"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              E-mail
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@empresa.com"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Tipo
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                style={inputStyle}
              >
                <option value="empresa">Empresa</option>
                <option value="pessoa">Pessoa física</option>
                <option value="cerimonial">Cerimonial</option>
                <option value="espaco_eventos">Espaço de eventos</option>
                <option value="agencia">Agência</option>
              </select>
            </label>

            <label style={fieldStyle}>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                style={inputStyle}
              >
                <option value="ativo">Ativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </label>

            <label style={fieldStyle}>
              Plano
              <select
                value={form.plano_id}
                onChange={(e) => setForm((f) => ({ ...f, plano_id: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Sem plano</option>
                {planos.map((plano) => (
                  <option key={plano.id} value={plano.id}>
                    {plano.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button onClick={salvarTenant} disabled={salvando} style={saveButtonStyle}>
            {salvando ? "Salvando..." : editandoTenantId ? "Salvar alterações" : "Salvar empresa"}
          </button>
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Usuários da empresa</h2>
              <p style={panelTextStyle}>
                {tenantSelecionado
                  ? `Empresa selecionada: ${tenantSelecionado.nome}`
                  : "Selecione uma empresa para vincular usuários."}
              </p>
            </div>
          </div>

          <div className="link-box" style={linkBoxStyle}>
            <select
              value={usuarioSelecionadoAuthId}
              onChange={(e) => setUsuarioSelecionadoAuthId(e.target.value)}
              style={inputStyle}
              disabled={!tenantSelecionadoId}
            >
              <option value="">Selecionar usuário</option>
              {usuariosDisponiveis.map((usuario) => (
                <option key={usuario.id} value={usuario.user_id || ""}>
                  {usuario.nome || usuario.email || usuario.id}
                </option>
              ))}
            </select>

            <select
              value={permissao}
              onChange={(e) => setPermissao(e.target.value as Permissao)}
              style={inputStyle}
              disabled={!tenantSelecionadoId}
            >
              <option value="owner">Dono</option>
              <option value="admin">Admin</option>
              <option value="operador">Operador</option>
              <option value="visualizador">Visualizador</option>
            </select>

            <button
              onClick={vincularUsuario}
              disabled={!tenantSelecionadoId}
              style={primaryButtonStyle}
            >
              Vincular
            </button>
          </div>

          <div style={listStyle}>
            {membros.map((membro) => {
              const usuario = usuarioDoMembro(membro);

              return (
                <article key={membro.id} className="vinculo-card" style={vinculoCardStyle}>
                  <div>
                    <strong style={itemTitleStyle}>
                      {usuario?.nome || usuario?.email || membro.user_id}
                    </strong>
                    <div style={itemMetaStyle}>{usuario?.email || "Sem e-mail"}</div>
                    <div style={smallLineStyle}>
                      Permissão: <strong>{membro.role}</strong> · Status:{" "}
                      <strong>{membro.status}</strong>
                    </div>
                  </div>

                  <div className="vinculo-actions" style={actionsStyle}>
                    <select
                      value={(membro.role || "admin") as Permissao}
                      onChange={(e) =>
                        atualizarMembro(membro, { role: e.target.value as Permissao })
                      }
                      style={miniSelectStyle}
                    >
                      <option value="owner">Dono</option>
                      <option value="admin">Admin</option>
                      <option value="operador">Operador</option>
                      <option value="visualizador">Visualizador</option>
                    </select>

                    <select
                      value={(membro.status || "active") as string}
                      onChange={(e) => atualizarMembro(membro, { status: e.target.value as Status })}
                      style={miniSelectStyle}
                    >
                      <option value="active">Ativo</option>
                      <option value="bloqueado">Bloqueado</option>
                    </select>

                    <button onClick={() => removerMembro(membro)} style={dangerButtonStyle}>
                      Remover
                    </button>
                  </div>
                </article>
              );
            })}

            {tenantSelecionadoId && membros.length === 0 && (
              <div style={emptyStyle}>Nenhum usuário vinculado a esta empresa.</div>
            )}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Empresas cadastradas</h2>
            <p style={panelTextStyle}>Selecione uma empresa para editar, vincular usuários ou alterar plano.</p>
          </div>

          <span style={counterStyle}>{tenantsFiltrados.length} exibidas</span>
        </div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, documento, telefone, e-mail ou plano"
          style={{ ...inputStyle, marginTop: 16 }}
        />

        <div style={listStyle}>
          {tenantsFiltrados.map((tenant) => {
            const selected = tenant.id === tenantSelecionadoId;

            return (
              <article
                key={tenant.id}
                className="cliente-card cliente-row"
                style={{
                  ...clienteCardStyle,
                  ...(selected ? selectedClienteStyle : {}),
                }}
              >
                <div>
                  <div style={titleLineStyle}>
                    <strong style={itemTitleStyle}>{tenant.nome}</strong>
                    <span style={tenant.status === "ativo" ? activeBadgeStyle : blockedBadgeStyle}>
                      {tenant.status === "ativo" ? "Ativo" : "Bloqueado"}
                    </span>
                    <span style={planBadgeStyle}>
                      {tenant.planos?.nome || "Sem plano"}
                    </span>
                  </div>

                  <div style={itemMetaStyle}>{tenant.email || "Sem e-mail"}</div>

                  <div style={smallLineStyle}>
                    Responsável: <strong>{tenant.responsavel_nome || "Não informado"}</strong> ·
                    Documento: <strong>{tenant.documento || "Não informado"}</strong> ·
                    Telefone: <strong>{tenant.telefone || "Não informado"}</strong> ·
                    Criado: <strong>{formatarData(tenant.created_at)}</strong>
                  </div>
                </div>

                <div style={actionsStyle}>
                  <button onClick={() => selecionarTenant(tenant)} style={secondaryButtonStyle}>
                    Selecionar
                  </button>

                  <button onClick={() => preencherForm(tenant)} style={secondaryButtonStyle}>
                    Editar
                  </button>

                  {tenant.status === "ativo" ? (
                    <button
                      onClick={() => alterarStatusTenant(tenant, "bloqueado")}
                      style={dangerButtonStyle}
                    >
                      Bloquear
                    </button>
                  ) : (
                    <button
                      onClick={() => alterarStatusTenant(tenant, "ativo")}
                      style={approveButtonStyle}
                    >
                      Liberar
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && tenantsFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhuma empresa encontrada.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  color,
  bg,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
  bg: string;
}) {
  return (
    <article style={metricCardStyle}>
      <div style={{ ...iconStyle, background: bg, color }}>●</div>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={metricValueStyle}>{value}</strong>
      <p style={metricDetailStyle}>{detail}</p>
    </article>
  );
}

function formatarData(data: string | null) {
  if (!data) return "Não informado";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizarTenants(lista: Tenant[]): Tenant[] {
  return lista.map((item) => ({
    ...item,
    planos: Array.isArray(item.planos) ? item.planos[0] || null : item.planos || null,
  }));
}

const pageStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 22 };
const heroStyle: React.CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 26, padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, boxShadow: "0 24px 70px rgba(15,23,42,0.08)", flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { color: "#7c3aed", fontWeight: 950, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" };
const titleStyle: React.CSSProperties = { margin: "8px 0 8px", fontSize: 36, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.05em" };
const subtitleStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 16, lineHeight: 1.45 };
const primaryButtonStyle: React.CSSProperties = { border: "none", background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff", padding: "13px 18px", borderRadius: 15, fontWeight: 900, cursor: "pointer", boxShadow: "0 12px 26px rgba(124,58,237,0.24)" };
const statsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 };
const metricCardStyle: React.CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 22, padding: 18, boxShadow: "0 14px 36px rgba(15,23,42,0.06)" };
const iconStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 15 };
const metricLabelStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 900 };
const metricValueStyle: React.CSSProperties = { display: "block", marginTop: 7, fontSize: 32, lineHeight: 1, fontWeight: 950, color: "#0f172a" };
const metricDetailStyle: React.CSSProperties = { margin: "8px 0 0", color: "#64748b", fontSize: 12 };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(320px, 0.9fr) minmax(360px, 1.1fr)", gap: 16 };
const panelStyle: React.CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 24, padding: 24, boxShadow: "0 24px 70px rgba(15,23,42,0.08)" };
const panelHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const panelTitleStyle: React.CSSProperties = { margin: 0, fontSize: 22, fontWeight: 950, color: "#0f172a" };
const panelTextStyle: React.CSSProperties = { margin: "6px 0 0", color: "#64748b", lineHeight: 1.4 };
const counterStyle: React.CSSProperties = { padding: "9px 13px", borderRadius: 999, background: "rgba(124,58,237,0.08)", color: "#7c3aed", fontSize: 13, fontWeight: 950 };
const formGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7, color: "#64748b", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.06em" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "13px 15px", borderRadius: 15, border: "1px solid rgba(226,232,240,0.95)", background: "#f8fafc", color: "#0f172a", outline: "none", fontWeight: 850, textTransform: "none", letterSpacing: 0 };
const saveButtonStyle: React.CSSProperties = { ...primaryButtonStyle, width: "100%", marginTop: 16 };
const secondaryButtonStyle: React.CSSProperties = { border: "1px solid rgba(124,58,237,0.24)", background: "#ede9fe", color: "#6d28d9", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const approveButtonStyle: React.CSSProperties = { border: "1px solid rgba(22,163,74,0.24)", background: "#dcfce7", color: "#166534", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const dangerButtonStyle: React.CSSProperties = { border: "1px solid rgba(220,38,38,0.24)", background: "#fee2e2", color: "#991b1b", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const linkBoxStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 170px auto", gap: 10, marginTop: 18 };
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 };
const clienteCardStyle: React.CSSProperties = { border: "1px solid rgba(226,232,240,0.95)", borderRadius: 20, background: "#fbfdff", padding: 16, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) auto", gap: 14, alignItems: "center" };
const selectedClienteStyle: React.CSSProperties = { borderColor: "rgba(124,58,237,0.36)", boxShadow: "0 0 0 4px rgba(124,58,237,0.08)" };
const vinculoCardStyle: React.CSSProperties = { border: "1px solid rgba(226,232,240,0.95)", borderRadius: 18, background: "#fbfdff", padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" };
const titleLineStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const itemTitleStyle: React.CSSProperties = { color: "#0f172a", fontSize: 17, fontWeight: 950 };
const itemMetaStyle: React.CSSProperties = { color: "#334155", fontSize: 14, fontWeight: 850, marginTop: 4 };
const smallLineStyle: React.CSSProperties = { color: "#64748b", fontSize: 12, marginTop: 6 };
const actionsStyle: React.CSSProperties = { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap" };
const miniSelectStyle: React.CSSProperties = { border: "1px solid rgba(226,232,240,0.95)", background: "#fff", color: "#0f172a", padding: "10px 11px", borderRadius: 999, fontWeight: 900, outline: "none" };
const activeBadgeStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 950 };
const blockedBadgeStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 950 };
const planBadgeStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#ede9fe", color: "#6d28d9", fontSize: 11, fontWeight: 950 };
const emptyStyle: React.CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed rgba(148,163,184,0.5)", color: "#64748b" };
