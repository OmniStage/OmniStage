"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { supabase } from "@/lib/supabase";

type Tenant = {
  id: string;
  nome: string;
  plano: string | null;
  status: string | null;
};

type Network = {
  id: string;
  nome: string;
  status: string | null;
};

type NetworkTenant = {
  id: string;
  network_id: string;
  tenant_id: string;
};

export default function RedesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [links, setLinks] = useState<NetworkTenant[]>([]);
  const [novaRede, setNovaRede] = useState("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregarDados() {
    setCarregando(true);

    const [tenantsResult, networksResult, linksResult] = await Promise.all([
      supabase.from("tenants").select("id, nome, plano, status").order("nome", { ascending: true }),
      supabase.from("networks").select("id, nome, status").order("created_at", { ascending: false }),
      supabase.from("network_tenants").select("id, network_id, tenant_id"),
    ]);

    if (tenantsResult.error) {
      alert("Erro ao carregar empresas: " + tenantsResult.error.message);
      setCarregando(false);
      return;
    }

    if (networksResult.error) {
      alert("Erro ao carregar redes/franquias: " + networksResult.error.message);
      setCarregando(false);
      return;
    }

    if (linksResult.error) {
      alert("Erro ao carregar vínculos das redes: " + linksResult.error.message);
      setCarregando(false);
      return;
    }

    setTenants((tenantsResult.data || []) as Tenant[]);
    setNetworks((networksResult.data || []) as Network[]);
    setLinks((linksResult.data || []) as NetworkTenant[]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const tenantsVinculados = useMemo(() => {
    return new Set(links.map((link) => link.tenant_id));
  }, [links]);

  const empresasDisponiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return tenants
      .filter((tenant) => !tenantsVinculados.has(tenant.id))
      .filter((tenant) => {
        if (!termo) return true;

        return [tenant.nome, tenant.plano, tenant.status]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));
      });
  }, [tenants, tenantsVinculados, busca]);

  const totalEmpresasVinculadas = links.length;

  function empresasDaRede(networkId: string) {
    const ids = links.filter((link) => link.network_id === networkId).map((link) => link.tenant_id);
    return tenants.filter((tenant) => ids.includes(tenant.id));
  }

  async function criarRede() {
    if (!novaRede.trim()) {
      alert("Digite o nome da rede/franquia.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("networks").insert({
      nome: novaRede.trim(),
      status: "ativo",
    });

    setLoading(false);

    if (error) {
      alert("Erro ao criar rede: " + error.message);
      return;
    }

    setNovaRede("");
    await carregarDados();
  }

  async function vincularEmpresa(networkId: string, tenantId: string) {
    const jaVinculadoNaRede = links.some(
      (link) => link.network_id === networkId && link.tenant_id === tenantId,
    );

    if (jaVinculadoNaRede) return;

    const { error } = await supabase.from("network_tenants").insert({
      network_id: networkId,
      tenant_id: tenantId,
    });

    if (error) {
      alert("Erro ao vincular empresa: " + error.message);
      return;
    }

    await carregarDados();
  }

  async function removerDaRede(networkId: string, tenantId: string) {
    const ok = window.confirm("Remover esta empresa da rede/franquia?");
    if (!ok) return;

    const { error } = await supabase
      .from("network_tenants")
      .delete()
      .eq("network_id", networkId)
      .eq("tenant_id", tenantId);

    if (error) {
      alert("Erro ao remover empresa: " + error.message);
      return;
    }

    await carregarDados();
  }

  function onDragEnd(event: DragEndEvent) {
    const tenantId = event.active.id.toString();
    const networkId = event.over?.id?.toString();

    if (!networkId || !tenantId) return;

    vincularEmpresa(networkId, tenantId);
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div style={pageStyle}>
        <style>{`
          .redes-card,
          .rede-drop-card,
          .empresa-card {
            transition:
              transform 170ms cubic-bezier(.2,.8,.2,1),
              box-shadow 170ms ease,
              border-color 170ms ease,
              background 170ms ease;
          }

          .empresa-card:hover,
          .rede-drop-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 18px 42px rgba(15,23,42,0.08);
            border-color: rgba(124,58,237,0.22);
            background: #ffffff;
          }

          button:focus-visible,
          input:focus-visible {
            outline: 3px solid rgba(124,58,237,0.24);
            outline-offset: 3px;
          }

          @media (max-width: 980px) {
            .redes-main-grid {
              grid-template-columns: 1fr !important;
            }

            .redes-aside {
              position: relative !important;
              top: auto !important;
            }

            .create-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 620px) {
            .network-company-row {
              flex-direction: column !important;
              align-items: stretch !important;
            }
          }
        `}</style>

        <section style={heroStyle}>
          <div>
            <span style={eyebrowStyle}>Admin OmniStage</span>
            <h1 style={titleStyle}>Redes / Franquias</h1>
            <p style={subtitleStyle}>
              Agrupe empresas em redes, franquias ou grupos empresariais. A empresa continua sendo o centro do acesso.
            </p>
          </div>

          <button onClick={carregarDados} style={primaryButtonStyle}>
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
        </section>

        <section style={statsGridStyle}>
          <MetricCard label="Redes" value={networks.length} detail="Cadastradas" color="#7c3aed" bg="#ede9fe" />
          <MetricCard label="Empresas" value={tenants.length} detail="No sistema" color="#2563eb" bg="#dbeafe" />
          <MetricCard label="Vinculadas" value={totalEmpresasVinculadas} detail="Dentro de redes" color="#16a34a" bg="#dcfce7" />
          <MetricCard label="Disponíveis" value={empresasDisponiveis.length} detail="Sem rede/franquia" color="#f59e0b" bg="#fef3c7" />
        </section>

        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Criar rede/franquia</h2>
              <p style={panelTextStyle}>Use para grupos como OmniStage Produções, PandaBay ou franquias futuras.</p>
            </div>
          </div>

          <div className="create-grid" style={createGridStyle}>
            <input
              value={novaRede}
              onChange={(e) => setNovaRede(e.target.value)}
              placeholder="Nome da rede/franquia. Ex: Rede PandaBay"
              style={inputStyle}
            />

            <button onClick={criarRede} disabled={loading} style={primaryButtonStyle}>
              {loading ? "Criando..." : "+ Criar rede"}
            </button>
          </div>
        </section>

        <div className="redes-main-grid" style={mainGridStyle}>
          <aside className="redes-aside" style={asideStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <h2 style={panelTitleStyle}>Empresas disponíveis</h2>
                <p style={panelTextStyle}>Arraste uma empresa para uma rede/franquia.</p>
              </div>
            </div>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar empresa, plano ou status"
              style={{ ...inputStyle, marginTop: 16 }}
            />

            <div style={listStyle}>
              {empresasDisponiveis.length === 0 && (
                <div style={emptyStyle}>Nenhuma empresa disponível.</div>
              )}

              {empresasDisponiveis.map((tenant) => (
                <DraggableCompanyCard key={tenant.id} tenant={tenant} />
              ))}
            </div>
          </aside>

          <section style={networksListStyle}>
            {networks.length === 0 && (
              <div style={emptyStyle}>Crie sua primeira rede/franquia para começar.</div>
            )}

            {networks.map((network) => {
              const empresas = empresasDaRede(network.id);

              return (
                <NetworkDropCard key={network.id} network={network} total={empresas.length}>
                  {empresas.length === 0 ? (
                    <div style={dropEmptyStyle}>Arraste empresas para cá</div>
                  ) : (
                    <div style={listStyle}>
                      {empresas.map((tenant) => (
                        <LinkedCompanyCard
                          key={tenant.id}
                          tenant={tenant}
                          onRemove={() => removerDaRede(network.id, tenant.id)}
                        />
                      ))}
                    </div>
                  )}
                </NetworkDropCard>
              );
            })}
          </section>
        </div>
      </div>
    </DndContext>
  );
}

