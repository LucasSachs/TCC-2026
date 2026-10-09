import "./globals.css";
import "leaflet/dist/leaflet.css";

import type { Metadata } from "next";

import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Dashboard geoespacial | Campos Gerais",
  description:
    "Dashboard geoespacial interativo para análise de vegetação e áreas de preservação nos Campos Gerais.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={geist.variable}
    >
      <body>{children}</body>
    </html>
  );
}
