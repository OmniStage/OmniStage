"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type RoleUsuario = "admin" | "cliente";
type StatusUsuario = "pendente" | "ativo" | "bloqueado";
type FiltroStatus = "todos" | StatusUsuario;
type FiltroRole = "todos" | RoleUsuario;

type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  role: RoleUsuario | string | null;
  status: StatusUsuario | string | null;
  created_at: string | null;
};

export default function AdminUsuariosPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroRole, setFiltroRole] = useState<FiltroRole>("todos");

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setLoading(true);

    const { data, error } = await supabase
      .from("perfis")
      .select("id, nome, email, telefone, cpf, role, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar usuários: " + error.message);
      setLoading(false);
      return;
    }

    setUsuarios((data || []) as Perfil[]);
    setLoading(false);
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const buscaOk =
        !termo ||
        [usuario.nome, usuario.email, usuario.telefone, usuario.cpf, usuario.role, usuario.status]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      const statusOk = filtroStatus === "todos" || usuario.status === filtroStatus;
      const roleOk = filtroRole === "todos" || usuario.role === filtroRole;

      return buscaOk && statusOk && roleOk;
    });
  }, [usuarios, busca, filtroStatus, filtroRole]);

  const stats = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter((u) => u.role === "admin").length;
    const clientes = usuarios.filter((u) => u.role === "cliente").length;
    const ativos = usuarios.filter((u) => u.status === "ativo").length;
    const pendentes = usuarios.filter((u) => u.status === "pendente").length;
    const bloqueados = usuarios.filter((u) => u.status === "bloqueado").length;

    return { total, admins, clientes, ativos, pendentes, bloqueados };
  }, [usuarios]);

  async function atualizarUsuario(
    usuario: Perfil,
    campos: Partial<Pick<Perfil, "role" | "status" | "nome" | "telefone" | "cpf">>
  ) {
    setSalvandoId(usuario.id);

    const { error } = await supabase
      .from("perfis")
      .update(campos)
      .eq("id", usuario.id);

    if (error) {
      alert("Erro ao atualizar usuário: " + error.message);
      setSalvandoId(null);
      return;
    }

    setUsuarios((current) =>
      current.map((item) => (item.id === usuario.id ? { ...item, ...campos } : item))
    );

    setSalvandoId(null);
  }

  async function editarDados(usuario: Perfil) {
    const nome = window.prompt("Nome do usuário:", usuario.nome || "");
    if (nome === null) return;

    const telefone = window.prompt("Telefone:", usuario.telefone || "");
    if (telefone === null) return;

    const cpf = window.prompt("CPF:", usuario.cpf || "");
    if (cpf === null) return;

    await atualizarUsuario(usuario, { nome, telefone, cpf });
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .user-card {
          transition:
            transform 170ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease,
            border-color 170ms ease,
            background 170ms ease;
        }

        .user-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(15,23,42,0.07);
          border-color: rgba(124,58,237,0.25);
          background: rgba(255,255,255,0.92);
        }

        .user-action:active {
          transform: scale(0.97);
        }

        button:focus-visible,
        input:focus-visible,
        select:focus-visible {
          outline: 3px solid rgba(124,58,237,0.26);
          outline-offset: 3px;
        }
      `}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Admin OmniStage</span>
          <h1 style={titleStyle}>Gestão de usuários</h1>
          <p style={subtitleStyle}>
            Aprove, bloqueie e organize usuários do sistema por perfil de acesso.
          </p>
        </div>

        <button onClick={carregarUsuarios} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar usuários"}
        </button>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Total" value={stats.total} detail="Usuários cadastrados" color="#7c3aed" bg="#ede9fe" />
        <MetricCard label="Admins" value={stats.admins} detail="Acesso administrativo" color="#4c1d95" bg="#ede9fe" />
        <MetricCard label="Clientes" value={stats.clientes} detail="Acesso ao app cliente" color="#2563eb" bg="#dbeafe" />
        <MetricCard label="Ativos" value={stats.ativos} detail="Liberados para uso" color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Pendentes" value={stats.pendentes} detail="Aguardando liberação" color="#f59e0b" bg="#fef3c7" />
        <MetricCard label="Bloqueados" value={stats.bloqueados} detail="Sem acesso" color="#dc2626" bg="#fee2e2" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Usuários</h2>
            <p style={panelTextStyle}>
              Altere permissões com cuidado. Usuários admin acessam o painel administrativo.
            </p>
          </div>

          <span style={counterStyle}>{usuariosFiltrados.length} exibidos</span>
        </div>

        <div style={filtersStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, e-mail, telefone, CPF, role ou status"
            style={searchInputStyle}
          />

          <select
            value={filtroRole}
            onChange={(event) => setFiltroRole(event.target.value as FiltroRole)}
            style={filterSelectStyle}
          >
            <option value="todos">Todos os perfis</option>
            <option value="admin">Admin</option>
            <option value="cliente">Cliente</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value as FiltroStatus)}
            style={filterSelectStyle}
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>

        <div style={listStyle}>
          {usuariosFiltrados.map((usuario) => {
            const salvando = salvandoId === usuario.id;

            return (
              <article key={usuario.id} className="user-card" style={cardStyle}>
                <div style={userInfoStyle}>
                  <div style={titleRowStyle}>
                    <strong style={userNameStyle}>{usuario.nome || "Sem nome"}</strong>
                    <span style={getStatusStyle(usuario.status)}>{labelStatus(usuario.status)}</span>
                    <span style={getRoleStyle(usuario.role)}>{labelRole(usuario.role)}</span>
                  </div>

                  <div style={metaStyle}>{usuario.email || "Sem e-mail"}</div>

                  <div style={detailsGridStyle}>
                    <span>Telefone: <strong>{usuario.telefone || "Não informado"}</strong></span>
                    <span>CPF: <strong>{usuario.cpf || "Não informado"}</strong></span>
                    <span>Criado em: <strong>{formatarData(usuario.created_at)}</strong></span>
                  </div>

                  <small style={idStyle}>ID: {usuario.id}</small>
                </div>

                <div style={actionsStyle}>
                  <select
                    value={(usuario.role || "cliente") as RoleUsuario}
                    onChange={(event) =>
                      atualizarUsuario(usuario, { role: event.target.value as RoleUsuario })
                    }
                    disabled={salvando}
                    style={miniSelectStyle}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="admin">Admin</option>
                  </select>

                  <select
                    value={(usuario.status || "pendente") as StatusUsuario}
                    onChange={(event) =>
                      atualizarUsuario(usuario, { status: event.target.value as StatusUsuario })
                    }
                    disabled={salvando}
                    style={miniSelectStyle}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="ativo">Ativo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>

                  <button
                    className="user-action"
                    onClick={() => editarDados(usuario)}
                    disabled={salvando}
                    style={secondaryButtonStyle}
                  >
                    Editar dados
                  </button>

                  {usuario.status !== "ativo" && (
                    <button
                      className="user-action"
                      onClick={() => atualizarUsuario(usuario, { status: "ativo" })}
                      disabled={salvando}
                      style={approveButtonStyle}
                    >
                      Liberar
                    </button>
                  )}

                  {usuario.status !== "bloqueado" && (
                    <button
                      className="user-action"
                      onClick={() => atualizarUsuario(usuario, { status: "bloqueado" })}
                      disabled={salvando}
                      style={blockButtonStyle}
                    >
                      Bloquear
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && usuariosFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum usuário encontrado.</div>
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

function labelRole(role: string | null | undefined) {
  if (role === "admin") return "Admin";
  return "Cliente";
}

function labelStatus(status: string | null | undefined) {
  if (status === "ativo") return "Ativo";
  if (status === "bloqueado") return "Bloqueado";
  return "Pendente";
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

function getRoleStyle(role: string | null | undefined): React.CSSProperties {
  if (role === "admin") return adminBadgeStyle;
  return clientBadgeStyle;
}

function getStatusStyle(status: string | null | undefined): React.CSSProperties {
  if (status === "ativo") return activeBadgeStyle;
  if (status === "bloqueado") return blockedBadgeStyle;
  return pendingBadgeStyle;
}

const pageStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const heroStyle: React.CSSProperties = { background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 24, padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, boxShadow: "0 18px 50px rgba(15,23,42,0.06)", flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { color: "#7c3aed", fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" };
const titleStyle: React.CSSProperties = { margin: "8px 0 8px", fontSize: 34, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" };
const subtitleStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 16 };
const primaryButtonStyle: React.CSSProperties = { border: "none", background: "#7c3aed", color: "#fff", padding: "13px 18px", borderRadius: 14, fontWeight: 900, cursor: "pointer" };
const statsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 };
const metricCardStyle: React.CSSProperties = { background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 22, padding: 20, boxShadow: "0 14px 40px rgba(15,23,42,0.05)" };
const iconStyle: React.CSSProperties = { width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 16 };
const metricLabelStyle: React.CSSProperties = { margin: 0, color: "#64748b", fontSize: 13, fontWeight: 850 };
const metricValueStyle: React.CSSProperties = { display: "block", marginTop: 8, fontSize: 34, fontWeight: 950, color: "#0f172a" };
const metricDetailStyle: React.CSSProperties = { margin: "8px 0 0", color: "#64748b", fontSize: 12 };
const panelStyle: React.CSSProperties = { background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 22, padding: 24, boxShadow: "0 14px 40px rgba(15,23,42,0.05)" };
const panelHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const panelTitleStyle: React.CSSProperties = { margin: 0, fontSize: 20, fontWeight: 950, color: "#0f172a" };
const panelTextStyle: React.CSSProperties = { margin: "6px 0 0", color: "#64748b" };
const counterStyle: React.CSSProperties = { padding: "9px 13px", borderRadius: 999, background: "rgba(124,58,237,0.08)", color: "#7c3aed", fontSize: 13, fontWeight: 900 };
const filtersStyle: React.CSSProperties = { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" };
const searchInputStyle: React.CSSProperties = { flex: "1 1 320px", padding: 13, borderRadius: 14, border: "1px solid rgba(226,232,240,0.95)", background: "#fff", color: "#0f172a", outline: "none", fontWeight: 750 };
const filterSelectStyle: React.CSSProperties = { flex: "0 1 200px", padding: 13, borderRadius: 14, border: "1px solid rgba(226,232,240,0.95)", background: "#fff", color: "#0f172a", outline: "none", fontWeight: 850 };
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 };
const cardStyle: React.CSSProperties = { border: "1px solid rgba(226,232,240,0.95)", borderRadius: 18, background: "rgba(255,255,255,0.78)", padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" };
const userInfoStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 280 };
const titleRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const userNameStyle: React.CSSProperties = { color: "#0f172a", fontSize: 17, fontWeight: 950 };
const metaStyle: React.CSSProperties = { color: "#475569", fontSize: 14, fontWeight: 800 };
const detailsGridStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, color: "#64748b", fontSize: 13 };
const idStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, fontWeight: 700, wordBreak: "break-all" };
const actionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" };
const miniSelectStyle: React.CSSProperties = { border: "1px solid rgba(226,232,240,0.95)", background: "#fff", color: "#0f172a", padding: "10px 11px", borderRadius: 999, fontWeight: 900, outline: "none" };
const secondaryButtonStyle: React.CSSProperties = { border: "1px solid rgba(124,58,237,0.24)", background: "#ede9fe", color: "#6d28d9", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const approveButtonStyle: React.CSSProperties = { border: "1px solid rgba(22,163,74,0.24)", background: "#dcfce7", color: "#166534", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const blockButtonStyle: React.CSSProperties = { border: "1px solid rgba(220,38,38,0.24)", background: "#fee2e2", color: "#991b1b", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const adminBadgeStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, background: "#ede9fe", color: "#6d28d9", fontSize: 11, fontWeight: 950 };
const clientBadgeStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 950 };
const activeBadgeStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 950 };
const pendingBadgeStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 950 };
const blockedBadgeStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 950 };
const emptyStyle: React.CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed rgba(148,163,184,0.5)", color: "#64748b" };
