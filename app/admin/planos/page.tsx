"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number | null;
  limite_eventos: number | null;
  limite_convidados: number | null;
  limite_usuarios: number | null;
  validade_dias: number | null;
  permite_convite_digital: boolean | null;
  permite_dashboard: boolean | null;
  permite_lista_presentes: boolean | null;
  permite_whatsapp: boolean | null;
  permite_checkin: boolean | null;
  checkin_manual: boolean | null;
  checkin_qrcode: boolean | null;
  permite_rede: boolean | null;
  permite_multiplos_eventos: boolean | null;
  ativo: boolean | null;
};

const planoInicial = {
  nome: "",
  descricao: "",
  preco_mensal: 0,
  limite_eventos: 1,
  limite_convidados: 200,
  limite_usuarios: 1,
  validade_dias: 30,
  permite_convite_digital: true,
  permite_dashboard: true,
  permite_lista_presentes: false,
  permite_whatsapp: false,
  permite_checkin: false,
  checkin_manual: true,
  checkin_qrcode: false,
  permite_rede: false,
  permite_multiplos_eventos: false,
  ativo: true,
};

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [form, setForm] = useState<any>(planoInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const planosOrdenados = useMemo(() => {
    return [...planos].sort(
      (a, b) => Number(a.preco_mensal || 0) - Number(b.preco_mensal || 0),
    );
  }, [planos]);

  async function carregarPlanos() {
    const { data, error } = await supabase
      .from("planos")
      .select("*")
      .order("preco_mensal", { ascending: true });

    if (error) {
      alert("Erro ao carregar planos: " + error.message);
      return;
    }

    setPlanos((data || []) as Plano[]);
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  function atualizarCampo(campo: string, valor: any) {
    setForm((atual: any) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function novoPlano() {
    setForm(planoInicial);
    setEditandoId(null);
    setFormAberto(true);
  }

  function editarPlano(plano: Plano) {
    setForm({
      nome: plano.nome || "",
      descricao: plano.descricao || "",
      preco_mensal: plano.preco_mensal || 0,
      limite_eventos: plano.limite_eventos || 1,
      limite_convidados: plano.limite_convidados || 200,
      limite_usuarios: plano.limite_usuarios || 1,
      validade_dias: plano.validade_dias || 30,
      permite_convite_digital: Boolean(plano.permite_convite_digital),
      permite_dashboard: Boolean(plano.permite_dashboard),
      permite_lista_presentes: Boolean(plano.permite_lista_presentes),
      permite_whatsapp: Boolean(plano.permite_whatsapp),
      permite_checkin: Boolean(plano.permite_checkin),
      checkin_manual: Boolean(plano.checkin_manual),
      checkin_qrcode: Boolean(plano.checkin_qrcode),
      permite_rede: Boolean(plano.permite_rede),
      permite_multiplos_eventos: Boolean(plano.permite_multiplos_eventos),
      ativo: Boolean(plano.ativo),
    });

    setEditandoId(plano.id);
    setFormAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarPlano() {
    if (!form.nome.trim()) {
      alert("Digite o nome do plano.");
      return;
    }

    setLoading(true);

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao?.trim() || null,
      preco_mensal: Number(form.preco_mensal || 0),
      limite_eventos: Number(form.limite_eventos || 0),
      limite_convidados: Number(form.limite_convidados || 0),
      limite_usuarios: Number(form.limite_usuarios || 0),
      validade_dias: Number(form.validade_dias || 0),
      permite_convite_digital: Boolean(form.permite_convite_digital),
      permite_dashboard: Boolean(form.permite_dashboard),
      permite_lista_presentes: Boolean(form.permite_lista_presentes),
      permite_whatsapp: Boolean(form.permite_whatsapp),
      permite_checkin: Boolean(form.permite_checkin),
      checkin_manual: Boolean(form.checkin_manual),
      checkin_qrcode: Boolean(form.checkin_qrcode),
      permite_rede: Boolean(form.permite_rede),
      permite_multiplos_eventos: Boolean(form.permite_multiplos_eventos),
      ativo: Boolean(form.ativo),
    };

    const { error } = editandoId
      ? await supabase.from("planos").update(payload).eq("id", editandoId)
      : await supabase.from("planos").insert(payload);

    setLoading(false);

    if (error) {
      alert("Erro ao salvar plano: " + error.message);
      return;
    }

    alert(editandoId ? "Plano atualizado." : "Plano criado.");
    setForm(planoInicial);
    setEditandoId(null);
    setFormAberto(false);
    await carregarPlanos();
  }

  async function alternarAtivo(plano: Plano) {
    const { error } = await supabase
      .from("planos")
      .update({ ativo: !plano.ativo })
      .eq("id", plano.id);

    if (error) {
      alert("Erro ao alterar status: " + error.message);
      return;
    }

    await carregarPlanos();
  }

  return (
    <main style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Planos</h1>
          <p style={subtitleStyle}>
            Configure limites, permissões e recursos liberados para cada cliente.
          </p>
        </div>

        <button onClick={novoPlano} style={primaryButtonStyle}>
          + Novo plano
        </button>
      </div>

      {formAberto && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ margin: 0 }}>
              {editandoId ? "Editar plano" : "Criar plano"}
            </h2>

            <button
              onClick={() => {
                setFormAberto(false);
                setEditandoId(null);
                setForm(planoInicial);
              }}
              style={secondaryButtonStyle}
            >
              Fechar
            </button>
          </div>

          <div style={formGridStyle}>
            <CampoTexto label="Nome" value={form.nome} onChange={(v) => atualizarCampo("nome", v)} />
            <CampoNumero label="Preço mensal" value={form.preco_mensal} onChange={(v) => atualizarCampo("preco_mensal", v)} />
            <CampoNumero label="Validade em dias" value={form.validade_dias} onChange={(v) => atualizarCampo("validade_dias", v)} />
            <CampoNumero label="Limite de eventos" value={form.limite_eventos} onChange={(v) => atualizarCampo("limite_eventos", v)} />
            <CampoNumero label="Limite de convidados" value={form.limite_convidados} onChange={(v) => atualizarCampo("limite_convidados", v)} />
            <CampoNumero label="Limite de usuários" value={form.limite_usuarios} onChange={(v) => atualizarCampo("limite_usuarios", v)} />

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <span>Descrição</span>
              <textarea
                value={form.descricao}
                onChange={(e) => atualizarCampo("descricao", e.target.value)}
                style={{ ...inputStyle, minHeight: 90 }}
              />
            </label>
          </div>

          <h3 style={featureTitleStyle}>Recursos do plano</h3>

          <div style={featuresGridStyle}>
            <Toggle label="Plano ativo" checked={form.ativo} onChange={(v) => atualizarCampo("ativo", v)} />
            <Toggle label="Convite digital" checked={form.permite_convite_digital} onChange={(v) => atualizarCampo("permite_convite_digital", v)} />
            <Toggle label="Dashboard" checked={form.permite_dashboard} onChange={(v) => atualizarCampo("permite_dashboard", v)} />
            <Toggle label="Lista de presentes" checked={form.permite_lista_presentes} onChange={(v) => atualizarCampo("permite_lista_presentes", v)} />
            <Toggle label="Envio WhatsApp" checked={form.permite_whatsapp} onChange={(v) => atualizarCampo("permite_whatsapp", v)} />
            <Toggle label="Check-in" checked={form.permite_checkin} onChange={(v) => atualizarCampo("permite_checkin", v)} />
            <Toggle label="Check-in manual" checked={form.checkin_manual} onChange={(v) => atualizarCampo("checkin_manual", v)} />
            <Toggle label="Check-in QR Code" checked={form.checkin_qrcode} onChange={(v) => atualizarCampo("checkin_qrcode", v)} />
            <Toggle label="Rede / multiempresa" checked={form.permite_rede} onChange={(v) => atualizarCampo("permite_rede", v)} />
            <Toggle label="Múltiplos eventos" checked={form.permite_multiplos_eventos} onChange={(v) => atualizarCampo("permite_multiplos_eventos", v)} />
          </div>

          <button onClick={salvarPlano} disabled={loading} style={primaryButtonStyle}>
            {loading ? "Salvando..." : "Salvar plano"}
          </button>
        </section>
      )}

      <section style={cardsGridStyle}>
        {planosOrdenados.map((plano) => (
          <article key={plano.id} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div>
                <h2 style={cardTitleStyle}>{plano.nome}</h2>
                <p style={descriptionStyle}>{plano.descricao || "Sem descrição"}</p>
              </div>

              <span style={plano.ativo ? activeBadgeStyle : inactiveBadgeStyle}>
                {plano.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div style={priceStyle}>
              R$ {Number(plano.preco_mensal || 0).toFixed(2).replace(".", ",")}
              <span style={monthStyle}> / mês</span>
            </div>

            <div style={limitsGridStyle}>
              <Info label="Eventos" value={plano.limite_eventos} />
              <Info label="Convidados" value={plano.limite_convidados} />
              <Info label="Usuários" value={plano.limite_usuarios} />
              <Info label="Validade" value={`${plano.validade_dias || 0} dias`} />
            </div>

            <div style={resourceListStyle}>
              <Recurso ativo={plano.permite_convite_digital} label="Convite digital" />
              <Recurso ativo={plano.permite_dashboard} label="Dashboard" />
              <Recurso ativo={plano.permite_lista_presentes} label="Lista de presentes" />
              <Recurso ativo={plano.permite_whatsapp} label="WhatsApp" />
              <Recurso ativo={plano.permite_checkin} label="Check-in" />
              <Recurso ativo={plano.checkin_manual} label="Check-in manual" />
              <Recurso ativo={plano.checkin_qrcode} label="Check-in QR Code" />
              <Recurso ativo={plano.permite_rede} label="Rede / multiempresa" />
              <Recurso ativo={plano.permite_multiplos_eventos} label="Múltiplos eventos" />
            </div>

            <div style={actionsStyle}>
              <button onClick={() => editarPlano(plano)} style={secondaryButtonStyle}>
                Editar
              </button>

              <button onClick={() => alternarAtivo(plano)} style={dangerButtonStyle}>
                {plano.ativo ? "Inativar" : "Ativar"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function CampoTexto({ label, value, onChange }: any) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}

function CampoNumero({ label, value, onChange }: any) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: any) {
  return (
    <label style={toggleStyle}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Info({ label, value }: any) {
  return (
    <div style={infoStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Recurso({ ativo, label }: any) {
  return (
    <span style={ativo ? recursoAtivoStyle : recursoInativoStyle}>
      {ativo ? "✓" : "×"} {label}
    </span>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  background: "#f3f4f6",
  color: "#0f172a",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 24,
};

const titleStyle: CSSProperties = {
  fontSize: 44,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: "#64748b",
  marginTop: 8,
};

const sectionStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 28,
  padding: 24,
  border: "1px solid #e5e7eb",
  boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
  marginBottom: 28,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  marginBottom: 18,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  fontWeight: 800,
  color: "#334155",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
};

const featureTitleStyle: CSSProperties = {
  marginTop: 26,
  marginBottom: 14,
};

const featuresGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  marginBottom: 22,
};

const toggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  fontWeight: 800,
};

const primaryButtonStyle: CSSProperties = {
  padding: "15px 22px",
  borderRadius: 999,
  background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
  border: "none",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 999,
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  color: "#b91c1c",
};

const cardsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 28,
  padding: 24,
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 42px rgba(15,23,42,0.08)",
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
};

const descriptionStyle: CSSProperties = {
  color: "#64748b",
  marginTop: 8,
};

const activeBadgeStyle: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  fontWeight: 900,
  fontSize: 12,
};

const inactiveBadgeStyle: CSSProperties = {
  ...activeBadgeStyle,
  background: "#fee2e2",
  color: "#b91c1c",
};

const priceStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  marginTop: 20,
};

const monthStyle: CSSProperties = {
  fontSize: 14,
  color: "#64748b",
};

const limitsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 18,
};

const infoStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: 13,
  borderRadius: 16,
  background: "#f8fafc",
  color: "#64748b",
};

const resourceListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 18,
};

const recursoAtivoStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontWeight: 800,
  fontSize: 12,
};

const recursoInativoStyle: CSSProperties = {
  ...recursoAtivoStyle,
  background: "#f1f5f9",
  color: "#94a3b8",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 22,
  flexWrap: "wrap",
};
