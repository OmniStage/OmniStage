"use client";

import type { CSSProperties } from "react";
import type { ConfirmationEffectProps, ConfirmationEffectType } from "../types";

type Theme = {
  icon: string;
  title: string;
  text: string;
  overlay: CSSProperties;
  card: CSSProperties;
  iconStyle: CSSProperties;
  colors: string[];
};

function getTheme(effect: ConfirmationEffectType): Theme {
  if (effect === "princesa") {
    return {
      icon: "👑",
      title: "Presença confirmada!",
      text: "Sua presença foi confirmada com brilho especial.",
      overlay: {
        background:
          "radial-gradient(circle at center, rgba(251,191,36,.28), transparent 42%), linear-gradient(135deg, rgba(190,24,93,.22), rgba(88,28,135,.22))",
      },
      card: {
        background:
          "linear-gradient(135deg, rgba(190,24,93,.94), rgba(251,191,36,.9))",
        boxShadow:
          "0 24px 90px rgba(190,24,93,.34), 0 0 0 8px rgba(251,191,36,.12)",
      },
      iconStyle: { color: "#be185d" },
      colors: ["#f9a8d4", "#fbbf24", "#ffffff", "#c084fc"],
    };
  }

  if (effect === "luxo") {
    return {
      icon: "✨",
      title: "Confirmação registrada",
      text: "Sua confirmação foi registrada com sucesso.",
      overlay: {
        background:
          "radial-gradient(circle at center, rgba(212,175,55,.24), transparent 42%), linear-gradient(135deg, rgba(2,6,23,.42), rgba(120,113,108,.18))",
      },
      card: {
        background:
          "linear-gradient(135deg, rgba(15,23,42,.96), rgba(180,142,58,.92))",
        boxShadow:
          "0 24px 90px rgba(2,6,23,.46), 0 0 0 8px rgba(212,175,55,.12)",
      },
      iconStyle: { color: "#92400e" },
      colors: ["#d4af37", "#ffffff", "#0f172a", "#a16207"],
    };
  }

  if (effect === "infantil") {
    return {
      icon: "🎉",
      title: "Oba, presença confirmada!",
      text: "Agora é só esperar a diversão começar.",
      overlay: {
        background:
          "radial-gradient(circle at center, rgba(251,146,60,.28), transparent 42%), linear-gradient(135deg, rgba(14,165,233,.22), rgba(236,72,153,.22))",
      },
      card: {
        background:
          "linear-gradient(135deg, rgba(14,165,233,.94), rgba(236,72,153,.9), rgba(251,146,60,.92))",
        boxShadow:
          "0 24px 90px rgba(14,165,233,.3), 0 0 0 8px rgba(255,255,255,.1)",
      },
      iconStyle: { color: "#ec4899" },
      colors: ["#38bdf8", "#fb7185", "#facc15", "#ffffff"],
    };
  }

  return {
    icon: "✓",
    title: "Presença confirmada",
    text: "Sua confirmação foi registrada no convite.",
    overlay: {
      background:
        "radial-gradient(circle at center, rgba(124,58,237,.28), transparent 44%)",
    },
    card: {},
    iconStyle: {},
    colors: ["#7c3aed", "#14b8a6", "#ffffff", "#f8fafc"],
  };
}

export default function DefaultEffect({ open, effect, loading }: ConfirmationEffectProps) {
  if (!open || effect === "nenhum") return null;

  const theme = getTheme(effect);

  return (
    <div style={{ ...overlayStyle, ...theme.overlay }}>
      <style jsx>{`
        @keyframes omniDefaultConfirmPop {
          0% { opacity: 0; transform: translateY(16px) scale(.92); filter: brightness(.88); }
          62% { opacity: 1; transform: translateY(-3px) scale(1.025); filter: brightness(1.08); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1); }
        }
        @keyframes omniDefaultConfettiFall {
          0% { transform: translate3d(0, -80px, 0) rotate(0deg); opacity: 0; }
          14% { opacity: 1; }
          100% { transform: translate3d(var(--x), 72vh, 0) rotate(620deg); opacity: 0; }
        }
        @keyframes omniDefaultSparklePulse {
          0%, 100% { transform: scale(.7); opacity: .48; }
          50% { transform: scale(1.18); opacity: 1; }
        }
      `}</style>

      <div style={particlesLayerStyle} aria-hidden="true">
        {Array.from({ length: effect === "padrao" ? 18 : 30 }).map((_, index) => {
          const color = theme.colors[index % theme.colors.length];
          const size = 7 + (index % 4) * 3;

          return (
            <span
              key={index}
              style={{
                position: "absolute",
                left: `${(index * 37) % 100}%`,
                top: -24,
                width: size,
                height: Math.max(5, size - 2),
                borderRadius: 3,
                background: color,
                boxShadow: "0 6px 18px rgba(0,0,0,.16)",
                animation: `omniDefaultConfettiFall ${1.35 + (index % 5) * 0.12}s ease-in ${(index % 10) * 0.055}s both`,
                ["--x" as any]: `${((index % 9) - 4) * 28}px`,
              }}
            />
          );
        })}

        {effect !== "padrao" &&
          Array.from({ length: 10 }).map((_, index) => (
            <span
              key={`sparkle-${index}`}
              style={{
                position: "absolute",
                left: `${8 + ((index * 19) % 84)}%`,
                top: `${12 + ((index * 23) % 70)}%`,
                color: theme.colors[(index + 1) % theme.colors.length],
                fontSize: 16 + (index % 3) * 6,
                animation: `omniDefaultSparklePulse ${0.9 + (index % 4) * 0.12}s ease-in-out ${index * 0.08}s infinite`,
              }}
            >
              ✦
            </span>
          ))}
      </div>

      <div style={{ ...cardStyle, ...theme.card }}>
        <div style={{ ...iconStyle, ...theme.iconStyle }}>{theme.icon}</div>
        <strong style={titleStyle}>{loading ? "Confirmando presença..." : theme.title}</strong>
        <span style={textStyle}>
          {loading ? "Estamos registrando sua confirmação." : theme.text}
        </span>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 80,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  overflow: "hidden",
};

const particlesLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
};

const cardStyle: CSSProperties = {
  width: "min(340px, calc(100% - 42px))",
  borderRadius: 28,
  padding: "26px 22px",
  display: "grid",
  justifyItems: "center",
  gap: 10,
  textAlign: "center",
  color: "#ffffff",
  background:
    "linear-gradient(135deg, rgba(124,58,237,.92), rgba(20,184,166,.88))",
  border: "1px solid rgba(255,255,255,.28)",
  boxShadow:
    "0 24px 90px rgba(124,58,237,.38), 0 0 0 8px rgba(255,255,255,.08)",
  animation: "omniDefaultConfirmPop .34s ease-out",
  position: "relative",
};

const iconStyle: CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,.96)",
  color: "#16a34a",
  fontSize: 34,
  fontWeight: 950,
  boxShadow: "0 12px 34px rgba(0,0,0,.2)",
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  lineHeight: 1.05,
  fontWeight: 950,
};

const textStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.35,
  fontWeight: 800,
  opacity: 0.92,
};
