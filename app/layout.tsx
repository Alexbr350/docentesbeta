import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import { ChatProvider } from "./components/ChatContext";
import RegistrarServiceWorker from "./components/RegistrarServiceWorker";
import GuiaInstalarIOS from "./components/GuiaInstalarIOS";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// PWA: manifest + metadata de instalación. Los <meta>/<link> de Android
// (theme-color, manifest) y de iOS (apple-touch-icon, apple-mobile-web-app-*)
// los genera Next.js automáticamente a partir de estos campos.
export const metadata: Metadata = {
  title: "ENSFA+",
  description: "Plataforma para practicantes docentes de la ENSFA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ENSFA+",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    // Next.js ya genera "mobile-web-app-capable" a partir de appleWebApp.capable;
    // esta es la variante histórica que todavía esperan versiones viejas de iOS.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        <RegistrarServiceWorker />
        <ChatProvider>
          <ToastProvider>{children}</ToastProvider>
          <GuiaInstalarIOS />
        </ChatProvider>
      </body>
    </html>
  );
}