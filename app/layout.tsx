import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniStage • Painel de Convidados",
  description: "Sistema de convidados e check-in da OmniStage",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
