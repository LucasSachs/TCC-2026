import "./globals.css";
import "leaflet/dist/leaflet.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Geoespacial | Campos Gerais",
  description: "Dashboard geoespacial interativo para análise de vegetação e áreas de preservação nos Campos Gerais.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
