import type { Metadata } from "next";
import { DM_Sans, Inter_Tight, Geist_Mono, EB_Garamond, Lato } from "next/font/google";
import "./globals.css";

/**
 * Font loading strategy:
 *  - display: "swap" so text renders immediately with a system fallback,
 *    then the web font fades in. No blocking FOIT.
 *  - preload: true only for fonts used above-the-fold on first paint
 *    (DM Sans + Inter Tight for chat + landing; EB Garamond for hero).
 *  - Trimmed weights to only what's actually used to reduce bytes.
 */

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const interTight = Inter_Tight({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Premium tier headings + landing serif
const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

// Only loaded for premium tier (paid view) body text — defer
const lato = Lato({
  variable: "--font-premium-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Imminash — Find out if you qualify for Australian PR",
  description:
    "Answer 7 questions. Get your points score, best occupation match, and visa pathway in under 3 minutes. Completely free.",
  openGraph: {
    title: "Imminash — Find out if you qualify for Australian PR",
    description:
      "Answer 7 questions. Get your points score, best occupation match, and visa pathway in under 3 minutes. Completely free.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("imminash_theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${interTight.variable} ${geistMono.variable} ${ebGaramond.variable} ${lato.variable} antialiased bg-background selection:bg-primary/30`}
      >
        {children}
      </body>
    </html>
  );
}
