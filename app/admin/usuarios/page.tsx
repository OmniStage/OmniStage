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

    const { error } = await supabase.from("perfis").update(campos).eq("id", usuario.id);

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
        .admin-users-card {
          transition:
            transform 160ms cubic-bezier(.2,.8,.2,1),
            box-shadow 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .admin-users-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px rgba(15,23,42,0.08);
          border-color: rgba(124,58,237,0.2);
          background: #ffffff;
        }

        .admin-users-action:active {
          transform: scale(0.97);
        }

        button:focus-visible,
        input:focus-visible,
        select:focus-visible {
          outline: 3px solid rgba(124,58,237,0.24);
          outline-offset: 3px;
        }

        @media (max-width: 900px) {
          .admin-users-actions {
            width: 100%;
            justify-content: flex-start !important;
          }

          .admin-users-filter {
            width: 100%;
          }

          .admin-users-filter input,
          .admin-users-filter select {
            width: 100%;
          }
        }
      `}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Admin OmniStage</span>
          <h1 style={titleStyle}>Gestão de usuários</h1>
          <p style={subtitleStyle}>
            Controle perfis, liberação de acesso e permissões dos clientes.
          </p>
        </div>

        <button onClick={carregarUsuarios} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar usuários"}
        </button>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Total" value={stats.total} detail="Usuários" color="#7c3aed" bg="#ede9fe" />
        <MetricCard label="Admins" value={stats.admins} detail="Equipe interna" color="#4c1d95" bg="#ede9fe" />
        <MetricCard label="Clientes" value={stats.clientes} detail="Contas cliente" color="#2563eb" bg="#dbeafe" />
        <MetricCard label="Ativos" value={stats.ativos} detail="Liberados" color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Pendentes" value={stats.pendentes} detail="Aguardando" color="#f59e0b" bg="#fef3c7" />
        <MetricCard label="Bloqueados" value={stats.bloqueados} detail="Sem acesso" color="#dc2626" bg="#fee2e2" />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Lista de usuários</h2>
            <p style={panelTextStyle}>
              Admin acessa o painel administrativo. Cliente acessa somente o app do cliente.
            </p>
          </div>

          <span style={counterStyle}>{usuariosFiltrados.length} exibidos</span>
        </div>

        <div className="admin-users-filter" style={filtersStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, e-mail, telefone, CPF ou status"
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
              <article key={usuario.id} className="admin-users-card" style={cardStyle}>
                <div style={avatarStyle}>
                  {getInitial(usuario.nome || usuario.email)}
                </div>

                <div style={userInfoStyle}>
                  <div style={titleRowStyle}>
                    <strong style={userNameStyle}>{usuario.nome || "Sem nome"}</strong>
                    <span style={getStatusStyle(usuario.status)}>{labelStatus(usuario.status)}</span>
                    <span style={getRoleStyle(usuario.role)}>{labelRole(usuario.role)}</span>
                  </div>

                  <div style={emailStyle}>{usuario.email || "Sem e-mail"}</div>

                  <div style={detailsGridStyle}>
                    <span>Telefone: <strong>{usuario.telefone || "Não informado"}</strong></span>
                    <span>CPF: <strong>{usuario.cpf || "Não informado"}</strong></span>
                    <span>Criado: <strong>{formatarData(usuario.created_at)}</strong></span>
                  </div>

                  <small style={idStyle}>ID: {usuario.id}</small>
                </div>

                <div className="admin-users-actions" style={actionsStyle}>
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
                    className="admin-users-action"
                    onClick={() => editarDados(usuario)}
                    disabled={salvando}
                    style={secondaryButtonStyle}
                  >
                    Editar
                  </button>

                  {usuario.status !== "ativo" && (
                    <button
                      className="admin-users-action"
                      onClick={() => atualizarUsuario(usuario, { status: "ativo" })}
                      disabled={salvando}
                      style={approveButtonStyle}
                    >
                      Liberar
                    </button>
                  )}

                  {usuario.status !== "bloqueado" && (
                    <button
                      className="admin-users-action"
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

function getInitial(value: string | null | undefined) {
  if (!value) return "?";
  return value.trim().charAt(0).toUpperCase();
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

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 22,
};

const heroStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: 26,
  padding: "28px 32px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  boxShadow: "0 24px 70px rgba(15,23,42,0.08)",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#7c3aed",
  fontWeight: 950,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 8px",
  fontSize: 36,
  fontWeight: 950,
  color: "#0f172a",
  letterSpacing: "-0.05em",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.45,
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
  color: "#fff",
  padding: "13px 18px",
  borderRadius: 15,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(124,58,237,0.24)",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 14,
};

const metricCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 14px 36px rgba(15,23,42,0.06)",
};

const iconStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
  fontSize: 15,
};

const metricLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
};

const metricValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: 7,
  fontSize: 32,
  lineHeight: 1,
  fontWeight: 950,
  color: "#0f172a",
};

const metricDetailStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 24px 70px rgba(15,23,42,0.08)",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 950,
  color: "#0f172a",
};

const panelTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
};

const counterStyle: React.CSSProperties = {
  padding: "9px 13px",
  borderRadius: 999,
  background: "rgba(124,58,237,0.08)",
  color: "#7c3aed",
  fontSize: 13,
  fontWeight: 950,
};

const filtersStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 210px 210px",
  gap: 10,
  marginTop: 18,
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 15,
  border: "1px solid rgba(226,232,240,0.95)",
  background: "#f8fafc",
  color: "#0f172a",
  outline: "none",
  fontWeight: 800,
};

const filterSelectStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 15,
  border: "1px solid rgba(226,232,240,0.95)",
  background: "#f8fafc",
  color: "#0f172a",
  outline: "none",
  fontWeight: 900,
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 18,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: 20,
  background: "#fbfdff",
  padding: 16,
  display: "grid",
  gridTemplateColumns: "42px minmax(280px, 1fr) auto",
  gap: 14,
  alignItems: "center",
};

const avatarStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 16,
  background: "linear-gradient(135deg, #ede9fe, #dbeafe)",
  color: "#6d28d9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  fontSize: 18,
};

const userInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const userNameStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 17,
  fontWeight: 950,
};

const emailStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: 14,
  fontWeight: 850,
  wordBreak: "break-word",
};

const detailsGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px 14px",
  color: "#64748b",
  fontSize: 12,
};

const idStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 700,
  wordBreak: "break-all",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const miniSelectStyle: React.CSSProperties = {
  border: "1px solid rgba(226,232,240,0.95)",
  background: "#fff",
  color: "#0f172a",
  padding: "10px 11px",
  borderRadius: 999,
  fontWeight: 900,
  outline: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(124,58,237,0.24)",
  background: "#ede9fe",
  color: "#6d28d9",
  padding: "10px 13px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const approveButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(22,163,74,0.24)",
  background: "#dcfce7",
  color: "#166534",
  padding: "10px 13px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const blockButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(220,38,38,0.24)",
  background: "#fee2e2",
  color: "#991b1b",
  padding: "10px 13px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const adminBadgeStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 11,
  fontWeight: 950,
};

const clientBadgeStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 950,
};

const activeBadgeStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 11,
  fontWeight: 950,
};

const pendingBadgeStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 11,
  fontWeight: 950,
};

const blockedBadgeStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: 11,
  fontWeight: 950,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: "1px dashed rgba(148,163,184,0.5)",
  color: "#64748b",
};