function DraggableCompanyCard({ tenant }: { tenant: Tenant }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tenant.id,
  });

  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.58 : 1,
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CompanyCard tenant={tenant} badge="Arrastar" />
    </div>
  );
}

function CompanyCard({ tenant, badge }: { tenant: Tenant; badge?: string }) {
  return (
    <article className="empresa-card" style={companyCardStyle}>
      <div style={titleLineStyle}>
        <strong style={itemTitleStyle}>{tenant.nome}</strong>
        {badge && <span style={dragBadgeStyle}>{badge}</span>}
      </div>

      <div style={smallLineStyle}>
        Plano: <strong>{tenant.plano || "free"}</strong> · Status: <strong>{tenant.status || "ativo"}</strong>
      </div>
    </article>
  );
}

function LinkedCompanyCard({ tenant, onRemove }: { tenant: Tenant; onRemove: () => void }) {
  return (
    <article className="network-company-row empresa-card" style={linkedCompanyCardStyle}>
      <div>
        <div style={titleLineStyle}>
          <strong style={itemTitleStyle}>{tenant.nome}</strong>
          <span style={activeBadgeStyle}>{tenant.status || "ativo"}</span>
          <span style={planBadgeStyle}>{tenant.plano || "free"}</span>
        </div>

        <div style={smallLineStyle}>Empresa vinculada a esta rede/franquia.</div>
      </div>

      <button onClick={onRemove} style={dangerButtonStyle}>
        Remover
      </button>
    </article>
  );
}

function NetworkDropCard({ network, total, children }: { network: Network; total: number; children: ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: network.id,
  });

  return (
    <article
      ref={setNodeRef}
      className="rede-drop-card"
      style={{
        ...networkCardStyle,
        ...(isOver ? networkCardOverStyle : {}),
      }}
    >
      <div style={panelHeaderStyle}>
        <div>
          <span style={eyebrowStyle}>Rede / Franquia</span>
          <h2 style={{ ...panelTitleStyle, marginTop: 8 }}>{network.nome}</h2>
          <p style={panelTextStyle}>Status: {network.status || "ativo"}</p>
        </div>

        <span style={counterStyle}>{total} empresa{total === 1 ? "" : "s"}</span>
      </div>

      <div style={{ marginTop: 18 }}>{children}</div>
    </article>
  );
}

