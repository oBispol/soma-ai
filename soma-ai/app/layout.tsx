import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SomaAI - Calculadora de Compras",
  description: "Soma o valor das suas compras em tempo real enquanto caminha pelo supermercado",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SomaAI",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="h-full bg-black text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
