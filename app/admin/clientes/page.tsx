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
  status: string | null;
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
  permissao: string | null;
  status: string | null;
  created_at: string | null;
  perfis: Perfil | null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTudo() {
    setLoading(true);
    const clientesCarregados = await carregarClientes();
    await carregarUsuarios();

    if (clientesCarregados.length > 0) {
      const id = clienteSelecionadoId || clientesCarregados[0].id;
      setClienteSelecionadoId(id);
      await carregarVinculos(id);
    }

    setLoading(false);
  }

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,documento,telefone,email,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar clientes: " + error.message);
      return [];
    }

    const lista = (data || []) as Cliente[];
    setClientes(lista);
    return lista;
  }

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("perfis")
      .select("id,nome,email,telefone,role,status")
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

    const normalizados = (data || []).map((item: any) => ({
      ...item,
      perfis: Array.isArray(item.perfis) ? item.perfis[0] || null : item.perfis || null,
    })) as Vinculo[];

    setVinculos(normalizados);
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
    const idsVinculados = new Set(vinculos.map((vinculo) => vinculo.usuario_id));
    return usuarios.filter((usuario) => !idsVinculados.has(usuario.id));
  }, [usuarios, vinculos]);

  const stats = useMemo(() => {
    return {
      total: clientes.length,
      ativos: clientes.filter((cliente) => cliente.status === "ativo").length,
      bloqueados: clientes.filter((cliente) => cliente.status === "bloqueado").length,
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

    const payload = {
      nome: form.nome.trim(),
      documento: form.documento.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      status: form.status,
    };

    if (clienteSelecionadoId && clienteSelecionado?.nome === form.nome) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", clienteSelecionadoId);

      if (error) {
        alert("Erro ao atualizar cliente: " + error.message);
        setSalvando(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("clientes").insert(payload).select("id").single();

      if (error) {
        alert("Erro ao criar cliente: " + error.message);
        setSalvando(false);
        return;
      }

      setClienteSelecionadoId(data.id);
    }

    await carregarTudo();
    limparForm();
    setSalvando(false);
  }

  async function alterarStatusCliente(cliente: Cliente, status: Status) {
    const { error } = await supabase.from("clientes").update({ status }).eq("id", cliente.id);

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

  async function atualizarVinculo(vinculo: Vinculo, campos: Record<string, string>) {
    const { error } = await supabase.from("cliente_usuarios").update(campos).eq("id", vinculo.id);

    if (error) {
      alert("Erro ao atualizar vínculo: " + error.message);
      return;
    }

    if (clienteSelecionadoId) await carregarVinculos(clienteSelecionadoId);
  }

  async function removerVinculo(vinculo: Vinculo) {
    const ok = window.confirm("Remover este usuário do cliente?");
    if (!ok) return;

    const { error } = await supabase.from("cliente_usuarios").delete().eq("id", vinculo.id);

    if (error) {
      alert("Erro ao remover vínculo: " + error.message);
      return;
    }

    if (clienteSelecionadoId) await carregarVinculos(clienteSelecionadoId);
  }

  return (
    <div className="clientes-page">
      <style>{`
        .clientes-page { display: flex; flex-direction: column; gap: 22px; }
        .hero, .panel, .metric-card {
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
        .eyebrow { color: #7c3aed; font-weight: 950; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
        .title { margin: 8px 0; font-size: 36px; font-weight: 950; color: #0f172a; letter-spacing: -.05em; }
        .subtitle { margin: 0; color: #64748b; font-size: 16px; line-height: 1.45; }
        .primary {
          border: none;
          background: linear-gradient(135deg,#7c3aed,#5b21b6);
          color: #fff;
          padding: 13px 18px;
          border-radius: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(124,58,237,.24);
        }
        .secondary, .approve, .danger {
          padding: 10px 13px;
          border-radius: 999px;
          font-weight: 900;
          cursor: pointer;
        }
        .secondary { border: 1px solid rgba(124,58,237,.24); background: #ede9fe; color: #6d28d9; }
        .approve { border: 1px solid rgba(22,163,74,.24); background: #dcfce7; color: #166534; }
        .danger { border: 1px solid rgba(220,38,38,.24); background: #fee2e2; color: #991b1b; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(170px,1fr)); gap: 14px; }
        .metric-card { border-radius: 22px; padding: 18px; }
        .metric-icon { width: 32px; height: 32px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .metric-label { margin: 0; color: #64748b; font-size: 12px; font-weight: 900; }
        .metric-value { display: block; margin-top: 7px; font-size: 32px; line-height: 1; font-weight: 950; color: #0f172a; }
        .metric-detail { margin: 8px 0 0; color: #64748b; font-size: 12px; }
        .grid { display: grid; grid-template-columns: minmax(320px,.9fr) minmax(360px,1.1fr); gap: 16px; }
        .panel { border-radius: 24px; padding: 24px; }
        .panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .panel-title { margin: 0; font-size: 22px; font-weight: 950; color: #0f172a; }
        .panel-text { margin: 6px 0 0; color: #64748b; line-height: 1.4; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
        .field { display: flex; flex-direction: column; gap: 7px; color: #64748b; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .06em; }
        .input {
          width: 100%;
          padding: 13px 15px;
          border-radius: 15px;
          border: 1px solid rgba(226,232,240,.95);
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          font-weight: 850;
        }
        .link-box { display: grid; grid-template-columns: 1fr 170px auto; gap: 10px; margin-top: 18px; }
        .list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .cliente-card, .vinculo-card {
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 20px;
          background: #fbfdff;
          padding: 16px;
          transition: transform .17s cubic-bezier(.2,.8,.2,1), box-shadow .17s ease, border-color .17s ease, background .17s ease;
        }
        .cliente-card:hover, .vinculo-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 42px rgba(15,23,42,.08);
          border-color: rgba(124,58,237,.22);
          background: #fff;
        }
        .cliente-card { display: grid; grid-template-columns: minmax(280px,1fr) auto; gap: 14px; align-items: center; }
        .vinculo-card { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
        .selected { border-color: rgba(124,58,237,.36); box-shadow: 0 0 0 4px rgba(124,58,237,.08); }
        .title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .item-title { color: #0f172a; font-size: 17px; font-weight: 950; }
        .item-meta { color: #334155; font-size: 14px; font-weight: 850; margin-top: 4px; }
        .small-line { color: #64748b; font-size: 12px; margin-top: 6px; }
        .actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }
        .mini-select { border: 1px solid rgba(226,232,240,.95); background: #fff; color: #0f172a; padding: 10px 11px; border-radius: 999px; font-weight: 900; outline: none; }
        .badge-active, .badge-blocked, .counter { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 950; }
        .badge-active { background: #dcfce7; color: #166534; }
        .badge-blocked { background: #fee2e2; color: #991b1b; }
        .counter { background: rgba(124,58,237,.08); color: #7c3aed; font-size: 13px; padding: 9px 13px; }
        .empty { padding: 18px; border-radius: 16px; border: 1px dashed rgba(148,163,184,.5); color: #64748b; }

        @media (max-width: 900px) {
          .grid, .form-grid, .cliente-card, .link-box { grid-template-columns: 1fr; }
          .actions { justify-content: flex-start; }
        }
      `}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">Admin OmniStage</span>
          <h1 className="title">Clientes / Empresas</h1>
          <p className="subtitle">
            Cadastre clientes, vincule usuários e prepare a liberação de eventos por empresa.
          </p>
        </div>

        <button onClick={carregarTudo} className="primary">
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </section>

      <section className="stats">
        <MetricCard label="Clientes" value={stats.total} detail="Cadastrados" color="#7c3aed" bg="#ede9fe" />
        <MetricCard label="Ativos" value={stats.ativos} detail="Liberados" color="#16a34a" bg="#dcfce7" />
        <MetricCard label="Bloqueados" value={stats.bloqueados} detail="Sem acesso" color="#dc2626" bg="#fee2e2" />
        <MetricCard label="Usuários" value={stats.usuariosVinculados} detail="Vinculados ao cliente" color="#2563eb" bg="#dbeafe" />
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cadastro do cliente</h2>
              <p className="panel-text">Empresa, contratante ou responsável financeiro.</p>
            </div>
            <button onClick={limparForm} className="secondary">Novo</button>
          </div>

          <div className="form-grid">
            <label className="field">Nome / Empresa
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Virgens e Vilões" className="input" />
            </label>

            <label className="field">CPF / CNPJ
              <input value={form.documento} onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))} placeholder="Documento" className="input" />
            </label>

            <label className="field">Telefone
              <input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="5522999999999" className="input" />
            </label>

            <label className="field">E-mail
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" className="input" />
            </label>

            <label className="field">Status
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))} className="input">
                <option value="ativo">Ativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </label>
          </div>

          <button onClick={salvarCliente} disabled={salvando} className="primary" style={{ width: "100%", marginTop: 16 }}>
            {salvando ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Usuários do cliente</h2>
              <p className="panel-text">
                {clienteSelecionado ? `Cliente selecionado: ${clienteSelecionado.nome}` : "Selecione um cliente para vincular usuários."}
              </p>
            </div>
          </div>

          <div className="link-box">
            <select value={usuarioSelecionadoId} onChange={(e) => setUsuarioSelecionadoId(e.target.value)} className="input" disabled={!clienteSelecionadoId}>
              <option value="">Selecionar usuário</option>
              {usuariosDisponiveis.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome || usuario.email || usuario.id}
                </option>
              ))}
            </select>

            <select value={permissao} onChange={(e) => setPermissao(e.target.value as Permissao)} className="input" disabled={!clienteSelecionadoId}>
              <option value="admin">Admin do cliente</option>
              <option value="operador">Operador</option>
              <option value="visualizador">Visualizador</option>
            </select>

            <button onClick={vincularUsuario} disabled={!clienteSelecionadoId} className="primary">Vincular</button>
          </div>

          <div className="list">
            {vinculos.map((vinculo) => (
              <article key={vinculo.id} className="vinculo-card">
                <div>
                  <strong className="item-title">{vinculo.perfis?.nome || vinculo.perfis?.email || "Usuário sem nome"}</strong>
                  <div className="item-meta">{vinculo.perfis?.email || "Sem e-mail"}</div>
                  <div className="small-line">
                    Permissão: <strong>{vinculo.permissao}</strong> · Status: <strong>{vinculo.status}</strong>
                  </div>
                </div>

                <div className="actions">
                  <select value={(vinculo.permissao || "admin") as Permissao} onChange={(e) => atualizarVinculo(vinculo, { permissao: e.target.value })} className="mini-select">
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                    <option value="visualizador">Visualizador</option>
                  </select>

                  <select value={(vinculo.status || "ativo") as Status} onChange={(e) => atualizarVinculo(vinculo, { status: e.target.value })} className="mini-select">
                    <option value="ativo">Ativo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>

                  <button onClick={() => removerVinculo(vinculo)} className="danger">Remover</button>
                </div>
              </article>
            ))}

            {clienteSelecionadoId && vinculos.length === 0 && (
              <div className="empty">Nenhum usuário vinculado a este cliente.</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Clientes cadastrados</h2>
            <p className="panel-text">Selecione um cliente para editar ou vincular usuários.</p>
          </div>
          <span className="counter">{clientesFiltrados.length} exibidos</span>
        </div>

        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, documento, telefone ou e-mail" className="input" style={{ marginTop: 16 }} />

        <div className="list">
          {clientesFiltrados.map((cliente) => {
            const selected = cliente.id === clienteSelecionadoId;

            return (
              <article key={cliente.id} className={selected ? "cliente-card selected" : "cliente-card"}>
                <div>
                  <div className="title-line">
                    <strong className="item-title">{cliente.nome}</strong>
                    <span className={cliente.status === "ativo" ? "badge-active" : "badge-blocked"}>
                      {cliente.status === "ativo" ? "Ativo" : "Bloqueado"}
                    </span>
                  </div>

                  <div className="item-meta">{cliente.email || "Sem e-mail"}</div>

                  <div className="small-line">
                    Documento: <strong>{cliente.documento || "Não informado"}</strong> · Telefone:{" "}
                    <strong>{cliente.telefone || "Não informado"}</strong> · Criado:{" "}
                    <strong>{formatarData(cliente.created_at)}</strong>
                  </div>
                </div>

                <div className="actions">
                  <button onClick={() => selecionarCliente(cliente)} className="secondary">Selecionar</button>
                  <button onClick={() => preencherForm(cliente)} className="secondary">Editar</button>

                  {cliente.status === "ativo" ? (
                    <button onClick={() => alterarStatusCliente(cliente, "bloqueado")} className="danger">Bloquear</button>
                  ) : (
                    <button onClick={() => alterarStatusCliente(cliente, "ativo")} className="approve">Liberar</button>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && clientesFiltrados.length === 0 && (
            <div className="empty">Nenhum cliente encontrado.</div>
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
    <article className="metric-card">
      <div className="metric-icon" style={{ background: bg, color }}>●</div>
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <p className="metric-detail">{detail}</p>
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
