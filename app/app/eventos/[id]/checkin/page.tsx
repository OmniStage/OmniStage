"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    Html5Qrcode?: any;
  }
}

type Convidado = {
  id: string;
  evento_id: string | null;
  tenant_id: string | null;
  grupo_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
  token: string;
  status_rsvp: string | null;
  checkin_realizado: boolean | null;
  data_checkin: string | null;
  status_checkin: string | null;
  grupo: string | null;
  tipo_convite: string | null;
};

type Resultado = {
  tipo: "idle" | "ok" | "usado" | "erro";
  titulo: string;
  mensagem: string;
  nome?: string;
};

export default function CheckinEventoPage({ params }: { params: { id: string } }) {
  const eventoId = params.id;

  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "pendentes" | "entrou">("todos");
  const [loading, setLoading] = useState(true);
  const [qrAtivo, setQrAtivo] = useState(false);
  const [scannerPronto, setScannerPronto] = useState(false);
  const [processando, setProcessando] = useState(false);

  const [resultado, setResultado] = useState<Resultado>({
    tipo: "idle",
    titulo: "Pronto para check-in",
    mensagem: "Ative o QR code ou use a busca manual.",
  });

  const qrRef = useRef<any>(null);
  const ultimoTokenRef = useRef({ token: "", at: 0 });

  useEffect(() => {
    carregarConvidados();
    carregarScriptQr();

    return () => {
      pararQr();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarConvidados() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select(
        "id, evento_id, tenant_id, grupo_id, nome, telefone, email, token, status_rsvp, checkin_realizado, data_checkin, status_checkin, grupo, tipo_convite"
      )
      .eq("evento_id", eventoId)
      .eq("status_rsvp", "confirmado")
      .order("nome", { ascending: true });

    if (error) {
      setResultado({
        tipo: "erro",
        titulo: "Erro ao carregar convidados",
        mensagem: error.message,
      });
      setConvidados([]);
    } else {
      setConvidados((data || []) as Convidado[]);
    }

    setLoading(false);
  }

  function carregarScriptQr() {
    if (window.Html5Qrcode) {
      setScannerPronto(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => setScannerPronto(true);
    script.onerror = () =>
      setResultado({
        tipo: "erro",
        titulo: "Erro no scanner",
        mensagem: "Não foi possível carregar o leitor de QR code.",
      });

    document.body.appendChild(script);
  }

  function normalizar(texto: string | null | undefined) {
    return String(texto || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function extrairToken(raw: string) {
    const text = String(raw || "").trim();
    if (!text) return "";

    try {
      const json = JSON.parse(text);
      return String(json.token || json.codigo || json.id || "").trim();
    } catch {}

    try {
      if (/^https?:\/\//i.test(text)) {
        const url = new URL(text);
        return String(
          url.searchParams.get("token") ||
            url.searchParams.get("TOKEN_CHECKIN") ||
            url.searchParams.get("id") ||
            ""
        ).trim();
      }
    } catch {}

    const match = text.match(/\b[A-Z0-9]{2,}-[A-Z0-9-]+\b/i);
    return match ? match[0].trim() : text;
  }

  function convidadoEntrou(c: Convidado) {
    return c.checkin_realizado === true || normalizar(c.status_checkin) === "ENTROU";
  }

  async function iniciarQr() {
    if (!scannerPronto || !window.Html5Qrcode || qrAtivo) return;

    try {
      const qr = new window.Html5Qrcode("qr-reader");
      qrRef.current = qr;

      await qr.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: (w: number, h: number) => {
            const size = Math.floor(Math.min(w, h) * 0.72);
            return { width: size, height: size };
          },
          rememberLastUsedCamera: true,
        },
        async (decodedText: string) => {
          const token = extrairToken(decodedText);
          if (!token || processando) return;

          const now = Date.now();
          if (
            ultimoTokenRef.current.token === token &&
            now - ultimoTokenRef.current.at < 1200
          ) {
            return;
          }

          ultimoTokenRef.current = { token, at: now };
          await processarToken(token);
        }
      );

      setQrAtivo(true);
      setResultado({
        tipo: "idle",
        titulo: "QR code ativo",
        mensagem: "Aproxime o cartão do convidado da câmera.",
      });
    } catch (error: any) {
      setResultado({
        tipo: "erro",
        titulo: "Câmera indisponível",
        mensagem: error?.message || "Não foi possível iniciar o QR code.",
      });
    }
  }

  async function pararQr() {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        await qrRef.current.clear();
      }
    } catch {}

    qrRef.current = null;
    setQrAtivo(false);
  }

  async function processarToken(raw: string) {
    const token = extrairToken(raw);
    if (!token) return;

    setProcessando(true);

    const convidado = convidados.find(
      (c) => normalizar(c.token) === normalizar(token)
    );

    if (!convidado) {
      setResultado({
        tipo: "erro",
        titulo: "QR não localizado",
        mensagem: `Token não encontrado: ${token}`,
      });
      tocarSom("erro");
      setProcessando(false);
      return;
    }

    if (convidadoEntrou(convidado)) {
      setResultado({
        tipo: "usado",
        titulo: "Cartão já utilizado",
        nome: convidado.nome,
        mensagem: "Este convidado já teve a entrada registrada.",
      });
      tocarSom("usado");
      setProcessando(false);
      return;
    }

    await liberarConvidado(convidado);
    setProcessando(false);
  }

  async function liberarConvidado(convidado: Convidado) {
    if (convidadoEntrou(convidado)) return;

    const agora = new Date().toISOString();

    setConvidados((prev) =>
      prev.map((c) =>
        c.id === convidado.id
          ? {
              ...c,
              checkin_realizado: true,
              status_checkin: "entrou",
              data_checkin: agora,
            }
          : c
      )
    );

    const { error } = await supabase
      .from("convidados")
      .update({
        checkin_realizado: true,
        status_checkin: "entrou",
        data_checkin: agora,
      })
      .eq("id", convidado.id)
      .eq("evento_id", eventoId);

    if (error) {
      setConvidados((prev) =>
        prev.map((c) =>
          c.id === convidado.id
            ? {
                ...c,
                checkin_realizado: true,
                status_checkin: "sync_pendente",
                data_checkin: agora,
              }
            : c
        )
      );

      setResultado({
        tipo: "erro",
        titulo: "Entrada salva localmente",
        nome: convidado.nome,
        mensagem: "Não sincronizou com o banco. Ficou como sync pendente.",
      });

      tocarSom("erro");
      return;
    }

    setResultado({
      tipo: "ok",
      titulo: "Entrada liberada",
      nome: convidado.nome,
      mensagem: "Check-in registrado com sucesso.",
    });

    tocarSom("ok");
  }

  function tocarSom(tipo: "ok" | "erro" | "usado") {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      const sequencia =
        tipo === "ok"
          ? [440, 660, 880]
          : tipo === "usado"
          ? [260, 180, 120]
          : [180, 120];

      sequencia.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = tipo === "ok" ? "triangle" : "sawtooth";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.0001, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.22);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch {}
  }

  const resumo = useMemo(() => {
    const total = convidados.length;
    const entrou = convidados.filter(convidadoEntrou).length;
    const sync = convidados.filter(
      (c) => normalizar(c.status_checkin) === "SYNC_PENDENTE"
    ).length;
    const pendentes = Math.max(total - entrou, 0);

    return { total, entrou, pendentes, sync };
  }, [convidados]);

  const filtrados = useMemo(() => {
    const q = normalizar(busca);

    return convidados.filter((c) => {
      const entrou = convidadoEntrou(c);

      if (statusFiltro === "pendentes" && entrou) return false;
      if (statusFiltro === "entrou" && !entrou) return false;

      if (!q) return true;

      return (
        normalizar(c.nome).includes(q) ||
        normalizar(c.grupo).includes(q) ||
        normalizar(c.telefone).includes(q) ||
        normalizar(c.email).includes(q) ||
        normalizar(c.token).includes(q)
      );
    });
  }, [convidados, busca, statusFiltro]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
              OmniStage Check-in
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Portaria do evento
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              QR code, leitor físico, busca manual e controle híbrido de entrada.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={carregarConvidados}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-slate-50"
            >
              Atualizar
            </button>

            <button
              onClick={qrAtivo ? pararQr : iniciarQr}
              className={`rounded-2xl px-4 py-3 text-sm font-bold shadow-sm ${
                qrAtivo
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-950"
              }`}
            >
              {qrAtivo ? "Desativar QR" : "Ativar QR"}
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric title="Confirmados" value={resumo.total} />
          <Metric title="Entraram" value={resumo.entrou} />
          <Metric title="Pendentes" value={resumo.pendentes} />
          <Metric title="Sync pendente" value={resumo.sync} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div
              className={`mb-4 rounded-[24px] border p-5 ${
                resultado.tipo === "ok"
                  ? "border-emerald-200 bg-emerald-50"
                  : resultado.tipo === "usado"
                  ? "border-amber-200 bg-amber-50"
                  : resultado.tipo === "erro"
                  ? "border-rose-200 bg-rose-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Status da leitura
              </div>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {resultado.titulo}
              </h2>

              {resultado.nome && (
                <div className="mt-2 text-xl font-bold">{resultado.nome}</div>
              )}

              <p className="mt-2 text-sm text-slate-600">{resultado.mensagem}</p>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
              <div id="qr-reader" className="min-h-[320px] w-full" />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {qrAtivo
                ? "QR ativo. Aponte a câmera para o cartão do convidado."
                : scannerPronto
                ? "Ative o QR para usar celular, tablet ou notebook."
                : "Carregando leitor de QR code..."}
            </div>

            <div className="mt-4">
              <input
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.target as HTMLInputElement;
                    processarToken(input.value);
                    input.value = "";
                  }
                }}
                placeholder="Leitor físico / token + Enter"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, grupo, telefone, email ou token"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-400"
              />

              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value as any)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-400"
              >
                <option value="todos">Todos</option>
                <option value="pendentes">Pendentes</option>
                <option value="entrou">Entrou</option>
              </select>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
                Carregando convidados...
              </div>
            ) : (
              <div className="grid gap-3">
                {filtrados.map((c) => {
                  const entrou = convidadoEntrou(c);
                  const sync = normalizar(c.status_checkin) === "SYNC_PENDENTE";

                  return (
                    <div
                      key={c.id}
                      className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{c.nome}</h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              entrou
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {entrou ? "ENTROU" : "PENDENTE"}
                          </span>

                          {sync && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                              SYNC PENDENTE
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                          {c.grupo || "Individual"} · {c.telefone || "sem telefone"}
                        </div>

                        <div className="mt-2 font-mono text-xs text-slate-400">
                          {c.token || "sem token"}
                        </div>
                      </div>

                      <button
                        disabled={entrou || processando}
                        onClick={() => liberarConvidado(c)}
                        className={`h-12 rounded-2xl px-5 text-sm font-bold ${
                          entrou
                            ? "bg-slate-100 text-slate-400"
                            : "bg-slate-950 text-white hover:bg-slate-800"
                        }`}
                      >
                        {entrou ? "Liberado" : "Liberar entrada"}
                      </button>
                    </div>
                  );
                })}

                {!filtrados.length && (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Nenhum convidado encontrado.
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-2 text-4xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