function MetricCard({ label, value, detail, color, bg }: { label: string; value: number; detail: string; color: string; bg: string }) {
  return (
    <article style={metricCardStyle}>
      <div style={{ ...iconStyle, background: bg, color }}>●</div>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={metricValueStyle}>{value}</strong>
      <p style={metricDetailStyle}>{detail}</p>
    </article>
  );
}

const pageStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 22 };
const heroStyle: CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 26, padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, boxShadow: "0 24px 70px rgba(15,23,42,0.08)", flexWrap: "wrap" };
const eyebrowStyle: CSSProperties = { color: "#7c3aed", fontWeight: 950, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" };
const titleStyle: CSSProperties = { margin: "8px 0 8px", fontSize: 44, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.055em" };
const subtitleStyle: CSSProperties = { margin: 0, color: "#64748b", fontSize: 16, lineHeight: 1.45, maxWidth: 820 };
const primaryButtonStyle: CSSProperties = { border: "none", background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff", padding: "13px 18px", borderRadius: 15, fontWeight: 900, cursor: "pointer", boxShadow: "0 12px 26px rgba(124,58,237,0.24)", whiteSpace: "nowrap" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 };
const metricCardStyle: CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 22, padding: 18, boxShadow: "0 14px 36px rgba(15,23,42,0.06)" };
const iconStyle: CSSProperties = { width: 32, height: 32, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 15 };
const metricLabelStyle: CSSProperties = { margin: 0, color: "#64748b", fontSize: 12, fontWeight: 900 };
const metricValueStyle: CSSProperties = { display: "block", marginTop: 7, fontSize: 32, lineHeight: 1, fontWeight: 950, color: "#0f172a" };
const metricDetailStyle: CSSProperties = { margin: "8px 0 0", color: "#64748b", fontSize: 12 };
const panelStyle: CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 24, padding: 24, boxShadow: "0 24px 70px rgba(15,23,42,0.08)" };
const panelHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const panelTitleStyle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 950, color: "#0f172a" };
const panelTextStyle: CSSProperties = { margin: "6px 0 0", color: "#64748b", lineHeight: 1.4 };
const createGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginTop: 18, alignItems: "center" };
const inputStyle: CSSProperties = { width: "100%", padding: "13px 15px", borderRadius: 15, border: "1px solid rgba(226,232,240,0.95)", background: "#f8fafc", color: "#0f172a", outline: "none", fontWeight: 850 };
const mainGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 16, alignItems: "start" };
const asideStyle: CSSProperties = { ...panelStyle, position: "sticky", top: 24 };
const networksListStyle: CSSProperties = { display: "grid", gap: 16 };
const listStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 };
const companyCardStyle: CSSProperties = { border: "1px solid rgba(226,232,240,0.95)", borderRadius: 20, background: "#fbfdff", padding: 16, boxShadow: "0 12px 28px rgba(15,23,42,0.04)" };
const linkedCompanyCardStyle: CSSProperties = { ...companyCardStyle, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" };
const networkCardStyle: CSSProperties = { background: "#fff", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 24, padding: 24, boxShadow: "0 24px 70px rgba(15,23,42,0.08)", minHeight: 210 };
const networkCardOverStyle: CSSProperties = { borderColor: "rgba(124,58,237,0.55)", boxShadow: "0 0 0 4px rgba(124,58,237,0.10), 0 24px 70px rgba(15,23,42,0.10)", background: "#faf5ff" };
const titleLineStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const itemTitleStyle: CSSProperties = { color: "#0f172a", fontSize: 17, fontWeight: 950 };
const smallLineStyle: CSSProperties = { color: "#64748b", fontSize: 12, marginTop: 7 };
const dragBadgeStyle: CSSProperties = { padding: "5px 9px", borderRadius: 999, border: "1px solid rgba(124,58,237,0.24)", background: "#f5f3ff", color: "#6d28d9", fontSize: 11, fontWeight: 950 };
const activeBadgeStyle: CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 950 };
const planBadgeStyle: CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#ede9fe", color: "#6d28d9", fontSize: 11, fontWeight: 950 };
const counterStyle: CSSProperties = { padding: "9px 13px", borderRadius: 999, background: "rgba(124,58,237,0.08)", color: "#7c3aed", fontSize: 13, fontWeight: 950 };
const dangerButtonStyle: CSSProperties = { border: "1px solid rgba(220,38,38,0.24)", background: "#fee2e2", color: "#991b1b", padding: "10px 13px", borderRadius: 999, fontWeight: 900, cursor: "pointer" };
const emptyStyle: CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed rgba(148,163,184,0.5)", color: "#64748b", background: "#fbfdff" };
const dropEmptyStyle: CSSProperties = { ...emptyStyle, textAlign: "center", padding: 28 };
