import { getConfirmationEffectConfig, normalizeConfirmationEffect } from "./registry";
import type { ConfirmationEffect } from "./types";

function playGeneratedSound(kind: string) {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass || kind === "none") return;

  const audioContext = new AudioContextClass();

  function note(
    frequency: number,
    start: number,
    duration: number,
    volume = 0.14,
    type: OscillatorType = "sine",
  ) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      audioContext.currentTime + start,
    );
    gain.gain.setValueAtTime(0.001, audioContext.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      audioContext.currentTime + start + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + start + duration,
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + start);
    oscillator.stop(audioContext.currentTime + start + duration + 0.03);
  }

  if (kind === "futebol" || kind === "stadium") {
    note(1320, 0, 0.1, 0.09, "sine");
    note(1760, 0.08, 0.16, 0.08, "sine");
    note(523, 0.26, 0.13, 0.15, "square");
    note(659, 0.38, 0.13, 0.14, "square");
    note(784, 0.5, 0.24, 0.18, "triangle");
    note(1046, 0.74, 0.2, 0.1, "sine");

    if (kind === "stadium") {
      note(392, 0.92, 0.24, 0.08, "sawtooth");
      note(523, 1.08, 0.24, 0.08, "sawtooth");
    }
    return;
  }

  if (kind === "magic") {
    note(880, 0, 0.16, 0.11, "sine");
    note(1175, 0.13, 0.18, 0.1, "sine");
    note(1568, 0.28, 0.28, 0.09, "triangle");
    return;
  }

  if (kind === "luxo") {
    note(392, 0, 0.2, 0.12, "triangle");
    note(523, 0.18, 0.22, 0.11, "triangle");
    note(784, 0.4, 0.28, 0.1, "sine");
    return;
  }

  if (kind === "infantil") {
    note(660, 0, 0.11, 0.14, "sine");
    note(880, 0.11, 0.11, 0.14, "sine");
    note(990, 0.22, 0.12, 0.14, "sine");
    note(1320, 0.35, 0.2, 0.12, "triangle");
    return;
  }

  note(660, 0, 0.32, 0.18, "sine");
  note(990, 0.12, 0.2, 0.12, "sine");
}

export async function playConfirmationSound(effect: ConfirmationEffect | string | null | undefined) {
  const normalized = normalizeConfirmationEffect(effect);
  if (normalized === "nenhum") return;

  const config = getConfirmationEffectConfig(normalized);

  if (config.soundSrc) {
    try {
      const audio = new Audio(config.soundSrc);
      audio.volume = 0.86;
      await audio.play();
      return;
    } catch {
      // Se o arquivo não existir, falhar ou o navegador bloquear, cai no som gerado.
    }
  }

  playGeneratedSound(config.fallbackSound || "success");
}

export function unlockSilentConfirmationAudio() {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1, audioContext.currentTime);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.04);
}
