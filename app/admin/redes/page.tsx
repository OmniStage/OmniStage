"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
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
  const [loading, setLoading] = useState(false);

  async function carregarDados() {
    const [{ data: tenantsData }, { data: networksData }, { data: linksData }] =
      await Promise.all([
        supabase.from("tenants").select("id, nome, plano, status").order("nome"),
        supabase.from("networks").select("id, nome, status").order("created_at", { ascending: false }),
        supabase.from("network_tenants").select("id, network_id, tenant_id"),
      ]);

    setTenants(tenantsData || []);
    setNetworks(networksData || []);
    setLinks(linksData || []);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const tenantsVinculados = useMemo(() => {
    return new Set(links.map((l) => l.tenant_id));
  }, [links]);

  const empresasDisponiveis = tenants.filter((t) => !tenantsVinculados.has(t.id));

  function empresasDaRede(networkId: string) {
    const ids = links.filter((l) => l.network_id === networkId).map((l) => l.tenant_id);
    return tenants.filter((t) => ids.includes(t.id));
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
    carregarDados();
  }

  async function vincularEmpresa(networkId: string, tenantId: string) {
    const { error } = await supabase.from("network_tenants").insert({
      network_id: networkId,
      tenant_id: tenantId,
    });

    if (error) {
      alert("Erro ao vincular empresa: " + error.message);
      return;
    }

    carregarDados();
  }

  async function removerDaRede(networkId: string, tenantId: string) {
    const { error } = await supabase
      .from("network_tenants")
      .delete()
      .eq("network_id", networkId)
      .eq("tenant_id", tenantId);

    if (error) {
      alert("Erro ao remover empresa: " + error.message);
      return;
    }

    carregarDados();
  }

  function onDragEnd(event: DragEndEvent) {
    const tenantId = event.active.id.toString();
    const networkId = event.over?.id?.toString();

    if (!networkId) return;
    if (!tenantId) return;

    vincularEmpresa(networkId, tenantId);
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div style={{ color: "#fff", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <header style={{ marginBottom: 32 }}>
          <p style={{ color: "#a78bfa", fontWeight: 800, margin: 0 }}>🟣 ADMIN</p>
          <h1 style={{ fontSize: 48, margin: "8px 0 8px" }}>Redes / Franquias</h1>
          <p style={{ color: "#94a3b8", maxWidth: 820 }}>
            Crie redes, franquias ou grupos empresariais e arraste os cartões das empresas para dentro delas.
          </p>
        </header>

        <section
          style={{
            background: "rgba(15,23,42,0.86)",
            border: "1px solid rgba(167,139,250,0.18)",
            borderRadius: 28,
            padding: 24,
            marginBottom: 28,
            display: "flex",
            gap: 14,
            alignItems: "center",
            maxWidth: 860,
          }}
        >
          <input
            value={novaRede}
            onChange={(e) => setNovaRede(e.target.value)}
            placeholder="Nome da rede/franquia. Ex: Rede PandaBay"
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "#020617",
              color: "#fff",
              fontSize: 16,
            }}
          />

          <button
            onClick={criarRede}
            disabled={loading}
            style={{
              padding: "16px 22px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {loading ? "Criando..." : "+ Criar rede"}
          </button>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <aside
            style={{
              background: "rgba(15,23,42,0.72)",
              border: "1px solid rgba(148,163,184,0.16)",
              borderRadius: 28,
              padding: 22,
              position: "sticky",
              top: 24,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Empresas disponíveis</h2>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>
              Arraste uma empresa para uma rede/franquia.
            </p>

            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              {empresasDisponiveis.length === 0 && (
                <div style={{ color: "#64748b", padding: 16 }}>
                  Nenhuma empresa disponível.
                </div>
              )}

              {empresasDisponiveis.map((tenant) => (
                <DraggableCompanyCard key={tenant.id} tenant={tenant} />
              ))}
            </div>
          </aside>

          <section style={{ display: "grid", gap: 22 }}>
            {networks.length === 0 && (
              <div
                style={{
                  border: "1px dashed rgba(167,139,250,0.35)",
                  borderRadius: 28,
                  padding: 40,
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                Crie sua primeira rede/franquia para começar.
              </div>
            )}

            {networks.map((network) => {
              const empresas = empresasDaRede(network.id);

              return (
                <NetworkDropCard key={network.id} network={network}>
                  {empresas.length === 0 ? (
                    <div
                      style={{
                        border: "1px dashed rgba(148,163,184,0.25)",
                        borderRadius: 20,
                        padding: 24,
                        color: "#64748b",
                        textAlign: "center",
                      }}
                    >
                      Arraste empresas para cá
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
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

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.55 : 1,
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
    <div
      style={{
        background: "linear-gradient(145deg, rgba(30,41,59,0.96), rgba(15,23,42,0.94))",
        border: "1px solid rgba(167,139,250,0.24)",
        boxShadow: "0 22px 50px rgba(0,0,0,0.25)",
        borderRadius: 22,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <strong style={{ fontSize: 18 }}>{tenant.nome}</strong>
        {badge && (
          <span
            style={{
              fontSize: 12,
              color: "#c4b5fd",
              border: "1px solid rgba(167,139,250,0.28)",
              borderRadius: 999,
              padding: "5px 9px",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <p style={{ color: "#94a3b8", marginBottom: 0 }}>
        Plano: {tenant.plano || "free"} · Status: {tenant.status || "ativo"}
      </p>
    </div>
  );
}

function LinkedCompanyCard({
  tenant,
  onRemove,
}: {
  tenant: Tenant;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        background: "rgba(2,6,23,0.72)",
        border: "1px solid rgba(250,204,21,0.35)",
        borderRadius: 18,
        padding: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <strong>{tenant.nome}</strong>
        <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
          Plano: {tenant.plano || "free"}
        </p>
      </div>

      <button
        onClick={onRemove}
        style={{
          border: "1px solid rgba(248,113,113,0.45)",
          background: "rgba(127,29,29,0.35)",
          color: "#fecaca",
          borderRadius: 999,
          padding: "9px 12px",
          cursor: "pointer",
          fontWeight: 800,
        }}
      >
        Remover
      </button>
    </div>
  );
}

function NetworkDropCard({
  network,
  children,
}: {
  network: Network;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: network.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? "linear-gradient(145deg, rgba(76,29,149,0.75), rgba(15,23,42,0.96))"
          : "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.78))",
        border: isOver
          ? "1px solid rgba(250,204,21,0.75)"
          : "1px solid rgba(167,139,250,0.22)",
        boxShadow: isOver
          ? "0 0 0 4px rgba(250,204,21,0.12), 0 24px 70px rgba(124,58,237,0.25)"
          : "0 24px 70px rgba(0,0,0,0.25)",
        borderRadius: 30,
        padding: 26,
        transition: "all 0.18s ease",
        minHeight: 220,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: "#a78bfa", margin: 0, fontWeight: 800 }}>
          Rede / Franquia
        </p>
        <h2 style={{ margin: "6px 0 0", fontSize: 30 }}>{network.nome}</h2>
      </div>

      {children}
    </div>
  );
}
