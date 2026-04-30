"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: any) => string;
      execute: (id?: string) => void;
      reset: (id?: string) => void;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [modoRecuperacao, setModoRecuperacao] = useState(false);

  const captchaRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const captchaResolve = useRef<((token: string) => void) | null>(null);
  const captchaReject = useRef<(() => void) | null>(null);
  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!turnstileKey) return;

    const renderCaptcha = () => {
      if (captchaRef.current && window.turnstile && !widgetId.current) {
        widgetId.current = window.turnstile.render(captchaRef.current, {
          sitekey: turnstileKey,
          size: "invisible",
          execution: "execute",
          callback: (token: string) => {
            setCaptchaToken(token);
            captchaResolve.current?.(token);
            captchaResolve.current = null;
            captchaReject.current = null;
          },
          "expired-callback": () => {
            setCaptchaToken("");
            captchaReject.current?.();
            captchaResolve.current = null;
            captchaReject.current = null;
          },
          "error-callback": () => {
            setCaptchaToken("");
            captchaReject.current?.();
            captchaResolve.current = null;
            captchaReject.current = null;
          },
        });
      }
    };

    if (window.turnstile) {
      renderCaptcha();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = renderCaptcha;
    document.body.appendChild(script);
  }, [turnstileKey]);

  function validarFormulario() {
    if (!email.trim()) {
      alert("Preencha o e-mail.");
      return false;
    }

    if (modoRecuperacao) return true;

    if (!senha.trim()) {
      alert("Preencha a senha.");
      return false;
    }

    if (senha.trim().length < 6) {
      alert("A senha precisa ter no mínimo 6 caracteres.");
      return false;
    }

    if (!aceitouTermos) {
      alert("Você precisa aceitar os Termos de Serviço e a Política de Privacidade.");
      return false;
    }

    return true;
  }

  function resetCaptcha() {
    setCaptchaToken("");

    if (window.turnstile && widgetId.current) {
      window.turnstile.reset(widgetId.current);
    }
  }

  async function gerarCaptchaToken() {
    if (!turnstileKey) return "";

    if (!window.turnstile || !widgetId.current) {
      alert("Validação de segurança ainda não carregou. Tente novamente em alguns segundos.");
      return null;
    }

    setCaptchaToken("");

    return new Promise<string | null>((resolve) => {
      const timeout = window.setTimeout(() => {
        captchaResolve.current = null;
        captchaReject.current = null;
        resetCaptcha();
        resolve(null);
      }, 12000);

      captchaResolve.current = (token: string) => {
        window.clearTimeout(timeout);
        resolve(token);
      };

      captchaReject.current = () => {
        window.clearTimeout(timeout);
        resolve(null);
      };

      window.turnstile?.reset(widgetId.current || undefined);
      window.turnstile?.execute(widgetId.current || undefined);
    });
  }

  async function redirecionarAposLogin(userId: string) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    await supabase.auth.getSession();
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (error) {
      console.error("Erro ao buscar profile:", error);
      router.replace("/app/dashboard");
      return;
    }

    if (profile?.role === "platform_admin") {
      router.replace("/admin");
      router.refresh();
      return;
    }

    const { data: networkAccess, error: networkError } = await supabase
      .from("network_members")
      .select("network_id")
      .eq("user_id", userId);

    if (networkError) {
      console.error("Erro ao buscar redes do usuário:", networkError);
    }

    if (networkAccess && networkAccess.length > 0) {
      router.replace("/app/network");
      router.refresh();
      return;
    }

    router.replace("/app/dashboard");
    router.refresh();
  }

  async function entrar() {
    if (!validarFormulario()) return;

    const token = await gerarCaptchaToken();
    if (token === null) {
      alert("Falha na validação de segurança.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha.trim(),
      options: {
        ...(token ? { captchaToken: token } : {}),
      },
    });

    setLoading(false);

    if (error) {
      resetCaptcha();
      alert("Erro ao entrar: " + error.message);
      return;
    }

    resetCaptcha();

    if (data.user?.id) {
      await supabase.auth.getSession();
      await redirecionarAposLogin(data.user.id);
      return;
    }

    router.replace("/app/dashboard");
    router.refresh();
  }

  async function criarConta() {
    if (!validarFormulario()) return;

    const token = await gerarCaptchaToken();
    if (token === null) {
      alert("Falha na validação de segurança.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        ...(token ? { captchaToken: token } : {}),
      },
    });

    setLoading(false);

    if (error) {
      resetCaptcha();
      alert("Erro ao criar conta: " + error.message);
      return;
    }

    resetCaptcha();

    alert(
      "Se este e-mail já tiver cadastro, use Entrar ou Esqueci minha senha.\n\nSe for um novo cadastro, enviamos um e-mail de confirmação."
    );
  }

  async function entrarComGoogle() {
    if (!aceitouTermos) {
      alert("Você precisa aceitar os Termos de Serviço e a Política de Privacidade.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    });

    setLoading(false);

    if (error) {
      alert("Erro ao entrar com Google: " + error.message);
    }
  }

  async function esqueciSenha() {
    if (!validarFormulario()) return;

    const token = await gerarCaptchaToken();
    if (token === null) {
      alert("Falha na validação de segurança.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
      ...(token ? { captchaToken: token } : {}),
    });

    setLoading(false);

    if (error) {
      resetCaptcha();
      alert("Erro ao enviar recuperação: " + error.message);
      return;
    }

    resetCaptcha();
    alert("Enviamos um link para redefinir sua senha.");
    setModoRecuperacao(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div ref={captchaRef} style={{ display: "none" }} />

      <section
        style={{
          padding: 80,
          background:
            "radial-gradient(circle at 25% 20%, rgba(124,58,237,0.35), transparent 32%), linear-gradient(135deg, #020617, #060816)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1 style={{ fontSize: 62, lineHeight: 1, margin: 0 }}>
          Bem-vindo ao <br />
          <span style={{ color: "#a78bfa" }}>OmniStage</span>
        </h1>

        <p style={{ fontSize: 22, maxWidth: 650, color: "#cbd5e1", marginTop: 24 }}>
          Plataforma premium para criar eventos, gerenciar RSVP, convidados e check-in com QR Code.
        </p>

        <div
          style={{
            marginTop: 50,
            maxWidth: 620,
            borderRadius: 28,
            background: "rgba(15,23,42,0.78)",
            border: "1px solid rgba(167,139,250,0.28)",
            boxShadow: "0 30px 90px rgba(124,58,237,0.22)",
            padding: 32,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Sistema RSVP Premium</h2>
          <p style={{ color: "#94a3b8" }}>Convites digitais personalizados</p>
          <p style={{ color: "#94a3b8" }}>Confirmação de presença em tempo real</p>
          <p style={{ color: "#94a3b8" }}>Check-in com QR Code e controle de entrada</p>
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          color: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 50,
        }}
      >
        <div style={{ width: "100%", maxWidth: 430 }}>
          <h2 style={{ fontSize: 44, textAlign: "center", margin: 0 }}>OmniStage</h2>

          <h3 style={{ fontSize: 26, textAlign: "center", marginTop: 10, marginBottom: 28 }}>
            {modoRecuperacao ? "Recuperar senha" : "Acesse sua conta"}
          </h3>

          {modoRecuperacao ? (
            <>
              <p style={{ color: "#6b7280", textAlign: "center", marginBottom: 22 }}>
                Digite seu e-mail cadastrado para receber o link de recuperação.
              </p>

              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  marginBottom: 18,
                  fontSize: 16,
                  background: "#f3f6fb",
                }}
              />

              <button
                onClick={esqueciSenha}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>

              <button
                type="button"
                onClick={() => setModoRecuperacao(false)}
                style={{
                  width: "100%",
                  marginTop: 16,
                  border: "none",
                  background: "transparent",
                  color: "#7c3aed",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                Voltar para login
              </button>
            </>
          ) : (
            <>
              <button
                onClick={entrarComGoogle}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 15,
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: 22,
                }}
              >
                Entrar com Google
              </button>

              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  marginBottom: 14,
                  fontSize: 16,
                  background: "#f3f6fb",
                }}
              />

              <div style={{ position: "relative", marginBottom: 12 }}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "16px 52px 16px 18px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    fontSize: 16,
                    background: "#f3f6fb",
                  }}
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 12,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#6b7280",
                    fontWeight: 700,
                  }}
                >
                  {mostrarSenha ? "Ocultar" : "Ver"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModoRecuperacao(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#7c3aed",
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: 0,
                  marginBottom: 16,
                }}
              >
                Já tenho conta / Esqueci minha senha
              </button>

              <label style={{ display: "flex", gap: 10, fontSize: 14, marginBottom: 18 }}>
                <input
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                />
                <span>
                  Concordo com os <a href="/terms">Termos de Serviço</a> e a{" "}
                  <a href="/privacy">Política de Privacidade</a>.
                </span>
              </label>

              {!turnstileKey && (
                <p style={{ color: "red", fontSize: 13 }}>
                  CAPTCHA não carregou: variável NEXT_PUBLIC_TURNSTILE_SITE_KEY ausente.
                </p>
              )}

              <button
                onClick={entrar}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {loading ? "Aguarde..." : "Entrar"}
              </button>

              <button
                onClick={criarConta}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 999,
                  border: "1px solid #7c3aed",
                  background: "#fff",
                  color: "#4c1d95",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  marginTop: 12,
                }}
              >
                Criar conta
              </button>

              <p style={{ color: "#6b7280", fontSize: 12, textAlign: "center", marginTop: 12 }}>
                Se este e-mail já tiver cadastro, use “Entrar” ou “Esqueci minha senha”.
                <br />
                Se for novo, enviaremos confirmação por e-mail.
              </p>
            </>
          )}

          <p style={{ textAlign: "center", marginTop: 22, color: "#6b7280", fontSize: 14 }}>
            OmniStage © 2026
          </p>
        </div>
      </section>
    </main>
  );
}
