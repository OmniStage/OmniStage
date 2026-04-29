
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniStage",
  description: "Sistema profissional de eventos, convites, check-in e dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
