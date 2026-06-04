import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "./Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Imperial Capital World Cup 2026 Pool",
  description: "Predict the 2026 FIFA World Cup and climb the Imperial Capital leaderboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-slate-400 py-6">
          Imperial Capital · World Cup 2026 Pool · predictions lock at kickoff
        </footer>
      </body>
    </html>
  );
}
