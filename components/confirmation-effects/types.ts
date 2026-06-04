export type ConfirmationEffect =
  | "padrao"
  | "futebol"
  | "copa2026"
  | "princesa"
  | "luxo"
  | "infantil"
  | "nenhum";

export type ConfirmationEffectConfig = {
  id: ConfirmationEffect;
  label: string;
  description: string;
  soundSrc?: string;
  fallbackSound?: "success" | "futebol" | "stadium" | "magic" | "luxo" | "infantil" | "none";
};

export type ConfirmationEffectProps = {
  open: boolean;
  effect: ConfirmationEffect | string | null | undefined;
  confirming?: boolean;
  soundEnabled?: boolean;
  contained?: boolean;
  onClose?: () => void;
};
