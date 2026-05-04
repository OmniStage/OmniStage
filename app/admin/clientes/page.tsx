"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Status = "ativo" | "bloqueado";
type Permissao = "admin" | "operador" | "visualizador";

type Cliente = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  status: Status | string | null;
  created_at: string | null;
};

type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  role: string | null;
  status: string | null;
};

type Vinculo = {
  id: string;
  cliente_id: string;
  usuario_id: string;
  permissao: Permissao | string | null;
  status: Status | string | null;
  created_at: string | null;
  perfis?: Perfil | Perfil[] | null;
};

export default function AdminClientesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");

  const [form, setForm] = useState({
    nome: "",
    documento: "",
    telefone: "",
    email: "",
    status: "ativo" as Status,
  });

  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState("");
  const [permissao, setPermissao] = useState<Permissao>("admin");

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setLoading(true);
    await Promise.all([carregarClientes(), carregarUsuarios()]);
    setLoading(false);
  }

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, documento, telefone, email, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar clientes: " + error.message);
      return;
    }

    const lista = (data || []) as Cliente[];
    setClientes(lista);

    if (!clienteSelecionadoId && lista.length > 0) {
      setClienteSelecionadoId(lista[0].id);
      await carregarVinculos(lista[0].id);
    } else if (clienteSelecionadoId) {
      await carregarVinculos(clienteSelecionadoId);
    }
  }

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("perfis")
      .select("id, nome, email, telefone, role, status")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar usuários: " + error.message);
      return;
    }

    setUsuarios((data || []) as Perfil[]);
  }

  async function carregarVinculos(clienteId: string) {
    const { data, error } = await supabase
      .from("cliente_usuarios")
      .select(`
        id,
        cliente_id,
        usuario_id,
        permissao,
        status,
        created_at,
        perfis:usuario_id (
          id,
          nome,
          email,
          telefone,
          role,
          status
        )
      `)
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar vínculos: " + error.message);
      return;
    }

    setVinculos(normalizarVinculos(data || []));
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return clientes.filter((cliente) => {
      if (!termo) return true;

      return [cliente.nome, cliente.documento, cliente.telefone, cliente.email, cliente.status]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [clientes, busca]);

  const clienteSelecionado = useMemo(() => {
    return clientes.find((cliente) => cliente.id === clienteSelecionadoId) || null;
  }, [clientes, clienteSelecionadoId]);

  const usuariosDisponiveis = useMemo(() => {
    const idsVinculados = new Set(vinculos.map((v) => v.usuario_id));
    return usuarios.filter((usuario) => !idsVinculados.has(usuario.id));
  }, [usuarios, vinculos]);

  const stats = useMemo(() => {
    return {
      total: clientes.length,
      ativos: clientes.filter((c) => c.status === "ativo").length,
      bloqueados: clientes.filter((c) => c.status === "bloqueado").length,
      usuariosVinculados: vinculos.length,
    };
  }, [clientes, vinculos]);

  function limparForm() {
    setForm({
      nome: "",
      documento: "",
      telefone: "",
      email: "",
      status: "ativo",
    });
  }

  function preencherForm(cliente: Cliente) {
    setForm({
      nome: cliente.nome || "",
      documento: cliente.documento || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      status: (cliente.status as Status) || "ativo",
    });

    setClienteSelecionadoId(cliente.id);
    carregarVinculos(cliente.id);
  }

  async function salvarCliente() {
    if (!form.nome.trim()) {
      alert("Informe o nome do cliente/empresa.");
      return;
    }

    setSalvando(true);

    if (clienteSelecionadoId && clienteSelecionado?.nome === form.nome) {
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: form.nome.trim(),
          documento: form.documento.trim() || null,
          telefone: form.telefone.trim() || null,
          email: form.email.trim() || null,
          status: form.status,
        })
        .eq("id", clienteSelecionadoId);

      if (error) {
        alert("Erro ao atualizar cliente: " + error.message);
        setSalvando(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nome: form.nome.trim(),
          documento: form.documento.trim() || null,
          telefone: form.telefone.trim() || null,
          email: form.email.trim() || null,
          status: form.status,
        })
        .select("id")
        .single();

      if (error) {
        alert("Erro ao criar cliente: " + error.message);
        setSalvando(false);
        return;
      }

      setClienteSelecionadoId(data.id);
    }

    await carregarClientes();
    limparForm();
    setSalvando(false);
  }

  async function alterarStatusCliente(cliente: Cliente, status: Status) {
    const { error } = await supabase
      .from("clientes")
      .update({ status })
      .eq("id", cliente.id);

    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }

    setClientes((current) =>
      current.map((item) => (item.id === cliente.id ? { ...item, status } : item))
    );
  }

  async function selecionarCliente(cliente: Cliente) {
    setClienteSelecionadoId(cliente.id);
    await carregarVinculos(cliente.id);
  }

  async function vincularUsuario() {
    if (!clienteSelecionadoId) {
      alert("Selecione um cliente primeiro.");
      return;
    }

    if (!usuarioSelecionadoId) {
      alert("Selecione um usuário.");
      return;
    }

    const { error } = await supabase.from("cliente_usuarios").insert({
      cliente_id: clienteSelecionadoId,
      usuario_id: usuarioSelecionadoId,
      permissao,
      status: "ativo",
    });

    if (error) {
      alert("Erro ao vincular usuário: " + error.message);
      return;
    }

    setUsuarioSelecionadoId("");
    setPermissao("admin");
    await carregarVinculos(clienteSelecionadoId);
  }

  async function atualizarVinculo(vinculo: Vinculo, campos: Partial<Vinculo>) {
    const { error } = await supabase
      .from("cliente_usuarios")
      .update(campos)
      .eq("id", vinculo.id);

    if (error) {
      alert("Erro ao atualizar vínculo: " + error.message);
      return;
    }

    if (clienteSelecionadoId) await carregarVinculos(clienteSelecionadoId);
  }

  async function removerVinculo(vinculo: Vinculo) {
    const ok = window.confirm("Remover este usuário do cliente?");
    if (!ok) return;

    const { error } = await supabase
      .from("cliente_usuarios")
      .delete()
      .eq("id", vinculo.id);

    if (error) {
      alert("Erro ao remover vínculo: " + error.message);
      return;
    }

    if (clienteSelecionadoId) await carregarVinculos(clienteSelecionadoId);
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
        }
      `}</style>

      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Admin OmniStage</span>
          <h1 style={titleStyle}>Clientes / Empresas</h1>
          <p style={subtitleStyle}>
            Cadastre clientes, vincule usuários e prepare a liberação de eventos por empresa.
          </p>
        </div>

        <button onClick={carregarTudo} style={primaryButtonStyle}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </section>

      <section style={statsGridStyle}>
        <MetricCard label="Clientes" value={stats.total} detail="Cadastrados" color="#7c3aed" bg="#ede9fe" />
        <MetricCard label="Ativos" value={stats.ativos} detail="Liberados" color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Bloqueados" value={stats.bloqueados} detail="Sem acesso" color="#dc2626" bg="#fee2e2" />
        <MetricCard label="Usuários" value={stats.usuariosVinculados} detail="Vinculados ao cliente" color="#2563eb" bg="#dbeafe" />
      </section>

      <section className="clientes-grid" style={gridStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Cadastro do cliente</h2>
              <p style={panelTextStyle}>Empresa, contratante ou responsável financeiro.</p>
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
          </div>

          <button onClick={salvarCliente} disabled={salvando} style={saveButtonStyle}>
            {salvando ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Usuários do cliente</h2>
              <p style={panelTextStyle}>
                {clienteSelecionado
                  ? `Cliente selecionado: ${clienteSelecionado.nome}`
                  : "Selecione um cliente para vincular usuários."}
              </p>
            </div>
          </div>

          <div style={linkBoxStyle}>
            <select
              value={usuarioSelecionadoId}
              onChange={(e) => setUsuarioSelecionadoId(e.target.value)}
              style={inputStyle}
              disabled={!clienteSelecionadoId}
            >
              <option value="">Selecionar usuário</option>
              {usuariosDisponiveis.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome || usuario.email || usuario.id}
                </option>
              ))}
            </select>

            <select
              value={permissao}
              onChange={(e) => setPermissao(e.target.value as Permissao)}
              style={inputStyle}
              disabled={!clienteSelecionadoId}
            >
              <option value="admin">Admin do cliente</option>
              <option value="operador">Operador</option>
              <option value="visualizador">Visualizador</option>
            </select>

            <button
              onClick={vincularUsuario}
              disabled={!clienteSelecionadoId}
              style={primaryButtonStyle}
            >
              Vincular
            </button>
          </div>

          <div style={listStyle}>
            {vinculos.map((vinculo) => {
              const perfil = perfilDoVinculo(vinculo);

              return (
                <article key={vinculo.id} className="vinculo-card" style={vinculoCardStyle}>
                  <div>
                    <strong style={itemTitleStyle}>
                      {perfil?.nome || perfil?.email || "Usuário sem nome"}
                    </strong>
                    <div style={itemMetaStyle}>{perfil?.email || "Sem e-mail"}</div>
                    <div style={smallLineStyle}>
                      Permissão: <strong>{vinculo.permissao}</strong> · Status:{" "}
                      <strong>{vinculo.status}</strong>
                    </div>
                  </div>

                  <div className="vinculo-actions" style={actionsStyle}>
                    <select
                      value={(vinculo.permissao || "admin") as Permissao}
                      onChange={(e) =>
                        atualizarVinculo(vinculo, { permissao: e.target.value as Permissao })
                      }
                      style={miniSelectStyle}
                    >
                      <option value="admin">Admin</option>
                      <option value="operador">Operador</option>
                      <option value="visualizador">Visualizador</option>
                    </select>

                    <select
                      value={(vinculo.status || "ativo") as Status}
                      onChange={(e) => atualizarVinculo(vinculo, { status: e.target.value as Status })}
                      style={miniSelectStyle}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="bloqueado">Bloqueado</option>
                    </select>

                    <button onClick={() => removerVinculo(vinculo)} style={dangerButtonStyle}>
                      Remover
                    </button>
                  </div>
                </article>
              );
            })}

            {clienteSelecionadoId && vinculos.length === 0 && (
              <div style={emptyStyle}>Nenhum usuário vinculado a este cliente.</div>
            )}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Clientes cadastrados</h2>
            <p style={panelTextStyle}>Selecione um cliente para editar ou vincular usuários.</p>
          </div>

          <span style={counterStyle}>{clientesFiltrados.length} exibidos</span>
        </div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, documento, telefone ou e-mail"
          style={{ ...inputStyle, marginTop: 16 }}
        />

        <div style={listStyle}>
          {clientesFiltrados.map((cliente) => {
            const selected = cliente.id === clienteSelecionadoId;

            return (
              <article
                key={cliente.id}
                className="cliente-card cliente-row"
                style={{
                  ...clienteCardStyle,
                  ...(selected ? selectedClienteStyle : {}),
                }}
              >
                <div>
                  <div style={titleLineStyle}>
                    <strong style={itemTitleStyle}>{cliente.nome}</strong>
                    <span style={cliente.status === "ativo" ? activeBadgeStyle : blockedBadgeStyle}>
                      {cliente.status === "ativo" ? "Ativo" : "Bloqueado"}
                    </span>
                  </div>

                  <div style={itemMetaStyle}>{cliente.email || "Sem e-mail"}</div>

                  <div style={smallLineStyle}>
                    Documento: <strong>{cliente.documento || "Não informado"}</strong> · Telefone:{" "}
                    <strong>{cliente.telefone || "Não informado"}</strong> · Criado:{" "}
                    <strong>{formatarData(cliente.created_at)}</strong>
                  </div>
                </div>

                <div style={actionsStyle}>
                  <button onClick={() => selecionarCliente(cliente)} style={secondaryButtonStyle}>
                    Selecionar
                  </button>

                  <button onClick={() => preencherForm(cliente)} style={secondaryButtonStyle}>
                    Editar
                  </button>

                  {cliente.status === "ativo" ? (
                    <button
                      onClick={() => alterarStatusCliente(cliente, "bloqueado")}
                      style={dangerButtonStyle}
                    >
                      Bloquear
                    </button>
                  ) : (
                    <button
                      onClick={() => alterarStatusCliente(cliente, "ativo")}
                      style={approveButtonStyle}
                    >
                      Liberar
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && clientesFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum cliente encontrado.</div>
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

function normalizarVinculos(lista: any[]): Vinculo[] {
  return lista.map((item) => ({
    ...item,
    perfis: Array.isArray(item.perfis) ? item.perfis[0] || null : item.perfis || null,
  })) as Vinculo[];
}

function perfilDoVinculo(vinculo: Vinculo): Perfil | null {
  if (!vinculo.perfis) return null;
  if (Array.isArray(vinculo.perfis)) return vinculo.perfis[0] || null;
  return vinculo.perfis;
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
const emptyStyle: React.CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed rgba(148,163,184,0.5)", color: "#64748b" };
