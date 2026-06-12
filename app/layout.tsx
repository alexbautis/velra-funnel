import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Poppins, DM_Sans } from "next/font/google";
import "./globals.css";
import { FunnelProvider } from "@/lib/funnel-state";
import { TrackingScripts } from "@/components/tracking-scripts";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VELRA",
  description:
    "Lo que nadie te explicó sobre por qué la celulitis resiste todo lo que has intentado.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body
        className={`${bebas.variable} ${poppins.variable} ${dmSans.variable} antialiased`}
      >
        <TrackingScripts />
        <FunnelProvider>{children}</FunnelProvider>
      </body>
    </html>
  );
}
