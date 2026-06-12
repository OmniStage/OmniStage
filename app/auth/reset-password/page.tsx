"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [status, setStatus] = useState<"aguardando" | "pronto" | "salvo" | "erro">("aguardando");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    // O Supabase troca o token do hash da URL por uma sessão automaticamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("pronto");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function salvar() {
    if (senha.length < 6) {
      setMensagem("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setMensagem("As senhas não coincidem.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setMensagem("Erro: " + error.message);
      return;
    }

    setStatus("salvo");
    setTimeout(() => router.replace("/app"), 2500);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={logoStyle}>
          <div style={dotStyle} />
          OmniStage
        </div>

        {status === "aguardando" && (
          <>
            <h1 style={tituloStyle}>Verificando link...</h1>
            <p style={subStyle}>Aguarde, estamos validando seu link de recuperação.</p>
          </>
        )}

        {status === "pronto" && (
          <>
            <h1 style={tituloStyle}>Criar nova senha</h1>
            <p style={subStyle}>Escolha uma senha segura para sua conta.</p>

            <div style={grupoStyle}>
              <label style={labelStyle}>Nova senha</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={grupoStyle}>
              <label style={labelStyle}>Confirmar senha</label>
              <input
                type="password"
                placeholder="Repita a senha"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvar()}
                style={inputStyle}
              />
            </div>

            {mensagem && (
              <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 12px", fontWeight: 700 }}>
                {mensagem}
              </p>
            )}

            <button onClick={salvar} style={btnStyle}>
              Salvar nova senha
            </button>
          </>
        )}

        {status === "salvo" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1 style={tituloStyle}>Senha atualizada!</h1>
            <p style={subStyle}>Redirecionando para o sistema...</p>
          </>
        )}

        {status === "erro" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h1 style={tituloStyle}>Link inválido</h1>
            <p style={subStyle}>Este link expirou ou já foi usado. Solicite um novo.</p>
            <button onClick={() => router.replace("/login")} style={btnStyle}>
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)",
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 28,
  padding: "40px 36px",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
  textAlign: "center",
};

const logoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: "-0.04em",
  color: "#0f172a",
  marginBottom: 28,
};

const dotStyle: React.CSSProperties = {
  width: 11,
  height: 11,
  borderRadius: 999,
  background: "#6d28d9",
  boxShadow: "0 0 0 5px rgba(109,40,217,0.12)",
};

const tituloStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 24,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.03em",
};

const subStyle: React.CSSProperties = {
  margin: "0 0 24px",
  color: "#64748b",
  fontSize: 15,
};

const grupoStyle: React.CSSProperties = {
  marginBottom: 16,
  textAlign: "left",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 800,
  fontSize: 13,
  color: "#0f172a",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 14,
  border: "1.5px solid #e2e8f0",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  background: "#6d28d9",
  color: "#fff",
  border: "none",
  borderRadius: 14,
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
  marginTop: 8,
};
