import type { ConfirmationEffect, ConfirmationEffectConfig } from "./types";

export const CONFIRMATION_EFFECTS: ConfirmationEffectConfig[] = [
  {
    id: "padrao",
    label: "Padrão OmniStage",
    description: "Confirmação limpa e neutra para qualquer evento.",
    soundSrc: "/sounds/confirmation/padrao.mp3",
    fallbackSound: "success",
  },
  {
    id: "futebol",
    label: "Futebol",
    description: "Gol, bola animada, brilho e confetes em clima de futebol.",
    soundSrc: "/sounds/confirmation/futebol.mp3",
    fallbackSound: "futebol",
  },
  {
    id: "copa2026",
    label: "Copa 2026",
    description: "Arte especial Copa 2026 com brilho, troféu, bola e energia de estádio.",
    soundSrc: "/sounds/confirmation/BRASIL.MP3",
    fallbackSound: "stadium",
  },
  {
    id: "princesa",
    label: "Princesa / XV anos",
    description: "Brilhos, dourado e clima elegante.",
    soundSrc: "/sounds/confirmation/princesa.mp3",
    fallbackSound: "magic",
  },
  {
    id: "luxo",
    label: "Luxo",
    description: "Confirmação discreta, premium e sofisticada.",
    soundSrc: "/sounds/confirmation/luxo.mp3",
    fallbackSound: "luxo",
  },
  {
    id: "infantil",
    label: "Infantil",
    description: "Confirmação colorida e divertida.",
    soundSrc: "/sounds/confirmation/infantil.mp3",
    fallbackSound: "infantil",
  },
  {
    id: "nenhum",
    label: "Nenhum",
    description: "Não exibe efeito visual nem toca som especial.",
    fallbackSound: "none",
  },
];

export function normalizeConfirmationEffect(value: unknown): ConfirmationEffect {
  const effect = String(value || "padrao").trim().toLowerCase();

  if (effect === "copa") return "futebol";

  if (
    effect === "padrao" ||
    effect === "futebol" ||
    effect === "copa2026" ||
    effect === "princesa" ||
    effect === "luxo" ||
    effect === "infantil" ||
    effect === "nenhum"
  ) {
    return effect;
  }

  return "padrao";
}

export function getConfirmationEffectConfig(effect: unknown) {
  const normalized = normalizeConfirmationEffect(effect);
  return (
    CONFIRMATION_EFFECTS.find((item) => item.id === normalized) ||
    CONFIRMATION_EFFECTS[0]
  );
}
