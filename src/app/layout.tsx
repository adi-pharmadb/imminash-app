import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Inter_Tight } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imminash - Australian Migration Intelligence",
  description:
    "AI-powered skill assessment matching and document preparation for Australian migration. Find your best ANZSCO occupation match, estimate your points score, and prepare your assessment documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("imminash_theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${interTight.variable} ${geistMono.variable} antialiased bg-background selection:bg-primary/30`}
      >
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
