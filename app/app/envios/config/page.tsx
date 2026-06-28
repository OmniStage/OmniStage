"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { QRCodeSVG } from "qrcode.react";

type InstanciaInfo = { nome: string; conectado: boolean; numero: string | null };
type Instancias = { omnistage: InstanciaInfo[]; cliente: InstanciaInfo | null; tenantInstance: string | null };
type Evento = { id: string; nome: string | null };
type NumeroEvento = { id: string; evento_id: string; relacao_evento: string | null; whatsapp_instance: string; whatsapp_numero: string | null };
type CronogramaItem = { tipo_envio: string; ativo: boolean; dias_antes: number; hora_envio: string };
type Plano = { permite_whatsapp?: boolean; permite_lista_presentes?: boolean; permite_album?: boolean; checkin_qrcode?: boolean };

export type ConfiguracaoEnvio = {
  cartao_por_nucleo: boolean;
  exigir_recebe_convite_cartao: boolean;
  envio_via_principal_nucleo: boolean;
  incluir_criancas_publico: boolean;
};

const CONFIG_ENVIO_PADRAO: ConfiguracaoEnvio = {
  cartao_por_nucleo: true,
  exigir_recebe_convite_cartao: true,
  envio_via_principal_nucleo: true,
  incluir_criancas_publico: true,
};

const CONFIG_ENVIO_LABELS: Record<keyof ConfiguracaoEnvio, { titulo: string; descricao: string }> = {
  cartao_por_nucleo: {
    titulo: "Cartão de entrada por núcleo",
    descricao: "Quando ativado, o cartão mostra todos os nomes do núcleo. Quando desativado, cada convidado recebe seu próprio cartão individual.",
  },
  exigir_recebe_convite_cartao: {
    titulo: 'Exigir "recebe comunicação" para cartão de entrada',
    descricao: 'Quando ativado, só recebem o cartão quem tem "recebe comunicação" marcado no cadastro. Quando desativado, todos os confirmados recebem.',
  },
  envio_via_principal_nucleo: {
    titulo: "Envio via contato principal do núcleo",
    descricao: "Quando ativado, convidados sem telefone têm seus envios redirecionados para o contato principal do núcleo.",
  },
  incluir_criancas_publico: {
    titulo: "Incluir crianças no público de envio",
    descricao: "Quando ativado, crianças aparecem no público de envio com o envio redirecionado para o responsável.",
  },
};

const TIPOS_ENVIO: { tipo: string; label: string; descricao: string; feature?: keyof Plano; featureExtra?: keyof Plano }[] = [
  { tipo: "save_the_date", label: "Save the Date", descricao: "Primeiro aviso do evento" },
  { tipo: "convite", label: "Convite", descricao: "Convite digital com link" },
  { tipo: "lembrete_rsvp", label: "Lembrete RSVP", descricao: "Lembrete para confirmar presença" },
  { tipo: "lembrete_evento", label: "Lembrete do Evento", descricao: "Lembrete próximo ao dia" },
  { tipo: "cartao_entrada", label: "Cartão de Entrada", descricao: "QR Code para check-in", feature: "checkin_qrcode" },
  { tipo: "lista_presentes", label: "Lista de Presentes", descricao: "Link para a lista de presentes", feature: "permite_lista_presentes" },
  { tipo: "album", label: "Álbum de Fotos", descricao: "Link para o álbum compartilhado", feature: "permite_album" },
];

