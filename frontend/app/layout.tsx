import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import BackendStatus from "@/components/BackendStatus";
import { DM_Serif_Display, Syne, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SpeakHelp",
  description: "Real-time AI public speaking coach",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${dmSerif.variable} ${syne.variable} ${dmMono.variable} antialiased`} suppressHydrationWarning>
          <ThemeProvider>
            {children}
            <BackendStatus />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
