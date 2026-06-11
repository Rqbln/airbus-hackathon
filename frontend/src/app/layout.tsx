import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CorroTwin — Gestion prédictive de la corrosion",
  description:
    "Prédiction du risque de corrosion des voilures à partir de l'exposition environnementale au sol — HAKS 2026 (Airbus x IBM x AWS)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
        <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          CorroTwin — HAKS 2026 · Airbus × IBM × AWS · Démo locale
        </footer>
      </body>
    </html>
  );
}
