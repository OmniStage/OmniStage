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
  tipo: "idle" | "ok" | "usado" | "erro" | "sync";
  titulo: string;
  mensagem: string;
  nome?: string;
  token?: string;
};

type LogItem = {
  id: string;
  tipo: Resultado["tipo"];
  nome: string;
  token: string;
  horario: string;
  mensagem: string;
};

type StatusFiltro = "todos" | "pendentes" | "entrou" | "sync";
type TipoFiltro = "todos" | "individual" | "grupo";

type GrupoRender = {
  key: string;
  nome: string;
  membros: Convidado[];
  isGrupo: boolean;
};

export default function CheckinEventoPage({
  params,
}: {
  params: { eventId: string };
}) {
  const eventoId = params.eventId;

  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const [loading, setLoading] = useState(true);
  const [qrAtivo, setQrAtivo] = useState(false);
  const [scannerPronto, setScannerPronto] = useState(false);
  const [cameraAtual, setCameraAtual] = useState("");
  const [online, setOnline] = useState(true);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [flash, setFlash] = useState<Resultado["tipo"] | null>(null);
  const [overlay, setOverlay] = useState<Resultado | null>(null);
  const [cardsPiscando, setCardsPiscando] = useState<
    Record<string, { id: number; tipo: Exclude<Resultado["tipo"], "idle"> }>
  >({});
  const [somAtivo, setSomAtivo] = useState(false);
  const somAtivoRef = useRef(false);

  function definirSomAtivo(ativo: boolean) {
    somAtivoRef.current = ativo;
    setSomAtivo(ativo);
  }

  const [resultado, setResultado] = useState<Resultado>({
    tipo: "idle",
    titulo: "Pronto para check-in",
    mensagem: "Ative o QR code, use o leitor físico ou libere manualmente.",
  });

  const qrRef = useRef<any>(null);
  const busyRef = useRef(false);
  const ultimoTokenRef = useRef({ token: "", at: 0 });
  const camerasRef = useRef<any[]>([]);
  const cameraIndexRef = useRef(-1);
  const audioRefs = useRef<{
    success: HTMLAudioElement | null;
    already: HTMLAudioElement | null;
    error: HTMLAudioElement | null;
  }>({
    success: null,
    already: null,
    error: null,
  });
  const audioPoolRefs = useRef<{
    success: HTMLAudioElement[];
    already: HTMLAudioElement[];
    error: HTMLAudioElement[];
  }>({
    success: [],
    already: [],
    error: [],
  });
  const audioPoolIndexRef = useRef({ success: 0, already: 0, error: 0 });
  const audioUnlockedRef = useRef(false);
  const [efeitoId, setEfeitoId] = useState(0);

  const localKey = `omnistage_checkin_pending_${eventoId}`;

  useEffect(() => {
    setOnline(navigator.onLine !== false);
    carregarScriptQr();
    carregarConvidados();

    const onOnline = () => {
      setOnline(true);
      sincronizarPendentes();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      pararQr();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const criarAudio = (src: string) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = 1;
      audio.load();
      return audio;
    };

    audioRefs.current.success = criarAudio("/sounds/success.mp3");
    audioRefs.current.already = criarAudio("/sounds/already.mp3");
    audioRefs.current.error = criarAudio("/sounds/error.mp3");

    // Pool evita atraso causado por cloneNode no momento do check-in.
    audioPoolRefs.current.success = Array.from({ length: 4 }, () =>
      criarAudio("/sounds/success.mp3"),
    );
    audioPoolRefs.current.already = Array.from({ length: 3 }, () =>
      criarAudio("/sounds/already.mp3"),
    );
    audioPoolRefs.current.error = Array.from({ length: 3 }, () =>
      criarAudio("/sounds/error.mp3"),
    );
  }, []);

  function normalizar(texto: string | null | undefined) {
    return String(texto || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function isGrupoReal(c: Convidado) {
    const grupo = normalizar(c.grupo);
    const tipo = normalizar(c.tipo_convite);
    if (!grupo) return false;
    if (tipo === "INDIVIDUAL") return false;
    if (grupo.startsWith("INDIVIDUAL")) return false;
    return true;
  }

  function convidadoEntrou(c: Convidado) {
    return (
      c.checkin_realizado === true ||
      normalizar(c.status_checkin) === "ENTROU" ||
      normalizar(c.status_checkin) === "SYNC_PENDENTE"
    );
  }

  function convidadoSync(c: Convidado) {
    return normalizar(c.status_checkin) === "SYNC_PENDENTE";
  }

  async function desbloquearAudio() {
    // O botão de som agora só libera o áudio, sem tocar o kit inteiro.
    // Antes ele tentava reproduzir vários arquivos/pool ao mesmo tempo e gerava
    // aquele efeito estranho de repetição rápida.
    const audio =
      audioRefs.current.success ||
      audioPoolRefs.current.success[0] ||
      audioRefs.current.already ||
      audioRefs.current.error;

    if (!audio) {
      audioUnlockedRef.current = true;
      definirSomAtivo(true);
      return;
    }

    try {
      const volumeOriginal = audio.volume;
      const mutedOriginal = audio.muted;

      audio.muted = true;
      audio.volume = 0;
      audio.currentTime = 0;

      await audio.play();
      audio.pause();
      audio.currentTime = 0;

      audio.muted = mutedOriginal;
      audio.volume = volumeOriginal || 1;

      audioUnlockedRef.current = true;
      definirSomAtivo(true);
    } catch {
      // Mesmo se o navegador bloquear esse teste silencioso, mantemos o botão
      // como ativo para tentar tocar no próximo check-in real do operador.
      audioUnlockedRef.current = false;
      definirSomAtivo(true);
    }
  }

  function tocarArquivo(tipo: "success" | "already" | "error", volume = 1) {
    const pool = audioPoolRefs.current[tipo];
    const fallback = audioRefs.current[tipo];
    const audio = pool.length
      ? pool[audioPoolIndexRef.current[tipo]++ % pool.length]
      : fallback;

    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = volume;

      void audio
        .play()
        .then(() => {
          audioUnlockedRef.current = true;
        })
        .catch(() => {
          // Não desligamos o botão de som aqui. Em alguns tablets/iPhones uma
          // tentativa pode falhar isoladamente, mas a próxima leitura pode tocar.
          audioUnlockedRef.current = false;
        });
    } catch {
      audioUnlockedRef.current = false;
    }
  }

  function tocarSom(tipo: "ok" | "erro" | "usado" | "sync" | "tick") {
    // Som só para feedback de check-in e somente quando o operador ativar.
    // Botões de navegação/ação não disparam áudio.
    if (!somAtivoRef.current) return;

    if (tipo === "ok") {
      tocarArquivo("success", 1);
      return;
    }

    if (tipo === "usado") {
      tocarArquivo("already", 1);
      return;
    }

    if (tipo === "sync") {
      tocarArquivo("error", 0.75);
      return;
    }

    if (tipo === "tick") {
      tocarArquivo("success", 0.26);
      return;
    }

    tocarArquivo("error", 1);
  }

  function tocarSomSincronizado(
    tipo: "ok" | "erro" | "usado" | "sync" | "tick",
    delay = 0,
  ) {
    // Sem delay perceptível: o som sai junto do feedback visual.
    if (delay <= 0) {
      tocarSom(tipo);
      return;
    }

    window.setTimeout(() => tocarSom(tipo), delay);
  }

  function feedbackSincronizado(
    cardId: string | null,
    resultado: Resultado,
    som: "ok" | "erro" | "usado" | "sync" | "tick",
    vibracao?: "ok" | "erro",
  ) {
    if (cardId)
      piscarCard(cardId, resultado.tipo === "idle" ? "ok" : resultado.tipo);
    atualizarResultado(resultado);
    tocarSomSincronizado(som, 0);

    if (vibracao) vibrar(vibracao);
  }

  function tocarClick() {
    tocarSom("tick");
  }

  function vibrar(tipo: "ok" | "erro") {
    try {
      if (!navigator.vibrate) return;
      navigator.vibrate(tipo === "ok" ? [90, 40, 120] : [160, 60, 160]);
    } catch {}
  }

  function piscarCard(
    id: string,
    tipo: Exclude<Resultado["tipo"], "idle"> = "ok",
  ) {
    const efeito = { id: Date.now() + Math.random(), tipo };

    // Atualização direta com ID único: funciona em card individual, grupo,
    // leitura por QR e liberação manual, sem depender da classe reiniciar sozinha.
    setCardsPiscando((prev) => ({ ...prev, [id]: efeito }));

    window.setTimeout(() => {
      setCardsPiscando((prev) => {
        if (prev[id]?.id !== efeito.id) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 1250);
  }

  function lerPendentes(): Record<
    string,
    { nome: string; data_checkin: string }
  > {
    try {
      return JSON.parse(localStorage.getItem(localKey) || "{}");
    } catch {
      return {};
    }
  }

  function salvarPendente(c: Convidado, data_checkin: string) {
    const pendentes = lerPendentes();
    pendentes[c.token] = { nome: c.nome, data_checkin };
    localStorage.setItem(localKey, JSON.stringify(pendentes));
  }

  function removerPendente(token: string) {
    const pendentes = lerPendentes();
    delete pendentes[token];
    localStorage.setItem(localKey, JSON.stringify(pendentes));
  }

  function aplicarEstadoLocal(c: Convidado): Convidado {
    const pendentes = lerPendentes();
    const local = pendentes[c.token];
    if (!local) return c;

    if (
      c.checkin_realizado === true ||
      normalizar(c.status_checkin) === "ENTROU"
    ) {
      removerPendente(c.token);
      return c;
    }

    return {
      ...c,
      checkin_realizado: true,
      status_checkin: "sync_pendente",
      data_checkin: local.data_checkin || c.data_checkin,
    };
  }

  async function carregarConvidados() {
    setLoading(true);

    const { data, error } = await supabase
      .from("convidados")
      .select(
        "id, evento_id, tenant_id, grupo_id, nome, telefone, email, token, status_rsvp, checkin_realizado, data_checkin, status_checkin, grupo, tipo_convite",
      )
      .eq("evento_id", eventoId)
      .ilike("status_rsvp", "confirmado")
      .order("nome", { ascending: true });

    if (error) {
      atualizarResultado({
        tipo: "erro",
        titulo: "Erro ao carregar convidados",
        mensagem: error.message,
      });
      setConvidados([]);
      setLoading(false);
      return;
    }

    const lista = ((data || []) as Convidado[]).map(aplicarEstadoLocal);
    setConvidados(lista);
    setLoading(false);
  }

  function carregarScriptQr() {
    if (window.Html5Qrcode) {
      setScannerPronto(true);
      return;
    }

    const scriptExistente = document.querySelector(
      'script[src*="html5-qrcode"]',
    );
    if (scriptExistente) {
      scriptExistente.addEventListener("load", () => setScannerPronto(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => setScannerPronto(true);
    script.onerror = () =>
      atualizarResultado({
        tipo: "erro",
        titulo: "Erro no scanner",
        mensagem: "Não foi possível carregar o leitor de QR code.",
      });

    document.body.appendChild(script);
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
            "",
        ).trim();
      }
    } catch {}

    const match = text.match(/\b[A-Z0-9]{2,}-[A-Z0-9-]+\b/i);
    return match ? match[0].trim() : text;
  }

  function atualizarResultado(next: Resultado) {
    setResultado(next);
    setOverlay(next);
    setEfeitoId(Date.now() + Math.random());
    setFlash(next.tipo);
    setTimeout(() => setFlash(null), 700);

    if (next.tipo !== "idle") {
      setLogs((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            tipo: next.tipo,
            nome: next.nome || next.titulo,
            token: next.token || "—",
            horario: new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            mensagem: next.mensagem,
          },
          ...prev,
        ].slice(0, 8),
      );
    }

    setTimeout(() => setOverlay(null), 1350);
  }

  async function carregarCameras() {
    try {
      if (!window.Html5Qrcode?.getCameras) return [];
      const cameras = await window.Html5Qrcode.getCameras();
      camerasRef.current = cameras || [];
      return camerasRef.current;
    } catch {
      camerasRef.current = [];
      return [];
    }
  }

  async function iniciarQr() {
    if (!scannerPronto || !window.Html5Qrcode || qrAtivo) return;

    // Primeiro abre a área visual do QR. O html5-qrcode precisa que o elemento
    // #qr-reader exista no DOM antes de iniciar a câmera.
    setQrAtivo(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      await carregarCameras();

      if (camerasRef.current.length && cameraIndexRef.current < 0) {
        const traseira = camerasRef.current.findIndex((camera) =>
          /back|rear|traseira|environment/i.test(camera.label || ""),
        );
        cameraIndexRef.current = traseira >= 0 ? traseira : 0;
      }

      const configCamera =
        camerasRef.current.length && cameraIndexRef.current >= 0
          ? camerasRef.current[cameraIndexRef.current].id
          : { facingMode: "environment" };

      const nomeCamera =
        camerasRef.current.length && cameraIndexRef.current >= 0
          ? camerasRef.current[cameraIndexRef.current].label ||
            `Câmera ${cameraIndexRef.current + 1}`
          : "Câmera traseira";

      setCameraAtual(nomeCamera);

      const qr = new window.Html5Qrcode("qr-reader");
      qrRef.current = qr;

      await qr.start(
        configCamera,
        {
          fps: 14,
          rememberLastUsedCamera: false,
          disableFlip: false,
          qrbox: (w: number, h: number) => {
            const base = Math.min(w || 320, h || 320);
            const tela = window.innerWidth || 360;
            const factor = tela <= 768 ? 0.76 : tela <= 1180 ? 0.78 : 0.72;
            const size = Math.floor(
              Math.max(240, Math.min(base * factor, 520)),
            );
            return { width: size, height: size };
          },
        },
        async (decodedText: string) => {
          await processarToken(decodedText, "qr");
        },
      );

      atualizarResultado({
        tipo: "idle",
        titulo: "QR code ativo",
        mensagem: `Aproxime o cartão do convidado da câmera. ${nomeCamera}`,
      });
    } catch (error: any) {
      try {
        if (qrRef.current) {
          await qrRef.current.stop();
          await qrRef.current.clear();
        }
      } catch {}

      qrRef.current = null;
      setQrAtivo(false);
      atualizarResultado({
        tipo: "erro",
        titulo: "Câmera indisponível",
        mensagem: error?.message || "Não foi possível iniciar o QR code.",
      });
      tocarSomSincronizado("erro", 50);
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

  async function trocarCamera() {
    const rodando = qrAtivo;
    if (rodando) await pararQr();

    await carregarCameras();

    if (camerasRef.current.length > 1) {
      cameraIndexRef.current =
        cameraIndexRef.current < 0
          ? 0
          : (cameraIndexRef.current + 1) % camerasRef.current.length;

      setCameraAtual(
        camerasRef.current[cameraIndexRef.current].label ||
          `Câmera ${cameraIndexRef.current + 1}`,
      );
    }

    if (rodando) setTimeout(() => iniciarQr(), 250);
  }

  function leituraDuplicada(token: string) {
    const t = normalizar(token);
    const now = Date.now();

    if (
      t &&
      t === normalizar(ultimoTokenRef.current.token) &&
      now - ultimoTokenRef.current.at < 1100
    ) {
      return true;
    }

    ultimoTokenRef.current = { token, at: now };
    return false;
  }

  async function processarToken(
    raw: string,
    origem: "qr" | "manual" = "manual",
  ) {
    const token = extrairToken(raw);
    if (!token) return;
    if (leituraDuplicada(token)) return;
    if (busyRef.current) return;

    busyRef.current = true;

    const convidado = convidados.find(
      (c) => normalizar(c.token) === normalizar(token),
    );

    if (!convidado) {
      feedbackSincronizado(
        null,
        {
          tipo: "erro",
          titulo: "Token não localizado",
          mensagem: `Token não encontrado: ${token}`,
          token,
        },
        "erro",
        "erro",
      );
      busyRef.current = false;
      return;
    }

    if (convidadoEntrou(convidado)) {
      feedbackSincronizado(
        convidado.id,
        {
          tipo: "usado",
          titulo: "Cartão já utilizado",
          nome: convidado.nome,
          mensagem: "Este convidado já teve a entrada registrada.",
          token: convidado.token,
        },
        "usado",
        "erro",
      );
      busyRef.current = false;
      return;
    }

    await liberarConvidado(convidado, origem);
    setTimeout(() => {
      busyRef.current = false;
    }, 250);
  }

  async function liberarConvidado(
    convidado: Convidado,
    origem: "qr" | "manual" = "manual",
  ) {
    // Proteção visual imediata: se o estado local já sabe que entrou, não tenta gravar de novo.
    if (convidadoEntrou(convidado)) {
      feedbackSincronizado(
        convidado.id,
        {
          tipo: "usado",
          titulo: "Cartão já utilizado",
          nome: convidado.nome,
          mensagem: "Este convidado já teve a entrada registrada.",
          token: convidado.token,
        },
        "usado",
        "erro",
      );
      return;
    }

    const agora = new Date().toISOString();

    // Trava real no banco: só atualiza se ainda não realizou check-in.
    // Isso impede dois leitores/botões registrarem a mesma entrada ao mesmo tempo.
    const { data, error } = await supabase
      .from("convidados")
      .update({
        checkin_realizado: true,
        status_checkin: "entrou",
        data_checkin: agora,
      })
      .eq("id", convidado.id)
      .eq("evento_id", eventoId)
      .or("checkin_realizado.is.false,checkin_realizado.is.null")
      .select("id");

    if (error) {
      salvarPendente(convidado, agora);

      setConvidados((prev) =>
        prev.map((c) =>
          c.id === convidado.id
            ? {
                ...c,
                checkin_realizado: true,
                status_checkin: "sync_pendente",
                data_checkin: agora,
              }
            : c,
        ),
      );

      feedbackSincronizado(
        convidado.id,
        {
          tipo: "sync",
          titulo: "Entrada salva localmente",
          nome: convidado.nome,
          mensagem: "Sem conexão com o banco. Ficou como sync pendente.",
          token: convidado.token,
        },
        "sync",
        "erro",
      );
      return;
    }

    // Se o update não retornou linha, alguém já registrou esse check-in antes.
    if (!data || data.length === 0) {
      setConvidados((prev) =>
        prev.map((c) =>
          c.id === convidado.id
            ? {
                ...c,
                checkin_realizado: true,
                status_checkin: "entrou",
                data_checkin: c.data_checkin || agora,
              }
            : c,
        ),
      );

      feedbackSincronizado(
        convidado.id,
        {
          tipo: "usado",
          titulo: "Cartão já utilizado",
          nome: convidado.nome,
          mensagem: "Este convidado já teve a entrada registrada.",
          token: convidado.token,
        },
        "usado",
        "erro",
      );
      return;
    }

    removerPendente(convidado.token);

    // Primeiro dispara o feedback no card ainda visível; depois atualiza o estado.
    // Assim o individual não desaparece antes da animação quando o filtro está em "pendentes".
    feedbackSincronizado(
      convidado.id,
      {
        tipo: "ok",
        titulo:
          origem === "qr" ? "Entrada liberada pelo QR" : "Entrada liberada",
        nome: convidado.nome,
        mensagem: "Check-in registrado com sucesso.",
        token: convidado.token,
      },
      "ok",
      "ok",
    );

    setConvidados((prev) =>
      prev.map((c) =>
        c.id === convidado.id
          ? {
              ...c,
              checkin_realizado: true,
              status_checkin: "entrou",
              data_checkin: agora,
            }
          : c,
      ),
    );
  }

  async function liberarGrupoInteiro(membros: Convidado[]) {
    const pendentes = membros.filter((m) => !convidadoEntrou(m));

    if (!pendentes.length) {
      membros.forEach((m, idx) =>
        setTimeout(() => piscarCard(m.id, "usado"), idx * 120),
      );
      feedbackSincronizado(
        null,
        {
          tipo: "usado",
          titulo: "Grupo já liberado",
          mensagem: "Todos os integrantes deste grupo já entraram.",
        },
        "usado",
        "erro",
      );
      return;
    }

    for (let i = 0; i < pendentes.length; i++) {
      const convidado = pendentes[i];
      await liberarConvidado(convidado, "manual");
      // liberarConvidado já dispara o card e o áudio sincronizados.
      // Mantemos apenas um intervalo para a sequência do grupo ficar limpa.
      await new Promise((resolve) => setTimeout(resolve, 420));
    }
  }

  async function sincronizarPendentes() {
    const pendentesLocais = lerPendentes();
    const tokens = Object.keys(pendentesLocais);
    if (!tokens.length) return;

    for (const token of tokens) {
      const convidado = convidados.find(
        (c) => normalizar(c.token) === normalizar(token),
      );

      if (!convidado) {
        removerPendente(token);
        continue;
      }

      const { error } = await supabase
        .from("convidados")
        .update({
          checkin_realizado: true,
          status_checkin: "entrou",
          data_checkin: pendentesLocais[token].data_checkin,
        })
        .eq("id", convidado.id)
        .eq("evento_id", eventoId);

      if (!error) {
        removerPendente(token);
        setConvidados((prev) =>
          prev.map((c) =>
            c.id === convidado.id
              ? { ...c, status_checkin: "entrou", checkin_realizado: true }
              : c,
          ),
        );
        piscarCard(convidado.id, "ok");
      }
    }

    atualizarResultado({
      tipo: "ok",
      titulo: "Sincronização concluída",
      mensagem: "Pendências sincronizadas com o banco.",
    });
  }

  const resumo = useMemo(() => {
    const total = convidados.length;
    const sync = convidados.filter(convidadoSync).length;
    const entrou = convidados.filter(convidadoEntrou).length;
    const pendentes = Math.max(total - entrou, 0);
    return { total, entrou, pendentes, sync };
  }, [convidados]);

  const gruposRender = useMemo<GrupoRender[]>(
    (() => {
      const q = normalizar(busca);
      const mapa = new Map<string, Convidado[]>();

      for (const convidado of convidados) {
        const chave = isGrupoReal(convidado)
          ? `grupo:${normalizar(convidado.grupo)}`
          : `individual:${convidado.id}`;

        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave)!.push(convidado);
      }

      return Array.from(mapa.entries())
        .map(([key, membros]) => {
          const isGrupo = key.startsWith("grupo:") && membros.length >= 1;
          const nomeGrupo = isGrupo
            ? membros[0]?.grupo || key.replace(/^grupo:/, "")
            : membros[0]?.nome || "Individual";

          return {
            key,
            nome: nomeGrupo,
            membros: [...membros].sort((a, b) =>
              a.nome.localeCompare(b.nome, "pt-BR"),
            ),
            isGrupo,
          };
        })
        .filter((grupo) => {
          if (tipoFiltro === "grupo" && !grupo.isGrupo) return false;
          if (tipoFiltro === "individual" && grupo.isGrupo) return false;

          const grupoTemPendente = grupo.membros.some(
            (m) => !convidadoEntrou(m),
          );
          const grupoTemEntrou = grupo.membros.some(convidadoEntrou);
          const grupoTemSync = grupo.membros.some(convidadoSync);
          const grupoTemEfeitoAtivo = grupo.membros.some((m) =>
            Boolean(cardsPiscando[m.id]),
          );

          // Mantém o card visível enquanto a animação está rodando.
          // Isso resolve principalmente os individuais no filtro "pendentes",
          // que antes sumiam da lista no mesmo render em que recebiam o check-in.
          if (
            statusFiltro === "pendentes" &&
            !grupoTemPendente &&
            !grupoTemEfeitoAtivo
          )
            return false;
          if (
            statusFiltro === "entrou" &&
            !grupoTemEntrou &&
            !grupoTemEfeitoAtivo
          )
            return false;
          if (statusFiltro === "sync" && !grupoTemSync && !grupoTemEfeitoAtivo)
            return false;

          if (!q) return true;

          return grupo.membros.some(
            (m) =>
              normalizar(m.nome).includes(q) ||
              normalizar(m.grupo).includes(q) ||
              normalizar(m.telefone).includes(q) ||
              normalizar(m.email).includes(q) ||
              normalizar(m.token).includes(q),
          );
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }) as any,
    [convidados, busca, statusFiltro, tipoFiltro, cardsPiscando],
  );

  return (
    <div className="checkin-page">
      <style>{`
        .checkin-page { --purple:#6d28d9; --purple2:#8b5cf6; --green:#16a34a; --red:#e11d48; --amber:#d97706; color:var(--text); }
        .checkin-hero { display:grid; grid-template-columns:1.2fr auto; gap:18px; align-items:end; margin-bottom:20px; }
        .eyebrow { color:var(--muted); font-size:12px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px; }
        .title { margin:0; font-size:clamp(34px,6vw,64px); line-height:.95; letter-spacing:-.06em; font-weight:950; }
        .subtitle { margin:14px 0 0; color:var(--muted); font-size:17px; font-weight:650; }
        .actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
        .btn { border:1px solid var(--line); background:var(--card); color:var(--text); border-radius:14px; padding:12px 16px; font-weight:900; cursor:pointer; transition:transform .16s ease, box-shadow .16s ease, background .16s ease; }
        .btn:hover { transform:translateY(-1px); }
        .btn.primary { background:linear-gradient(135deg,var(--purple),var(--purple2)); color:white; border-color:transparent; box-shadow:0 14px 36px rgba(109,40,217,.22); }
        .btn.success { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
        .btn.group { background:linear-gradient(135deg,#f4d38b,#d89d36); color:#17110a; border-color:transparent; }
        .btn:disabled { opacity:.55; cursor:not-allowed; transform:none; box-shadow:none; }
        .stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
        .stat { background:var(--card); border:1px solid var(--line); border-radius:22px; padding:18px; box-shadow:0 12px 34px rgba(15,23,42,.05); }
        .stat-label { color:var(--muted); font-size:12px; font-weight:850; text-transform:uppercase; letter-spacing:.06em; }
        .stat-value { font-size:34px; line-height:1; font-weight:950; margin-top:8px; }
        .main-grid { display:grid; grid-template-columns:430px minmax(0,1fr); gap:18px; align-items:start; }
        .panel { background:var(--card); border:1px solid var(--line); border-radius:26px; padding:18px; box-shadow:0 14px 42px rgba(15,23,42,.06); }
        .reader-box { position:relative; overflow:hidden; border-radius:22px; background:#020617; border:1px solid rgba(255,255,255,.12); aspect-ratio:1/1; display:block; }
        #qr-reader { width:100%!important; height:100%!important; min-height:0!important; border:0!important; overflow:hidden!important; }
        #qr-reader > div { padding:0!important; border:0!important; }
        #qr-reader__scan_region { position:relative!important; width:100%!important; height:100%!important; min-height:0!important; display:block!important; overflow:hidden!important; background:#020617!important; }
        #qr-reader__scan_region video { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; object-fit:cover!important; display:block!important; }
        #qr-reader__scan_region canvas { width:100%!important; height:100%!important; object-fit:cover!important; }
        #qr-reader__dashboard, #qr-reader__dashboard_section, #qr-reader__status_span, #qr-reader__scan_region img { display:none!important; }
        #qr-reader video, #qr-reader canvas { width:100%!important; height:100%!important; object-fit:cover!important; }
        .result-card { border-radius:24px; padding:20px; margin-bottom:14px; border:1px solid var(--line); background:rgba(248,250,252,.76); position:relative; overflow:hidden; }
        .result-card.ok { background:linear-gradient(135deg,rgba(22,163,74,.12),rgba(255,255,255,.88)); border-color:rgba(22,163,74,.28); }
        .result-card.sync { background:linear-gradient(135deg,rgba(217,119,6,.14),rgba(255,255,255,.88)); border-color:rgba(217,119,6,.28); }
        .result-card.usado,
        .result-card.erro { background:linear-gradient(135deg,rgba(225,29,72,.15),rgba(255,255,255,.88)); border-color:rgba(225,29,72,.34); }
        .result-kicker { color:var(--muted); font-size:11px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; }
        .result-title { margin:8px 0 0; font-size:28px; line-height:1; font-weight:950; letter-spacing:-.04em; }
        .result-name { margin-top:10px; font-size:22px; font-weight:950; }
        .result-msg { margin:10px 0 0; color:var(--muted); font-size:14px; line-height:1.45; }
        .helper { margin-top:14px; border-radius:18px; padding:13px; background:rgba(248,250,252,.86); border:1px solid var(--line); color:var(--muted); font-weight:750; font-size:13px; }
        .input, .select { width:100%; border:1px solid var(--line); background:rgba(248,250,252,.86); color:var(--text); border-radius:16px; padding:13px 14px; font-weight:750; outline:none; }
        .input:focus, .select:focus { border-color:var(--purple); box-shadow:0 0 0 3px rgba(109,40,217,.12); }
        .control-row { display:grid; grid-template-columns:1fr 170px 210px; gap:10px; margin-bottom:14px; }
        .guest-list { display:grid; gap:14px; max-height:74vh; overflow:auto; padding-right:4px; }
        .group-card { border:1px solid var(--line); border-radius:26px; padding:16px; background:linear-gradient(135deg,rgba(255,255,255,.86),rgba(248,250,252,.9)); box-shadow:0 12px 34px rgba(15,23,42,.045); }
        .group-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px; }
        .group-title { font-size:20px; font-weight:950; letter-spacing:-.03em; }
        .group-sub { color:var(--muted); font-weight:800; margin-top:6px; line-height:1.35; }
        .group-meta { display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:flex-end; }
        .group-members { display:grid; gap:10px; }
        .guest-card { position:relative; overflow:hidden; border:1px solid var(--line); background:rgba(255,255,255,.78); border-radius:22px; padding:16px; display:grid; grid-template-columns:1fr auto; gap:14px; align-items:center; transition:transform .16s ease, box-shadow .16s ease, border .16s ease, filter .16s ease; }
        .guest-card:hover { transform:translateY(-1px); box-shadow:0 12px 34px rgba(15,23,42,.07); }
        .guest-card.entered { background:rgba(240,253,244,.86); border-color:rgba(22,163,74,.24); }
        .guest-card.sync { background:rgba(255,251,235,.9); border-color:rgba(217,119,6,.28); }
        .guest-card.led-flash { animation:ledFlash 1.05s ease; transform-origin:center; }
        .guest-card.led-ok { box-shadow:0 0 0 2px rgba(34,197,94,.55),0 0 38px rgba(34,197,94,.46),inset 0 0 30px rgba(34,197,94,.14); border-color:rgba(34,197,94,.72); }
        .guest-card.led-usado, .guest-card.led-erro { box-shadow:0 0 0 2px rgba(225,29,72,.5),0 0 38px rgba(225,29,72,.38),inset 0 0 30px rgba(225,29,72,.12); border-color:rgba(225,29,72,.62); }
        .guest-card.led-sync { box-shadow:0 0 0 2px rgba(217,119,6,.5),0 0 38px rgba(217,119,6,.36),inset 0 0 30px rgba(217,119,6,.12); border-color:rgba(217,119,6,.62); }
        .guest-pulse-layer { position:absolute; inset:0; border-radius:22px; pointer-events:none; z-index:0; animation:cardPulseLayer 1.05s ease forwards; }
        .guest-card.led-flash::after { content:""; position:absolute; inset:0; border-radius:22px; pointer-events:none; z-index:0; animation:cardRing 1.05s ease forwards; }
        .guest-card.led-ok::after { border:2px solid rgba(34,197,94,.75); }
        .guest-card.led-usado::after, .guest-card.led-erro::after { border:2px solid rgba(225,29,72,.72); }
        .guest-card.led-sync::after { border:2px solid rgba(217,119,6,.72); }
        .guest-pulse-layer.ok { background:radial-gradient(circle at center,rgba(34,197,94,.28),transparent 62%); }
        .guest-pulse-layer.usado, .guest-pulse-layer.erro { background:radial-gradient(circle at center,rgba(225,29,72,.24),transparent 62%); }
        .guest-pulse-layer.sync { background:radial-gradient(circle at center,rgba(217,119,6,.24),transparent 62%); }
        .guest-card > div:not(.guest-pulse-layer), .guest-card > button { position:relative; z-index:1; }
        @keyframes ledFlash { 0%{transform:scale(.992);filter:brightness(1)} 28%{transform:scale(1.018);filter:brightness(1.16)} 100%{transform:scale(1);filter:brightness(1)} }
        @keyframes cardPulseLayer { 0%{opacity:0;transform:scale(.92)} 18%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.08)} }
        @keyframes cardRing { 0%{opacity:0;transform:scale(.985)} 18%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.035)} }
        .guest-name { font-size:18px; font-weight:950; letter-spacing:-.02em; }
        .guest-sub { margin-top:4px; color:var(--muted); font-size:13px; font-weight:750; }
        .token { margin-top:8px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:12px; color:#64748b; }
        .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
        .chip { display:inline-flex; align-items:center; border-radius:999px; padding:6px 9px; font-size:11px; font-weight:950; text-transform:uppercase; }
        .chip.ok { background:#dcfce7; color:#166534; }
        .chip.pending { background:#f1f5f9; color:#475569; }
        .chip.sync { background:#fef3c7; color:#92400e; }
        .chip.info { background:#ede9fe; color:#6d28d9; }
        .chip.group { background:#fef3c7; color:#92400e; }
        .history { margin-top:14px; display:grid; gap:8px; }
        .history-item { border:1px solid var(--line); border-radius:16px; padding:11px 12px; background:rgba(248,250,252,.76); }
        .history-top { display:flex; justify-content:space-between; gap:8px; color:var(--muted); font-size:11px; font-weight:850; }
        .history-name { margin-top:4px; font-weight:950; font-size:13px; }
        .flash { position:fixed; inset:0; pointer-events:none; z-index:9997; animation:flashFade .7s ease forwards; }
        .flash.ok { background:radial-gradient(circle,rgba(22,163,74,.2),rgba(22,163,74,.08) 35%,transparent 70%); }
        .flash.sync { background:radial-gradient(circle,rgba(217,119,6,.2),rgba(217,119,6,.08) 35%,transparent 70%); }
        .flash.usado,
        .flash.erro { background:radial-gradient(circle,rgba(225,29,72,.24),rgba(225,29,72,.1) 35%,transparent 70%); }
        @keyframes flashFade { 0%{opacity:1} 100%{opacity:0} }
        .premium-overlay { position:fixed; inset:0; z-index:9998; pointer-events:none; display:grid; place-items:center; background:rgba(15,23,42,.18); backdrop-filter:blur(2px); animation:overlayFade 1.35s ease forwards; }
        .premium-card { width:min(520px,calc(100vw - 40px)); border-radius:30px; padding:30px 26px; text-align:center; background:rgba(255,255,255,.96); border:1px solid var(--line); box-shadow:0 30px 90px rgba(15,23,42,.24); transform:scale(.96) translateY(8px); animation:premiumPop .45s cubic-bezier(.2,.9,.2,1.1) forwards; }
        .premium-icon { width:76px; height:76px; border-radius:999px; margin:0 auto 16px; display:grid; place-items:center; font-size:38px; font-weight:950; }
        .premium-icon.ok { background:#dcfce7; color:#166534; }
        .premium-icon.sync { background:#fef3c7; color:#92400e; }
        .premium-icon.usado,
        .premium-icon.erro { background:#ffe4e6; color:#be123c; }
        .premium-title { margin:0; font-size:30px; font-weight:950; letter-spacing:-.04em; }
        .premium-name { margin-top:8px; font-size:18px; font-weight:900; }
        .premium-msg { margin-top:8px; color:#64748b; font-weight:700; }
        @keyframes premiumPop { to{transform:scale(1) translateY(0)} }
        @keyframes overlayFade { 0%{opacity:0} 10%{opacity:1} 78%{opacity:1} 100%{opacity:0} }
        @media (max-width:1180px){ .checkin-hero,.main-grid{grid-template-columns:1fr}.actions{justify-content:flex-start}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.guest-list{max-height:none}.control-row{grid-template-columns:1fr 170px} }
        @media (max-width:640px){ .stats{grid-template-columns:1fr}.control-row,.guest-card{grid-template-columns:1fr}.btn{width:100%}.reader-box{aspect-ratio:1/1}.group-head{flex-direction:column}.group-meta{justify-content:flex-start}.control-row{grid-template-columns:1fr} }
      `}</style>

      {flash && flash !== "idle" && <div className={`flash ${flash}`} />}

      {overlay && overlay.tipo !== "idle" && (
        <div key={efeitoId} className="premium-overlay">
          <div className="premium-card">
            <div className={`premium-icon ${overlay.tipo}`}>
              {overlay.tipo === "ok"
                ? "✓"
                : overlay.tipo === "usado"
                  ? "!"
                  : overlay.tipo === "sync"
                    ? "↻"
                    : "×"}
            </div>
            <h2 className="premium-title">{overlay.titulo}</h2>
            {overlay.nome && <div className="premium-name">{overlay.nome}</div>}
            <div className="premium-msg">{overlay.mensagem}</div>
          </div>
        </div>
      )}

      <header className="checkin-hero">
        <div>
          <div className="eyebrow">OmniStage Check-in</div>
          <h1 className="title">Portaria do evento</h1>
          <p className="subtitle">
            QR code, leitor físico, grupos, busca manual e controle híbrido de
            entrada.
          </p>
        </div>

        <div className="actions">
          <button
            className="btn"
            onClick={() => {
              carregarConvidados();
            }}
          >
            Atualizar
          </button>

          <button
            className={qrAtivo ? "btn success" : "btn primary"}
            onClick={async () => {
              if (qrAtivo) {
                await pararQr();
              } else {
                await iniciarQr();
              }
            }}
          >
            {qrAtivo ? "QR ativo" : "Ativar QR"}
          </button>

          <button
            className="btn"
            onClick={() => {
              trocarCamera();
            }}
          >
            Trocar câmera
          </button>

          <button
            className="btn"
            onClick={() => {
              sincronizarPendentes();
            }}
          >
            Sincronizar
          </button>

          <button
            className={somAtivo ? "btn success" : "btn"}
            onClick={() => {
              if (somAtivo) {
                definirSomAtivo(false);
                return;
              }

              desbloquearAudio();
            }}
          >
            {somAtivo ? "Som ativo" : "Ativar som"}
          </button>
        </div>
      </header>

      <section className="stats">
        <Metric label="Confirmados" value={resumo.total} />
        <Metric label="Check-in" value={resumo.entrou} />
        <Metric label="Pendentes" value={resumo.pendentes} />
        <Metric label="Sync pendente" value={resumo.sync} />
      </section>

      <section className="main-grid">
        <aside className="panel">
          <div className={`result-card ${resultado.tipo}`}>
            <div className="result-kicker">Status da leitura</div>
            <h2 className="result-title">{resultado.titulo}</h2>
            {resultado.nome && (
              <div className="result-name">{resultado.nome}</div>
            )}
            <p className="result-msg">{resultado.mensagem}</p>
          </div>

          {qrAtivo ? (
            <div className="reader-box">
              <div id="qr-reader" />
            </div>
          ) : (
            <div
              className="reader-box"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 24,
                color: "#94a3b8",
                fontWeight: 900,
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              QR Code desativado
            </div>
          )}

          <div className="helper">
            {qrAtivo
              ? `QR ativo${cameraAtual ? ` • ${cameraAtual}` : ""}`
              : scannerPronto
                ? "Ative o QR para usar celular, tablet ou notebook."
                : "Carregando leitor de QR code..."}
            <br />
            Status: {online ? "Online" : "Offline"} • Som:{" "}
            {somAtivo ? "Ativo" : "Desativado"}
          </div>

          <div style={{ marginTop: 12 }}>
            <input
              className="input"
              placeholder="Leitor físico / token + Enter"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const input = e.target as HTMLInputElement;
                  processarToken(input.value, "manual");
                  input.value = "";
                }
              }}
            />
          </div>

          <div className="history">
            <div className="eyebrow" style={{ marginTop: 8 }}>
              Histórico recente
            </div>

            {!logs.length ? (
              <div className="helper">Nenhuma leitura nesta sessão.</div>
            ) : (
              logs.map((log) => (
                <div className="history-item" key={log.id}>
                  <div className="history-top">
                    <span>{log.horario}</span>
                    <span>{log.tipo.toUpperCase()}</span>
                  </div>
                  <div className="history-name">{log.nome}</div>
                  <div className="token">{log.token}</div>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="panel">
          <div className="control-row">
            <input
              className="input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, grupo, telefone, email ou token"
            />

            <select
              className="select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
            >
              <option value="todos">Todos</option>
              <option value="pendentes">Somente pendentes</option>
              <option value="entrou">Somente entrou</option>
              <option value="sync">Somente sync pendente</option>
            </select>

            <select
              className="select"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as TipoFiltro)}
            >
              <option value="todos">Individual e grupo</option>
              <option value="individual">Somente individual</option>
              <option value="grupo">Somente grupo</option>
            </select>
          </div>

          {loading ? (
            <div className="helper">Carregando convidados...</div>
          ) : (
            <div className="guest-list">
              {gruposRender.map((grupo) => {
                const pendentes = grupo.membros.filter(
                  (m) => !convidadoEntrou(m),
                );
                const todosEntraram = pendentes.length === 0;
                const algumSync = grupo.membros.some(convidadoSync);

                return (
                  <div key={grupo.key} className="group-card">
                    <div className="group-head">
                      <div>
                        <div className="group-title">
                          {grupo.isGrupo
                            ? "Grupo encontrado"
                            : "Convidado encontrado"}
                        </div>
                        <div className="group-sub">
                          {grupo.isGrupo
                            ? `Integrantes: ${grupo.membros.map((m) => m.nome).join(" • ")}`
                            : "Liberação individual"}
                        </div>
                      </div>

                      <div className="group-meta">
                        <span
                          className={grupo.isGrupo ? "chip group" : "chip info"}
                        >
                          {grupo.isGrupo ? "grupo" : "individual"}
                        </span>
                        <span
                          className={todosEntraram ? "chip ok" : "chip pending"}
                        >
                          {todosEntraram ? "entrou" : "pendente"}
                        </span>
                        {algumSync && (
                          <span className="chip sync">sync pendente</span>
                        )}
                        {grupo.isGrupo && (
                          <button
                            className="btn group"
                            disabled={todosEntraram}
                            onClick={() => {
                              liberarGrupoInteiro(grupo.membros);
                            }}
                          >
                            {todosEntraram
                              ? "Grupo liberado"
                              : "Liberar grupo inteiro"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="group-members">
                      {grupo.membros.map((c) => {
                        const entrou = convidadoEntrou(c);
                        const sync = convidadoSync(c);
                        return (
                          <div
                            key={c.id}
                            className={`guest-card ${sync ? "sync" : entrou ? "entered" : ""} ${cardsPiscando[c.id] ? `led-flash led-${cardsPiscando[c.id].tipo}` : ""}`}
                          >
                            {cardsPiscando[c.id] && (
                              <div
                                key={cardsPiscando[c.id].id}
                                className={`guest-pulse-layer ${cardsPiscando[c.id].tipo}`}
                              />
                            )}
                            <div>
                              <div className="guest-name">{c.nome}</div>
                              <div className="guest-sub">
                                {c.grupo || "Individual"} •{" "}
                                {c.telefone || "sem telefone"}
                              </div>
                              <div className="token">{c.token}</div>
                              <div className="chips">
                                <span
                                  className={
                                    grupo.isGrupo ? "chip group" : "chip info"
                                  }
                                >
                                  {grupo.isGrupo ? "grupo" : "individual"}
                                </span>
                                <span
                                  className={
                                    entrou ? "chip ok" : "chip pending"
                                  }
                                >
                                  {entrou ? "entrou" : "pendente"}
                                </span>
                                {sync && (
                                  <span className="chip sync">
                                    sync pendente
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              className={entrou ? "btn" : "btn primary"}
                              disabled={entrou}
                              onClick={() => {
                                liberarConvidado(c, "manual");
                              }}
                            >
                              {entrou ? "Liberado" : "Liberar entrada"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!gruposRender.length && (
                <div className="helper">Nenhum convidado encontrado.</div>
              )}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

   
