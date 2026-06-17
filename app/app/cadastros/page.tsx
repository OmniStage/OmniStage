"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Aba = "clientes" | "fornecedores" | "equipe";

type TenantContato = {
  id: string;
  tenant_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
};

type Cadastro = {
  id: string;
  tenant_id: string;
  tipo_pessoa: string | null;
  eh_cliente: boolean;
  eh_fornecedor: boolean;
  eh_equipe: boolean;
  cpf_cnpj: string | null;
  nome: string;
  razao_social: string | null;
  telefone: string | null;
  telefone_normalizado: string | null;
  email: string | null;
  codigo_externo: string | null;
  categoria: string | null;
  plano_de_contas_padrao: string | null;
  documento_padrao: string | null;
  meio_pagamento_padrao: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  pix_tipo: string | null;
  pix_chave: string | null;
  banco: string | null;
  agencia: string | null;
  agencia_digito: string | null;
  conta: string | null;
  conta_digito: string | null;
  codigo_funcionario: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  origem_evento_id: string | null;
  nucleo_id: string | null;
  responsavel_tenant_contato_id: string | null;
};

type EventoVinculo = {
  evento_id: string;
  nome: string | null;
  data_evento: string | null;
};

type Form = {
  tipo_pessoa: string;
  eh_cliente: boolean;
  eh_fornecedor: boolean;
  eh_equipe: boolean;
  cpf_cnpj: string;
  nome: string;
  razao_social: string;
  telefone: string;
  email: string;
  codigo_externo: string;
  categoria: string;
  plano_de_contas_padrao: string;
  documento_padrao: string;
  meio_pagamento_padrao: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  pix_tipo: string;
  pix_chave: string;
  banco: string;
  agencia: string;
  agencia_digito: string;
  conta: string;
  conta_digito: string;
  codigo_funcionario: string;
  observacoes: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  responsavel_tenant_contato_id: string | null;
};

const formVazio: Form = {
  tipo_pessoa: "fisica",
  eh_cliente: false,
  eh_fornecedor: false,
  eh_equipe: false,
  cpf_cnpj: "",
  nome: "",
  razao_social: "",
  telefone: "",
  email: "",
  codigo_externo: "",
  categoria: "",
  plano_de_contas_padrao: "",
  documento_padrao: "",
  meio_pagamento_padrao: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  pix_tipo: "",
  pix_chave: "",
  banco: "",
  agencia: "",
  agencia_digito: "",
  conta: "",
  conta_digito: "",
  codigo_funcionario: "",
  observacoes: "",
  responsavel_nome: "",
  responsavel_telefone: "",
  responsavel_tenant_contato_id: null,
};

const abasModal = ["principais", "endereco", "financeiro", "observacao"] as const;
type AbaModal = typeof abasModal[number];
const abaModalLabel: Record<AbaModal, string> = {
  principais: "Dados Principais",
  endereco: "Endereço",
  financeiro: "Financeiro",
  observacao: "Observação",
};

const categorias = [
  "buffet", "foto_video", "musica", "decoracao", "espaco",
  "cerimonial", "som_iluminacao", "transporte", "grafica", "outros",
];