export default function ConfigEnvioPage() {
  const [instancias, setInstancias] = useState<Instancias | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrRaw, setQrRaw] = useState<string | null>(null);
  const [qrInstancia, setQrInstancia] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dataHora, setDataHora] = useState("");

  // Números por evento
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState("");
  const [numerosEvento, setNumerosEvento] = useState<NumeroEvento[]>([]);
  const [relacoes, setRelacoes] = useState<string[]>([]);
  const [contagemTags, setContagemTags] = useState<Record<string, number>>({});
  const [novaRelacao, setNovaRelacao] = useState("");
  const [novaInstancia, setNovaInstancia] = useState("OmniStage");
  const [salvando, setSalvando] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [toastNumero, setToastNumero] = useState<string | null>(null);

  // Cronograma
  const [cronograma, setCronograma] = useState<CronogramaItem[]>([]);
  const [plano, setPlano] = useState<Plano>({});
  const [dataEvento, setDataEvento] = useState<string | null>(null);
  const [salvandoCronograma, setSalvandoCronograma] = useState(false);

  // Regras de envio
  const [configEnvio, setConfigEnvio] = useState<ConfiguracaoEnvio>(CONFIG_ENVIO_PADRAO);
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const buscarInstancias = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch("/api/whatsapp/instancias", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setInstancias(data);
      if (data.cliente?.conectado) { setQrCode(null); setQrRaw(null); setCountdown(null); setQrInstancia(null); }
      // Limpa QR da instância OmniStage se já conectou
      if (qrInstancia && data.omnistage?.find((i: InstanciaInfo) => i.nome === qrInstancia && i.conectado)) {
        setQrCode(null); setQrRaw(null); setCountdown(null); setQrInstancia(null);
      }
    }
  }, [supabase]);

  const buscarEventos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membro } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .in("status", ["ativo", "active", "aprovado"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membro?.tenant_id) return;
    setTenantId(membro.tenant_id);

    // O tenantInstance agora vem do /api/whatsapp/instancias (já com nome legível)
    // buscarInstancias() é chamada antes e já popula instancias.tenantInstance

    const { data } = await supabase
      .from("eventos")
      .select("id, nome")
      .eq("tenant_id", membro.tenant_id)
      .order("created_at", { ascending: false })
      .limit(20);

    setEventos(data || []);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("configuracoes_envio")
      .eq("id", membro.tenant_id)
      .maybeSingle();

    if (tenant?.configuracoes_envio) {
      setConfigEnvio({ ...CONFIG_ENVIO_PADRAO, ...tenant.configuracoes_envio });
    }
  }, [supabase]);

  const buscarNumerosEvento = useCallback(async (eventoId: string) => {
    const res = await fetch(`/api/whatsapp/numeros-evento?evento_id=${eventoId}`);
    if (res.ok) {
      const json = await res.json();
      setNumerosEvento(json.regras || []);
      setRelacoes(json.relacoes || []);
      setContagemTags(json.contagemPorTag || {});
    }
  }, []);

  useEffect(() => { buscarInstancias(); buscarEventos(); }, [buscarInstancias, buscarEventos]);

  useEffect(() => {
    if (!qrCode && !qrRaw) return;
    const interval = setInterval(buscarInstancias, 5000);
    return () => clearInterval(interval);
  }, [qrCode, qrRaw, buscarInstancias]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { setQrCode(null); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (eventoSelecionado) {
      buscarNumerosEvento(eventoSelecionado);
      if (tenantId) buscarCronograma(eventoSelecionado, tenantId);
    }
  }, [eventoSelecionado, buscarNumerosEvento, tenantId]);

  async function buscarCronograma(eventoId: string, tid: string) {
    const res = await fetch(`/api/whatsapp/cronograma?evento_id=${eventoId}&tenant_id=${tid}`);
    if (res.ok) {
      const json = await res.json();
      setCronograma(json.cronograma || []);
      setPlano(json.plano || {});
      setDataEvento(json.data_evento || null);
    }
  }

  function getCronogramaItem(tipo: string): CronogramaItem {
    return cronograma.find((c) => c.tipo_envio === tipo) || { tipo_envio: tipo, ativo: false, dias_antes: 0, hora_envio: "09:00" };
  }

  async function salvarCronogramaItem(item: CronogramaItem) {
    if (!eventoSelecionado || !tenantId) return;
    setCronograma((prev) =>
      prev.some((c) => c.tipo_envio === item.tipo_envio)
        ? prev.map((c) => c.tipo_envio === item.tipo_envio ? item : c)
        : [...prev, item]
    );
    await fetch("/api/whatsapp/cronograma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoSelecionado, tenant_id: tenantId, ...item }),
    });
  }

  async function salvarCronogramaCompleto() {
    if (!eventoSelecionado || !tenantId) return;
    setSalvandoCronograma(true);
    const ativos = cronograma.filter((c) => c.ativo);
    await Promise.all(ativos.map((item) => salvarCronogramaItem(item)));
    await buscarCronograma(eventoSelecionado, tenantId);
    setSalvandoCronograma(false);
  }

  async function salvarConfigEnvio(nova: ConfiguracaoEnvio) {
    if (!tenantId) return;
    setSalvandoConfig(true);
    await supabase.from("tenants").update({ configuracoes_envio: nova }).eq("id", tenantId);
    setConfigEnvio(nova);
    setSalvandoConfig(false);
  }

  function calcularDataEnvio(diasAntes: number): string {
    if (!dataEvento) return "—";
    const data = new Date(dataEvento);
    data.setDate(data.getDate() - diasAntes);
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  async function gerarQrCode(instancia: string) {
    setCarregando(true);
    setErro(null);
    setQrCode(null);
    setQrRaw(null);
    setQrInstancia(instancia);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/whatsapp/qrcode?instance=${instancia}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.qrRaw || data.qrcode) {
        setQrRaw(data.qrRaw || null);
        setQrCode(data.qrcode || null);
        setCountdown(60);
      } else setErro(data.error || "Não foi possível gerar o QR Code.");
    } catch {
      setErro("Erro ao conectar com a Evolution API.");
    } finally {
      setCarregando(false);
    }
  }

  async function conectarNumeroCliente() {
    if (!instancias?.tenantInstance) return;
    gerarQrCode(instancias.tenantInstance);
  }

  async function desconectarCliente() {
    if (!instancias?.tenantInstance || !confirm("Deseja desconectar seu número?")) return;
    await fetch(`/api/whatsapp/desconectar?instance=${instancias.tenantInstance}`, { method: "POST" });
    buscarInstancias();
  }

  async function adicionarNumero() {
    if (!eventoSelecionado || !novaInstancia) return;
    setSalvando(true);

    // Busca o número da instância
    const resInst = await fetch("/api/whatsapp/instancias", {
      headers: { authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
    });
    const instData = await resInst.json();
    const todasInstancias = [
      ...(Array.isArray(instData.omnistage) ? instData.omnistage : [instData.omnistage]),
      instData.cliente,
    ].filter(Boolean);
    const inst = todasInstancias.find((i: any) => i?.nome === novaInstancia);

    const saveRes = await fetch("/api/whatsapp/numeros-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento_id: eventoSelecionado,
        tenant_id: tenantId,
        relacao_evento: novaRelacao || null,
        whatsapp_instance: novaInstancia,
        whatsapp_numero: inst?.numero || null,
      }),
    });

    if (saveRes.ok) {
      const label = novaRelacao || "Todos os convidados";
      setNovaRelacao("");
      setNovaInstancia(instanciasDisponiveis[0] || "OmniStage");
      await buscarNumerosEvento(eventoSelecionado);
      setToastNumero(`Regra "${label}" salva! Adicione mais abaixo.`);
      setTimeout(() => setToastNumero(null), 4000);
    } else {
      const err = await saveRes.json();
      setErro(err.error || "Erro ao salvar regra.");
    }
    setSalvando(false);
  }

  async function removerNumero(id: string) {
    await fetch(`/api/whatsapp/numeros-evento?id=${id}`, { method: "DELETE" });
    buscarNumerosEvento(eventoSelecionado);
  }

  const instanciasDisponiveis = [
    ...(instancias?.omnistage.map((i) => i.nome) || ["OmniStage"]),
    ...(instancias?.cliente?.conectado ? [instancias.tenantInstance!] : []),
  ];

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <a href="/app/envios" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: "var(--card, #fff)", border: "1px solid #e2e8f0", borderRadius: 10, color: "#6d28d9", textDecoration: "none", fontSize: 18, fontWeight: 900, flexShrink: 0 }}>
            ←
          </a>
          <h1 style={{ ...titleStyle, margin: 0 }}>Configuração de Envios</h1>
        </div>

        {/* OMNISTAGE */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>WhatsApp OmniStage</h2>
          <p style={descStyle}>Números disponíveis da OmniStage para seus envios.</p>
          {instancias ? (
            <div style={{ marginTop: 12 }}>
              {instancias.omnistage.map((inst) => (
                <div key={inst.nome} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={statusBadge(inst.conectado ? "conectado" : "desconectado")}>
                      ● {inst.conectado ? "Conectado" : "Desconectado"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{inst.nome}</strong>
                      {inst.numero && <span style={{ fontSize: 13, color: "#64748b", marginLeft: 8 }}>{inst.numero}</span>}
                    </div>
                    {!inst.conectado && (
                      <button style={{ ...primaryBtn, marginTop: 0, padding: "8px 14px", fontSize: 13 }}
                        onClick={() => gerarQrCode(inst.nome)} disabled={carregando}>
                        {carregando && qrInstancia === inst.nome ? "Gerando..." : "Reconectar"}
                      </button>
                    )}
                  </div>
                  {qrInstancia === inst.nome && (qrRaw || qrCode) && (
                    <div style={{ textAlign: "center", padding: 16, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", marginTop: 4 }}>
                      <div style={statusBadge("aguardando")}>● Aguardando leitura</div>
                      <p style={descStyle}>Abra o WhatsApp → Aparelhos conectados → Conectar aparelho</p>
                      <div style={{ margin: "12px auto", display: "inline-block", padding: 16, background: "#fff", borderRadius: 12 }}>
                        {qrRaw
                          ? <QRCodeSVG value={qrRaw} size={200} fgColor="#000000" bgColor="#ffffff" />
                          : <img src={qrCode!} alt="QR Code" style={{ width: 200, height: 200 }} />}
                      </div>
                      <p style={{ fontSize: 12, color: countdown !== null && countdown <= 10 ? "#dc2626" : "#94a3b8", fontWeight: countdown !== null && countdown <= 10 ? 700 : 400 }}>
                        {countdown !== null ? `QR Code expira em ${countdown}s` : ""}
                      </p>
                      <button style={{ ...primaryBtn, fontSize: 13, padding: "8px 14px" }} onClick={() => gerarQrCode(inst.nome)} disabled={carregando}>
                        ↻ Gerar novo QR Code
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <p style={descStyle}>Carregando...</p>}
        </div>

        {/* MEU WHATSAPP */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Meu WhatsApp</h2>
          <p style={descStyle}>Conecte seu próprio número para envios com sua identidade.</p>
          {instancias?.tenantInstance && (
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Instância: <code>{instancias.tenantInstance}</code></p>
          )}
          {instancias?.cliente?.conectado ? (
            <div style={{ marginTop: 12 }}>
              <div style={statusBadge("conectado")}>● Conectado</div>
              <p style={descStyle}>Número: <strong>{instancias.cliente.numero}</strong></p>
              <button style={dangerBtn} onClick={desconectarCliente}>Desconectar meu número</button>
            </div>
          ) : qrCode ? (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <div style={statusBadge("aguardando")}>● Aguardando leitura</div>
              <p style={descStyle}>Abra o WhatsApp → Aparelhos conectados → Conectar aparelho</p>
              <div style={{ margin: "16px auto", display: "inline-block", padding: 16, background: "#fff", borderRadius: 12 }}>
                {qrRaw
                  ? <QRCodeSVG value={qrRaw} size={220} fgColor="#000000" bgColor="#ffffff" />
                  : qrCode ? <img src={qrCode} alt="QR Code" style={{ width: 220, height: 220 }} /> : null
                }
              </div>
              <p style={{ fontSize: 12, color: countdown !== null && countdown <= 10 ? "#dc2626" : "#94a3b8", marginBottom: 8, fontWeight: countdown !== null && countdown <= 10 ? 700 : 400 }}>
                {countdown !== null ? `QR Code expira em ${countdown}s` : "Verificando..."}
              </p>
              <button style={{ ...primaryBtn, marginTop: 4, fontSize: 13, padding: "8px 14px" }} onClick={conectarNumeroCliente} disabled={carregando}>
                {carregando ? "Gerando..." : "↻ Gerar novo QR Code"}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <div style={statusBadge("desconectado")}>● Desconectado</div>
              <button style={primaryBtn} onClick={conectarNumeroCliente} disabled={carregando}>
                {carregando ? "Gerando QR Code..." : "Conectar meu WhatsApp"}
              </button>
              {erro && <p style={{ marginTop: 10, color: "#dc2626", fontSize: 14 }}>{erro}</p>}
            </div>
          )}
        </div>

        {/* NÚMEROS POR RELAÇÃO DO EVENTO */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Números por Relação com o Evento</h2>
          <p style={descStyle}>Opcional — defina qual número envia para cada grupo de convidados.</p>

          <div style={fieldStyle}>
            <label>Evento</label>
            <select value={eventoSelecionado} onChange={(e) => setEventoSelecionado(e.target.value)} style={inputStyle}>
              <option value="">Selecione um evento</option>
              {eventos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          {eventoSelecionado && (
            <>
              {/* Lista atual */}
              {numerosEvento.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Configurado:</p>
                  {numerosEvento.map((n) => (
                    <div key={n.id} style={itemNumeroStyle}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{n.relacao_evento || "Todos os convidados"}</span>
                        {n.relacao_evento && contagemTags[n.relacao_evento] != null && (
                          <span style={{ background: "#e0e7ff", color: "#3730a3", borderRadius: 20, padding: "2px 8px", fontSize: 12, fontWeight: 600, marginLeft: 8 }}>
                            {contagemTags[n.relacao_evento]} convidados
                          </span>
                        )}
                        <span style={{ color: "#64748b", fontSize: 13, marginLeft: 8 }}>→ {n.whatsapp_instance} {n.whatsapp_numero ? `(${n.whatsapp_numero})` : ""}</span>
                      </div>
                      <button onClick={() => removerNumero(n.id)} style={removeBtnStyle}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback de sucesso */}
              {toastNumero && (
                <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#166534", marginBottom: 12 }}>
                  ✅ {toastNumero}
                </div>
              )}

              {/* Adicionar novo */}
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                {numerosEvento.length > 0 ? "Adicionar mais uma regra:" : "Adicionar regra:"}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ ...fieldStyle, flex: 1, minWidth: 160 }}>
                  <label style={{ fontSize: 12 }}>Tag de envio</label>
                  <select value={novaRelacao} onChange={(e) => setNovaRelacao(e.target.value)} style={inputStyle}>
                    <option value="">Todos os convidados</option>
                    {relacoes.filter((r) => !numerosEvento.find((n) => n.relacao_evento === r)).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...fieldStyle, flex: 1, minWidth: 160 }}>
                  <label style={{ fontSize: 12 }}>Número WhatsApp</label>
                  <select value={novaInstancia} onChange={(e) => setNovaInstancia(e.target.value)} style={inputStyle}>
                    {instanciasDisponiveis.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <button style={{ ...primaryBtn, marginTop: 0, height: 40 }} onClick={adicionarNumero} disabled={salvando}>
                  {salvando ? "Salvando..." : "Adicionar"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* CRONOGRAMA DE ENVIOS */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Cronograma de Envios</h2>
          <p style={descStyle}>Configure quando cada tipo de mensagem será enviada automaticamente.</p>

          {/* Info anti-bloqueio colapsável */}
          <details style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 16px", marginTop: 12, fontSize: 13, color: "#166534", cursor: "pointer" }}>
            <summary style={{ fontWeight: 700, listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
              🛡️ Proteção anti-bloqueio ativa
            </summary>
            <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
              Os envios são disparados com intervalo de <strong>7 a 15 segundos aleatórios</strong> entre cada mensagem (~4–8 msgs/min por número).
              Esse comportamento imita o envio humano e reduz o risco de bloqueio pelo WhatsApp.
              Para eventos grandes, distribua os envios entre <strong>mais de um número</strong> usando as regras de "Números por Relação".
            </p>
          </details>

          {/* Janela de envio global */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#64748b" }}>
            <span>🕐</span>
            <span>Disparos entre <strong style={{ color: "#0f172a" }}>09h</strong> e <strong style={{ color: "#0f172a" }}>20h</strong> — fora deste horário ficam em fila para o próximo dia.</span>
          </div>

          {!eventoSelecionado ? (
            <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 16 }}>Selecione um evento acima para configurar o cronograma.</p>
          ) : (
            <div style={{ marginTop: 16 }}>
              {!dataEvento && (
                <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 16 }}>
                  ⚠️ Este evento não tem data definida. Defina a data do evento para calcular os envios automaticamente.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TIPOS_ENVIO.map((def) => {
                  const item = getCronogramaItem(def.tipo);
                  const bloqueado = def.feature ? plano[def.feature] === false : false;
                  const salvando = salvandoCronograma;

                  return (
                    <div key={def.tipo} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: bloqueado ? "#f8fafc" : "#fff", opacity: bloqueado ? 0.7 : 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

                        {/* Toggle ativo */}
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: bloqueado ? "not-allowed" : "pointer", minWidth: 180 }}>
                          <div
                            onClick={() => !bloqueado && salvarCronogramaItem({ ...item, ativo: !item.ativo })}
                            style={{
                              width: 42, height: 24, borderRadius: 12, background: item.ativo && !bloqueado ? "#22c55e" : "#cbd5e1",
                              position: "relative", cursor: bloqueado ? "not-allowed" : "pointer", transition: "background 0.2s", flexShrink: 0
                            }}>
                            <div style={{ position: "absolute", top: 3, left: item.ativo && !bloqueado ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{def.label}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{def.descricao}</div>
                          </div>
                        </label>

                        {/* Plano bloqueado */}
                        {bloqueado && (
                          <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                            🔒 Plano não inclui
                          </span>
                        )}

                        {/* Configuração de dias e hora */}
                        {item.ativo && !bloqueado && (
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="number"
                                min={def.tipo === "album" ? -30 : 0}
                                max={365}
                                value={item.dias_antes}
                                onChange={(e) => {
                                  const updated = { ...item, dias_antes: Number(e.target.value) };
                                  setCronograma((prev) => prev.some((c) => c.tipo_envio === def.tipo) ? prev.map((c) => c.tipo_envio === def.tipo ? updated : c) : [...prev, updated]);
                                }}
                                style={{ ...inputStyle, width: 70, textAlign: "center", padding: "8px 6px" }}
                              />
                              <span style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>
                                {def.tipo === "album" ? "dias após" : "dias antes"}
                              </span>
                            </div>
                            {dataEvento && (
                              <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                                📅 {calcularDataEnvio(def.tipo === "album" ? -item.dias_antes : item.dias_antes)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  onClick={salvarCronogramaCompleto}
                  disabled={salvandoCronograma}
                  style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: salvandoCronograma ? 0.7 : 1 }}
                >
                  {salvandoCronograma ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* REGRAS DE ENVIO */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Regras de envio</h2>
          <p style={descStyle}>Defina o comportamento padrão dos envios para todos os eventos.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {(Object.keys(CONFIG_ENVIO_LABELS) as (keyof ConfiguracaoEnvio)[]).map((chave) => {
              const { titulo, descricao } = CONFIG_ENVIO_LABELS[chave];
              const ativo = configEnvio[chave];
              return (
                <div key={chave} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 16px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>{titulo}</p>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{descricao}</p>
                  </div>
                  <div
                    onClick={() => !salvandoConfig && salvarConfigEnvio({ ...configEnvio, [chave]: !ativo })}
                    style={{
                      width: 42, height: 24, borderRadius: 12,
                      background: ativo ? "#22c55e" : "#cbd5e1",
                      position: "relative", cursor: salvandoConfig ? "not-allowed" : "pointer",
                      transition: "background 0.2s", flexShrink: 0, marginTop: 2,
                    }}
                  >
                    <div style={{ position: "absolute", top: 3, left: ativo ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {salvandoConfig && <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 10 }}>Salvando...</p>}
        </div>

      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const containerStyle: React.CSSProperties = {};
const titleStyle: React.CSSProperties = { fontSize: 28, fontWeight: 800, marginBottom: 20 };
const cardStyle: React.CSSProperties = { background: "#fff", padding: 20, borderRadius: 16, marginBottom: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" };
const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 700, marginBottom: 4 };
const descStyle: React.CSSProperties = { marginTop: 6, fontSize: 14, color: "#64748b" };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", marginBottom: 12 };
const inputStyle: React.CSSProperties = { padding: 10, borderRadius: 8, border: "1px solid #ccc", marginTop: 4 };
const primaryBtn: React.CSSProperties = { marginTop: 10, padding: "12px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 };
const dangerBtn: React.CSSProperties = { marginTop: 10, padding: "12px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 };
const itemNumeroStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 6, border: "1px solid #e2e8f0" };
const removeBtnStyle: React.CSSProperties = { background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, fontWeight: 700 };

function statusBadge(tipo: "conectado" | "desconectado" | "aguardando"): React.CSSProperties {
  const cores = { conectado: { background: "#dcfce7", color: "#16a34a" }, desconectado: { background: "#fee2e2", color: "#dc2626" }, aguardando: { background: "#fef9c3", color: "#ca8a04" } };
  return { display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 8, ...cores[tipo] };
}
