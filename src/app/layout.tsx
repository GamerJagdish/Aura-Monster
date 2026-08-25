import type { Metadata } from "next";
import {
  Orbitron,
  Rajdhani,
  Roboto,
  Roboto_Mono,
  Inter,
  JetBrains_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Space_Grotesk,
  Outfit,
} from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Aura Monster",
  description: "CLIMB NATSUKI SUBARU!!. Type correctly to climb, make mistakes and fall. How high can you go?",
  keywords: ["typing test", "3D", "aura", "game", "rezero", "natsuki subaru", "aura monster", "typing game", "typing test game", "typing test 3D", "rezero typing test", "rezero typing game"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${rajdhani.variable} ${roboto.variable} ${robotoMono.variable} ${inter.variable} ${jetbrainsMono.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable} ${outfit.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