function normalizarTelefone(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

function mascararCep(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function mascararCnpj(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  return digitos
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function mascararCpf(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mascararTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export default function CadastrosPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [eventosPorCadastro, setEventosPorCadastro] = useState<Record<string, EventoVinculo[]>>({});
  const [nomesEventoOrigem, setNomesEventoOrigem] = useState<Record<string, string>>({});
  const [nomesNucleo, setNomesNucleo] = useState<Record<string, string>>({});
  const [nomesResponsavelContato, setNomesResponsavelContato] = useState<Record<string, string>>({});
  const [tenantContatos, setTenantContatos] = useState<TenantContato[]>([]);
  const [responsavelDropdownAberto, setResponsavelDropdownAberto] = useState(false);
  const [responsavelNovoModal, setResponsavelNovoModal] = useState(false);
  const [responsavelNovoForm, setResponsavelNovoForm] = useState({ nome: "", telefone: "", email: "" });
  const [aba, setAba] = useState<Aba>("clientes");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(formVazio);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [abaModal, setAbaModal] = useState<AbaModal>("principais");
  const [confirmarExclusao, setConfirmarExclusao] = useState<Cadastro | null>(null);

  useEffect(() => {
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inicializar() {
    setLoading(true);
    const tenant = await carregarTenant();
    if (tenant) {
      await carregarCadastros(tenant);
      const { data } = await supabase.from("tenant_contatos").select("id, tenant_id, nome, telefone, email").eq("tenant_id", tenant).order("nome");
      setTenantContatos((data || []) as TenantContato[]);
    }
    setLoading(false);
  }

  async function criarResponsavelContato() {
    if (!tenantId || !responsavelNovoForm.nome.trim()) return;
    const { data, error } = await supabase
      .from("tenant_contatos")
      .insert({ tenant_id: tenantId, nome: responsavelNovoForm.nome.trim(), telefone: responsavelNovoForm.telefone || null, email: responsavelNovoForm.email || null })
      .select()
      .single();
    if (error || !data) return;
    const contato = data as TenantContato;
    setTenantContatos((prev) => [...prev, contato]);
    setForm((prev) => ({
      ...prev,
      responsavel_nome: contato.nome,
      responsavel_telefone: contato.telefone ? mascararTelefone(contato.telefone) : "",
      responsavel_tenant_contato_id: contato.id,
    }));
    setResponsavelNovoModal(false);
    setResponsavelNovoForm({ nome: "", telefone: "", email: "" });
  }

  async function carregarTenant() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro("Usuário não autenticado."); return null; }
    const { data, error } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();
    if (error || !data?.tenant_id) { setErro("Empresa ativa não encontrada."); return null; }
    setTenantId(data.tenant_id);
    return data.tenant_id as string;
  }

  async function carregarCadastros(tenant: string) {
    const { data, error } = await supabase
      .from("organizacao_cadastros")
      .select("*")
      .eq("tenant_id", tenant)
      .order("nome", { ascending: true });
    if (error) { setErro("Erro ao carregar cadastros: " + error.message); return; }
    const lista = (data || []) as Cadastro[];
    setCadastros(lista);

    const idsOrigem = Array.from(new Set(lista.map((c) => c.origem_evento_id).filter(Boolean))) as string[];
    if (idsOrigem.length > 0) {
      const { data: eventosOrigem } = await supabase
        .from("eventos")
        .select("id, nome")
        .in("id", idsOrigem);
      const mapa: Record<string, string> = {};
      (eventosOrigem || []).forEach((ev: any) => { mapa[ev.id] = ev.nome; });
      setNomesEventoOrigem(mapa);
    }

    const idsNucleo = Array.from(new Set(lista.map((c) => c.nucleo_id).filter(Boolean))) as string[];
    if (idsNucleo.length > 0) {
      const { data: nucleos } = await supabase
        .from("contato_grupos")
        .select("id, nome")
        .in("id", idsNucleo);
      const mapaNucleo: Record<string, string> = {};
      (nucleos || []).forEach((n: any) => { mapaNucleo[n.id] = n.nome; });
      setNomesNucleo(mapaNucleo);
    }

    const idsResponsavel = Array.from(new Set(lista.map((c) => c.responsavel_tenant_contato_id).filter(Boolean))) as string[];
    if (idsResponsavel.length > 0) {
      const { data: contatos } = await supabase
        .from("tenant_contatos")
        .select("id, nome")
        .in("id", idsResponsavel);
      const mapaContato: Record<string, string> = {};
      (contatos || []).forEach((c: any) => { mapaContato[c.id] = c.nome; });
      setNomesResponsavelContato(mapaContato);
    }
  }

  async function carregarEventosVinculados(cadastro: Cadastro) {
    if (eventosPorCadastro[cadastro.id]) return;
    const vinculos: EventoVinculo[] = [];

    if (cadastro.eh_fornecedor) {
      const { data } = await supabase
        .from("organizacao_fornecedores_evento")
        .select("evento_id, eventos(nome, data_evento)")
        .eq("cadastro_id", cadastro.id);
      (data || []).forEach((v: any) => {
        const ev = Array.isArray(v.eventos) ? v.eventos[0] : v.eventos;
        vinculos.push({ evento_id: v.evento_id, nome: ev?.nome ?? null, data_evento: ev?.data_evento ?? null });
      });
    }

    if (cadastro.eh_equipe) {
      const { data } = await supabase
        .from("organizacao_equipe")
        .select("evento_id, eventos(nome, data_evento)")
        .eq("cadastro_id", cadastro.id);
      (data || []).forEach((v: any) => {
        const ev = Array.isArray(v.eventos) ? v.eventos[0] : v.eventos;
        vinculos.push({ evento_id: v.evento_id, nome: ev?.nome ?? null, data_evento: ev?.data_evento ?? null });
      });
    }

    if (cadastro.eh_cliente) {
      const { data } = await supabase
        .from("eventos")
        .select("id, nome, data_evento")
        .eq("cadastro_cliente_id", cadastro.id);
      (data || []).forEach((ev: any) => {
        vinculos.push({ evento_id: ev.id, nome: ev.nome, data_evento: ev.data_evento });
      });
    }

    setEventosPorCadastro((prev) => ({ ...prev, [cadastro.id]: vinculos }));
  }

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) { setErro("Informe um CEP válido (8 dígitos)."); return; }
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade ? `${data.localidade} - ${data.uf}` : prev.cidade,
        }));
        return;
      }

      const resAlt = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (!resAlt.ok) { setErro("CEP não encontrado."); return; }
      const dataAlt = await resAlt.json();
      setForm((prev) => ({
        ...prev,
        logradouro: dataAlt.street || prev.logradouro,
        bairro: dataAlt.neighborhood || prev.bairro,
        cidade: dataAlt.city ? `${dataAlt.city} - ${dataAlt.state}` : prev.cidade,
      }));
    } catch {
      setErro("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function buscarCnpj() {
    const cnpj = form.cpf_cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) { setErro("Informe um CNPJ válido (14 dígitos) para buscar."); return; }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) { setErro("CNPJ não encontrado."); return; }
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        tipo_pessoa: "juridica",
        nome: data.nome_fantasia || data.razao_social || prev.nome,
        razao_social: data.razao_social || prev.razao_social,
        telefone: data.ddd_telefone_1 ? mascararTelefone(data.ddd_telefone_1) : prev.telefone,
        email: data.email || prev.email,
        cep: data.cep ? mascararCep(data.cep) : prev.cep,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.municipio ? `${data.municipio} - ${data.uf}` : prev.cidade,
      }));
    } catch {
      setErro("Erro ao buscar CNPJ.");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  function abrirCriar() {
    setForm({
      ...formVazio,
      eh_cliente: aba === "clientes",
      eh_fornecedor: aba === "fornecedores",
      eh_equipe: aba === "equipe",
    });
    setEditandoId(null);
    setAbaModal("principais");
    setModal("criar");
  }

  function abrirEditar(c: Cadastro) {
    setForm({
      tipo_pessoa: c.tipo_pessoa || "fisica",
      eh_cliente: c.eh_cliente,
      eh_fornecedor: c.eh_fornecedor,
      eh_equipe: c.eh_equipe,
      cpf_cnpj: c.cpf_cnpj ? ((c.tipo_pessoa || "fisica") === "juridica" ? mascararCnpj(c.cpf_cnpj) : mascararCpf(c.cpf_cnpj)) : "",
      nome: c.nome,
      razao_social: c.razao_social || "",
      telefone: c.telefone ? mascararTelefone(c.telefone) : "",
      email: c.email || "",
      codigo_externo: c.codigo_externo || "",
      categoria: c.categoria || "",
      plano_de_contas_padrao: c.plano_de_contas_padrao || "",
      documento_padrao: c.documento_padrao || "",
      meio_pagamento_padrao: c.meio_pagamento_padrao || "",
      cep: c.cep ? mascararCep(c.cep) : "",
      logradouro: c.logradouro || "",
      numero: c.numero || "",
      complemento: c.complemento || "",
      bairro: c.bairro || "",
      cidade: c.cidade || "",
      pix_tipo: c.pix_tipo || "",
      pix_chave: c.pix_chave || "",
      banco: c.banco || "",
      agencia: c.agencia || "",
      agencia_digito: c.agencia_digito || "",
      conta: c.conta || "",
      conta_digito: c.conta_digito || "",
      codigo_funcionario: c.codigo_funcionario || "",
      observacoes: c.observacoes || "",
      responsavel_nome: c.responsavel_tenant_contato_id ? (nomesResponsavelContato[c.responsavel_tenant_contato_id] || "") : "",
      responsavel_telefone: (() => { const ct = tenantContatos.find((t) => t.id === c.responsavel_tenant_contato_id); return ct?.telefone ? mascararTelefone(ct.telefone) : ""; })(),
      responsavel_tenant_contato_id: c.responsavel_tenant_contato_id || null,
    });
    setEditandoId(c.id);
    setAbaModal("principais");
    setModal("editar");
  }

  async function salvar() {
    if (!tenantId || !form.nome.trim()) { setErro("Informe o nome."); return; }
    if (!form.eh_cliente && !form.eh_fornecedor && !form.eh_equipe) {
      setErro("Selecione ao menos um tipo: Cliente, Fornecedor ou Equipe.");
      return;
    }
    const payload = {
      tenant_id: tenantId,
      tipo_pessoa: form.tipo_pessoa,
      eh_cliente: form.eh_cliente,
      eh_fornecedor: form.eh_fornecedor,
      eh_equipe: form.eh_equipe,
      cpf_cnpj: form.cpf_cnpj || null,
      nome: form.nome.trim(),
      razao_social: form.razao_social || null,
      telefone: form.telefone || null,
      telefone_normalizado: form.telefone ? normalizarTelefone(form.telefone) : null,
      email: form.email || null,
      codigo_externo: form.codigo_externo || null,
      categoria: form.categoria || null,
      plano_de_contas_padrao: form.plano_de_contas_padrao || null,
      documento_padrao: form.documento_padrao || null,
      meio_pagamento_padrao: form.meio_pagamento_padrao || null,
      cep: form.cep || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      pix_tipo: form.pix_tipo || null,
      pix_chave: form.pix_chave || null,
      banco: form.banco || null,
      agencia: form.agencia || null,
      agencia_digito: form.agencia_digito || null,
      conta: form.conta || null,
      conta_digito: form.conta_digito || null,
      codigo_funcionario: form.codigo_funcionario || null,
      observacoes: form.observacoes || null,
      responsavel_tenant_contato_id: form.responsavel_tenant_contato_id || null,
    };

    if (editandoId) {
      const { error } = await supabase.from("organizacao_cadastros").update(payload).eq("id", editandoId);
      if (error) { setErro("Erro ao salvar: " + error.message); return; }
    } else {
      const { error } = await supabase.from("organizacao_cadastros").insert(payload);
      if (error) { setErro("Erro ao criar: " + error.message); return; }
    }
    setModal(null);
    setErro(null);
    if (tenantId) await carregarCadastros(tenantId);
  }

  async function excluir(c: Cadastro) {
    const { error } = await supabase.from("organizacao_cadastros").delete().eq("id", c.id);
    if (error) { setErro("Erro ao excluir: " + error.message); setConfirmarExclusao(null); return; }
    setCadastros((prev) => prev.filter((item) => item.id !== c.id));
    setConfirmarExclusao(null);
  }

  const listaFiltrada = useMemo(() => {
    const campo = aba === "clientes" ? "eh_cliente" : aba === "fornecedores" ? "eh_fornecedor" : "eh_equipe";
    const termo = busca.trim().toLowerCase();
    return cadastros
      .filter((c) => c[campo])
      .filter((c) => {
        if (!termo) return true;
        return (
          c.nome.toLowerCase().includes(termo) ||
          (c.cpf_cnpj || "").toLowerCase().includes(termo) ||
          (c.email || "").toLowerCase().includes(termo) ||
          (c.telefone || "").toLowerCase().includes(termo)
        );
      });
  }, [cadastros, aba, busca]);

  const totalClientes = useMemo(() => cadastros.filter((c) => c.eh_cliente).length, [cadastros]);
  const totalFornecedores = useMemo(() => cadastros.filter((c) => c.eh_fornecedor).length, [cadastros]);
  const totalEquipe = useMemo(() => cadastros.filter((c) => c.eh_equipe).length, [cadastros]);
  const totalAmbos = useMemo(
    () => cadastros.filter((c) => Number(c.eh_cliente) + Number(c.eh_fornecedor) + Number(c.eh_equipe) > 1).length,
    [cadastros]
  );

  return (
    <main style={pageStyle}>
      <section style={heroCardStyle}>
        <div>
          <div style={eyebrowStyle}>OmniStage</div>
          <h1 style={pageTitleStyle}>Clientes / Fornecedores</h1>
          <p style={pageSubtitleStyle}>
            Cadastro central de clientes, fornecedores e equipe. Um mesmo cadastro pode acumular
            mais de um papel — use em Organização sem precisar recriar nada.
          </p>
        </div>

        <div style={tabsStyle}>
          <button type="button" onClick={() => setAba("clientes")} style={aba === "clientes" ? tabActiveStyle : tabStyle}>
            Clientes
          </button>
          <button type="button" onClick={() => setAba("fornecedores")} style={aba === "fornecedores" ? tabActiveStyle : tabStyle}>
            Fornecedores
          </button>
          <button type="button" onClick={() => setAba("equipe")} style={aba === "equipe" ? tabActiveStyle : tabStyle}>
            Equipe
          </button>
        </div>
      </section>

      <section style={metricsGridStyle}>
        <MetricCard label="Clientes" value={totalClientes} />
        <MetricCard label="Fornecedores" value={totalFornecedores} />
        <MetricCard label="Equipe" value={totalEquipe} />
        <MetricCard label="Com mais de um papel" value={totalAmbos} />
      </section>

      {erro && (
        <div style={erroStyle}>
          {erro}
          <button type="button" onClick={() => setErro(null)} style={erroFecharStyle}>×</button>
        </div>
      )}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={cardTitleStyle}>
              {aba === "clientes" ? "Clientes" : aba === "fornecedores" ? "Fornecedores" : "Equipe"}
            </h2>
            <p style={sectionSubtitleStyle}>
              {aba === "clientes"
                ? "Quem contrata seus eventos."
                : aba === "fornecedores"
                ? "Quem você contrata para os eventos."
                : "Pessoas da sua operação."}
            </p>
          </div>
          <button type="button" onClick={abrirCriar} style={buttonStyle}>
            + Novo {aba === "clientes" ? "cliente" : aba === "fornecedores" ? "fornecedor" : "membro"}
          </button>
        </div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, documento, telefone ou e-mail..."
          style={inputStyle}
        />

        {loading && <div style={emptyStyle}>Carregando...</div>}
        {!loading && listaFiltrada.length === 0 && <div style={emptyStyle}>Nenhum registro encontrado.</div>}

        {!loading && (
          <div style={listStyle}>
            {listaFiltrada.map((c) => {
              const papeis = [
                c.eh_cliente && "Cliente",
                c.eh_fornecedor && "Fornecedor",
                c.eh_equipe && "Equipe",
              ].filter(Boolean) as string[];
              const aberto = expandido === c.id;
              return (
                <article key={c.id} style={rowCardStyle}>
                  <div style={rowCardMainStyle}>
                    <div style={avatarStyle}>{c.nome.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 16 }}>{c.nome}</strong>
                        {papeis.map((p) => (
                          <span key={p} style={badgeStyle}>{p}</span>
                        ))}
                        {c.categoria && <span style={badgeMutedStyle}>{c.categoria}</span>}
                      </div>
                      <div style={metaLineStyle}>
                        {c.cpf_cnpj && <span>{c.cpf_cnpj}</span>}
                        {c.telefone && <span>{c.telefone}</span>}
                        {c.email && <span>{c.email}</span>}
                      </div>
                      {c.origem_evento_id && (
                        <div style={origemStyle}>
                          📍 Cadastrado a partir do evento: {nomesEventoOrigem[c.origem_evento_id] || "..."}
                        </div>
                      )}
                      {c.responsavel_tenant_contato_id && (
                        <div style={origemStyle}>
                          👤 Responsável: {nomesResponsavelContato[c.responsavel_tenant_contato_id] || "..."}
                          {tenantContatos.find((t) => t.id === c.responsavel_tenant_contato_id)?.telefone && (
                            <> · {mascararTelefone(tenantContatos.find((t) => t.id === c.responsavel_tenant_contato_id)!.telefone!)}</>
                          )}
                        </div>
                      )}
                      {c.nucleo_id && (
                        <div style={origemStyle}>
                          🏢 Núcleo: {nomesNucleo[c.nucleo_id] || "..."}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={rowActionsStyle}>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => {
                        if (!aberto) carregarEventosVinculados(c);
                        setExpandido(aberto ? null : c.id);
                      }}
                    >
                      {aberto ? "Ocultar eventos" : "Ver eventos"}
                    </button>
                    <button type="button" style={secondaryButtonStyle} onClick={() => abrirEditar(c)}>Editar</button>
                    <button type="button" style={dangerButtonStyle} onClick={() => setConfirmarExclusao(c)}>Excluir</button>
                  </div>

                  {aberto && (
                    <div style={eventosListStyle}>
                      {(eventosPorCadastro[c.id] || []).length === 0 ? (
                        <span style={{ color: "var(--muted)", fontSize: 13 }}>Nenhum evento vinculado ainda.</span>
                      ) : (
                        (eventosPorCadastro[c.id] || []).map((v) => (
                          <span key={v.evento_id} style={eventoPillStyle}>
                            {v.nome || "Evento"}{v.data_evento ? ` · ${new Date(v.data_evento + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0 }}>{editandoId ? "Editar cadastro" : "Novo cadastro"}</h3>
              <button type="button" onClick={() => setModal(null)} style={modalCloseStyle}>×</button>
            </div>

            <div style={modalTabsStyle}>
              {abasModal.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAbaModal(a)}
                  style={abaModal === a ? modalTabActiveStyle : modalTabStyle}
                >
                  {abaModalLabel[a]}
                </button>
              ))}
            </div>

            {abaModal === "principais" && (
              <>
                <div style={fieldRowStyle}>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={form.eh_cliente} onChange={(e) => setForm({ ...form, eh_cliente: e.target.checked })} />
                    Cliente
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={form.eh_fornecedor} onChange={(e) => setForm({ ...form, eh_fornecedor: e.target.checked })} />
                    Fornecedor
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={form.eh_equipe} onChange={(e) => setForm({ ...form, eh_equipe: e.target.checked })} />
                    Equipe
                  </label>
                </div>

                <div style={fieldRowStyle}>
                  <Campo label="Tipo de pessoa">
                    <select value={form.tipo_pessoa} onChange={(e) => setForm({ ...form, tipo_pessoa: e.target.value })} style={selectStyle}>
                      <option value="fisica">Pessoa Física</option>
                      <option value="juridica">Pessoa Jurídica</option>
                    </select>
                  </Campo>
                  <Campo label={form.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={form.cpf_cnpj}
                        onChange={(e) => setForm({ ...form, cpf_cnpj: form.tipo_pessoa === "juridica" ? mascararCnpj(e.target.value) : mascararCpf(e.target.value) })}
                        placeholder={form.tipo_pessoa === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                        maxLength={form.tipo_pessoa === "juridica" ? 18 : 14}
                        style={{ ...inputModalStyle, marginBottom: 0, flex: 1 }}
                      />
                      {form.tipo_pessoa === "juridica" && (
                        <button type="button" onClick={buscarCnpj} disabled={buscandoCnpj} style={buscarButtonStyle}>
                          {buscandoCnpj ? "..." : "Buscar"}
                        </button>
                      )}
                    </div>
                  </Campo>
                </div>

                <Campo label="Nome *">
                  <input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    style={inputModalStyle}
                  />
                </Campo>

                {form.tipo_pessoa === "juridica" && (
                  <Campo label="Razão social">
                    <input
                      value={form.razao_social}
                      onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                )}

                <div style={fieldRowStyle}>
                  <Campo label="Telefone / WhatsApp">
                    <input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: mascararTelefone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      style={inputModalStyle}
                    />
                  </Campo>
                  <Campo label="E-mail">
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                </div>

                <div style={fieldRowStyle}>
                  <Campo label="Responsável / Contato">
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <input
                          value={form.responsavel_nome}
                          onChange={(e) => {
                            setForm({ ...form, responsavel_nome: e.target.value, responsavel_tenant_contato_id: null });
                            setResponsavelDropdownAberto(true);
                          }}
                          onFocus={() => setResponsavelDropdownAberto(true)}
                          onBlur={() => setTimeout(() => setResponsavelDropdownAberto(false), 150)}
                          placeholder="Buscar contato..."
                          style={{ ...inputModalStyle, marginBottom: 0 }}
                        />
                        {responsavelDropdownAberto && form.responsavel_nome.trim().length >= 1 && (() => {
                          const termo = form.responsavel_nome.trim().toLowerCase();
                          const filtrados = tenantContatos.filter((c) => c.nome.toLowerCase().includes(termo));
                          if (filtrados.length === 0) return null;
                          return (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.2)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                              {filtrados.map((c) => (
                                <div key={c.id}
                                  onMouseDown={() => {
                                    setForm((prev) => ({ ...prev, responsavel_nome: c.nome, responsavel_telefone: c.telefone ? mascararTelefone(c.telefone) : "", responsavel_tenant_contato_id: c.id }));
                                    setResponsavelDropdownAberto(false);
                                  }}
                                  style={{ padding: "9px 14px", fontSize: 13, color: "var(--text)", cursor: "pointer", borderBottom: "1px solid var(--line)" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-soft)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                  {c.nome}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <button type="button"
                        title="Cadastrar novo contato"
                        onClick={() => { setResponsavelNovoForm({ nome: "", telefone: "", email: "" }); setResponsavelNovoModal(true); }}
                        style={{ padding: "9px 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-strong, var(--card))", color: "var(--primary)", cursor: "pointer", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                        +
                      </button>
                    </div>
                  </Campo>
                  <Campo label="Telefone do responsável">
                    <input
                      value={form.responsavel_telefone}
                      onChange={(e) => setForm({ ...form, responsavel_telefone: mascararTelefone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      readOnly={!!form.responsavel_tenant_contato_id}
                      style={{ ...inputModalStyle, ...(form.responsavel_tenant_contato_id ? { opacity: 0.75 } : {}) }}
                    />
                  </Campo>
                </div>

                {responsavelNovoModal && (
                  <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 14, background: "var(--card-strong, var(--card))" }}>
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 10, color: "var(--text)" }}>Novo contato</div>
                    <div style={fieldRowStyle}>
                      <input value={responsavelNovoForm.nome} onChange={(e) => setResponsavelNovoForm({ ...responsavelNovoForm, nome: e.target.value })} placeholder="Nome *" style={inputModalStyle} />
                      <input value={responsavelNovoForm.telefone} onChange={(e) => setResponsavelNovoForm({ ...responsavelNovoForm, telefone: mascararTelefone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} style={inputModalStyle} />
                    </div>
                    <input value={responsavelNovoForm.email} onChange={(e) => setResponsavelNovoForm({ ...responsavelNovoForm, email: e.target.value })} placeholder="E-mail" style={inputModalStyle} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setResponsavelNovoModal(false)} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Cancelar</button>
                      <button type="button" onClick={criarResponsavelContato} disabled={!responsavelNovoForm.nome.trim()} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>Salvar contato</button>
                    </div>
                  </div>
                )}

                <div style={fieldRowStyle}>
                  <Campo label="Código externo">
                    <input
                      value={form.codigo_externo}
                      onChange={(e) => setForm({ ...form, codigo_externo: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                  {form.eh_fornecedor ? (
                    <Campo label="Categoria">
                      <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={selectStyle}>
                        <option value="">Selecione...</option>
                        {categorias.map((c) => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </Campo>
                  ) : form.eh_equipe ? (
                    <Campo label="Código do funcionário">
                      <input
                        value={form.codigo_funcionario}
                        onChange={(e) => setForm({ ...form, codigo_funcionario: e.target.value })}
                        style={inputModalStyle}
                      />
                    </Campo>
                  ) : <div />}
                </div>

                <Campo label="Plano de contas padrão">
                  <input
                    value={form.plano_de_contas_padrao}
                    onChange={(e) => setForm({ ...form, plano_de_contas_padrao: e.target.value })}
                    style={inputModalStyle}
                  />
                </Campo>

                <div style={fieldRowStyle}>
                  <Campo label="Documento padrão">
                    <select value={form.documento_padrao} onChange={(e) => setForm({ ...form, documento_padrao: e.target.value })} style={selectStyle}>
                      <option value="">Selecione...</option>
                      <option value="boleto">Boleto</option>
                      <option value="comprovante">Comprovante</option>
                      <option value="cupom_fiscal">Cupom Fiscal</option>
                      <option value="duplicata">Duplicata</option>
                      <option value="nota_fiscal">Nota Fiscal</option>
                      <option value="previsao">Previsão</option>
                      <option value="outros">Outros</option>
                    </select>
                  </Campo>
                  <Campo label="Meio de pagamento padrão">
                    <select value={form.meio_pagamento_padrao} onChange={(e) => setForm({ ...form, meio_pagamento_padrao: e.target.value })} style={selectStyle}>
                      <option value="">Selecione...</option>
                      <option value="pix">PIX</option>
                      <option value="ted">TED</option>
                      <option value="boleto">Boleto</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </Campo>
                </div>
              </>
            )}

            {abaModal === "endereco" && (
              <>
                <div style={fieldRowStyle}>
                  <Campo label="CEP">
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={form.cep}
                        onChange={(e) => setForm({ ...form, cep: mascararCep(e.target.value) })}
                        placeholder="00000-000"
                        maxLength={9}
                        style={{ ...inputModalStyle, marginBottom: 0, flex: 1 }}
                      />
                      <button type="button" onClick={buscarCep} disabled={buscandoCep} style={buscarButtonStyle}>
                        {buscandoCep ? "..." : "Buscar"}
                      </button>
                    </div>
                  </Campo>
                  <Campo label="Logradouro">
                    <input
                      value={form.logradouro}
                      onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                </div>
                <div style={fieldRowStyle}>
                  <Campo label="Número">
                    <input
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                  <Campo label="Complemento">
                    <input
                      value={form.complemento}
                      onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                </div>
                <div style={fieldRowStyle}>
                  <Campo label="Bairro">
                    <input
                      value={form.bairro}
                      onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                  <Campo label="Cidade">
                    <input
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                </div>
              </>
            )}

            {abaModal === "financeiro" && (
              <>
                <div style={fieldRowStyle}>
                  <Campo label="Tipo da chave PIX">
                    <select value={form.pix_tipo} onChange={(e) => setForm({ ...form, pix_tipo: e.target.value })} style={selectStyle}>
                      <option value="">Selecione...</option>
                      <option value="cpf_cnpj">CPF/CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Aleatória</option>
                    </select>
                  </Campo>
                  <Campo label="Chave PIX">
                    <input
                      value={form.pix_chave}
                      onChange={(e) => setForm({ ...form, pix_chave: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                </div>
                <Campo label="Banco">
                  <input
                    value={form.banco}
                    onChange={(e) => setForm({ ...form, banco: e.target.value })}
                    style={inputModalStyle}
                  />
                </Campo>
                <div style={fieldRowStyle}>
                  <Campo label="Agência">
                    <input
                      value={form.agencia}
                      onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                  <Campo label="Dígito da agência">
                    <input
                      value={form.agencia_digito}
                      onChange={(e) => setForm({ ...form, agencia_digito: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                </div>
                <div style={fieldRowStyle}>
                  <Campo label="Conta">
                    <input
                      value={form.conta}
                      onChange={(e) => setForm({ ...form, conta: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                  <Campo label="Dígito da conta">
                    <input
                      value={form.conta_digito}
                      onChange={(e) => setForm({ ...form, conta_digito: e.target.value })}
                      style={inputModalStyle}
                    />
                  </Campo>
                </div>
              </>
            )}

            {abaModal === "observacao" && (
              <Campo label="Observações">
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={6}
                  style={textareaModalStyle}
                />
              </Campo>
            )}

            <div style={modalActionsStyle}>
              <button type="button" onClick={() => setModal(null)} style={secondaryButtonStyle}>Cancelar</button>
              <button type="button" onClick={salvar} style={buttonStyle}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {confirmarExclusao && (
        <div style={modalOverlayStyle}>
          <div style={confirmCardStyle}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
            <p style={{ fontWeight: 700, marginBottom: 20 }}>
              Excluir o cadastro de "{confirmarExclusao.nome}"? Essa ação não pode ser desfeita.
            </p>
            <div style={modalActionsStyle}>
              <button type="button" onClick={() => setConfirmarExclusao(null)} style={secondaryButtonStyle}>Cancelar</button>
              <button type="button" onClick={() => excluir(confirmarExclusao)} style={dangerButtonStyle}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={campoWrapperStyle}>
      <span style={campoLabelStyle}>{label}</span>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={metricCardStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <span style={metricValueStyle}>{value}</span>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "clamp(14px, 3vw, 24px)",
  background: "var(--bg)",
  color: "var(--text)",
};

const heroCardStyle: CSSProperties = {
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "var(--shadow-card)",
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-end",
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 38,
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const pageSubtitleStyle: CSSProperties = {
  color: "var(--muted)",
  margin: "10px 0 0",
  fontSize: 17,
  lineHeight: 1.45,
  maxWidth: 780,
};

const tabsStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };

const tabStyle: CSSProperties = {
  minHeight: 48,
  padding: "12px 18px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--muted)",
  fontWeight: 950,
  cursor: "pointer",
};

const tabActiveStyle: CSSProperties = {
  ...tabStyle,
  background: "var(--primary-soft)",
  color: "var(--primary)",
};

const metricsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  gap: 14,
  marginTop: 18,
};

const metricCardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 22,
  background: "var(--card)",
  border: "1px solid var(--line)",
  boxShadow: "var(--shadow-card)",
};

const metricLabelStyle: CSSProperties = {
  display: "block",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const metricValueStyle: CSSProperties = {
  display: "block",
  marginTop: 8,
  color: "var(--text)",
  fontSize: 30,
  fontWeight: 950,
};

const sectionStyle: CSSProperties = {
  marginTop: 18,
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "clamp(22px, 4vw, 34px)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  boxShadow: "var(--shadow-card)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
  flexWrap: "wrap",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 54,
  padding: "0 18px",
  borderRadius: 18,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  fontSize: 15,
  fontWeight: 700,
  outline: "none",
  marginBottom: 18,
};

const buttonStyle: CSSProperties = {
  padding: "14px 20px",
  minHeight: 52,
  borderRadius: 999,
  background: "var(--primary)",
  border: "none",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  minHeight: 42,
  borderRadius: 999,
  background: "var(--card)",
  border: "1px solid var(--line)",
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  border: "1px solid rgba(220,38,38,0.24)",
  color: "var(--red)",
  background: "var(--red-soft, rgba(220,38,38,0.08))",
};

const listStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 12 };

const rowCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  borderRadius: 18,
  border: "1px solid var(--line)",
  background: "var(--card-strong, var(--card))",
};

const rowCardMainStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 14 };

const rowActionsStyle: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };

const avatarStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: "var(--primary-soft)",
  color: "var(--primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 17,
  flexShrink: 0,
};

const metaLineStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 4,
  color: "var(--muted)",
  fontSize: 13,
};

const origemStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "var(--primary)",
  fontWeight: 700,
};

const badgeStyle: CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontSize: 11,
  fontWeight: 900,
};

const badgeMutedStyle: CSSProperties = {
  ...badgeStyle,
  background: "var(--line)",
  color: "var(--muted)",
};

const eventosListStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  paddingTop: 8,
  borderTop: "1px solid var(--line)",
};

const eventoPillStyle: CSSProperties = {
  padding: "5px 12px",
  borderRadius: 999,
  background: "var(--bg)",
  border: "1px solid var(--line)",
  fontSize: 12,
  color: "var(--text)",
};

const emptyStyle: CSSProperties = {
  textAlign: "center",
  padding: 40,
  color: "var(--muted)",
  fontWeight: 700,
};

const erroStyle: CSSProperties = {
  marginTop: 14,
  padding: "12px 16px",
  borderRadius: 14,
  background: "rgba(220,38,38,0.08)",
  border: "1px solid rgba(220,38,38,0.24)",
  color: "var(--red)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
};

const erroFecharStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--red)",
  fontSize: 18,
  cursor: "pointer",
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  zIndex: 2000,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "24px 16px",
  overflowY: "auto",
};

const modalCardStyle: CSSProperties = {
  background: "var(--card)",
  borderRadius: 20,
  padding: "26px 24px",
  width: "100%",
  maxWidth: 560,
  boxShadow: "0 24px 60px rgba(0,0,0,.3)",
};

const confirmCardStyle: CSSProperties = {
  ...modalCardStyle,
  maxWidth: 380,
  textAlign: "center",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
};

const modalTabsStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  marginBottom: 18,
  borderBottom: "1px solid var(--line)",
  flexWrap: "wrap",
};

const modalTabStyle: CSSProperties = {
  padding: "8px 14px",
  border: "none",
  borderBottom: "2px solid transparent",
  background: "none",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const modalTabActiveStyle: CSSProperties = {
  ...modalTabStyle,
  color: "var(--primary)",
  borderBottom: "2px solid var(--primary)",
};

const buscarButtonStyle: CSSProperties = {
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const modalCloseStyle: CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 22,
  color: "var(--muted)",
  cursor: "pointer",
  lineHeight: 1,
};

const fieldRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 12,
};

const campoWrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const campoLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const checkboxLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text)",
};

const inputModalStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--card-strong, var(--card))",
  color: "var(--text)",
  border: "1px solid var(--line)",
  fontSize: 14,
  outline: "none",
  marginBottom: 12,
};

const selectStyle: CSSProperties = { ...inputModalStyle };

const textareaModalStyle: CSSProperties = {
  ...inputModalStyle,
  resize: "vertical",
  fontFamily: "inherit",
};

const modalActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 8,
};
