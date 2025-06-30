import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navigation } from "@/components/navigation";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Swarm Oracle - AI-Powered Prediction Markets",
  description: "Cross-chain AI prediction markets powered by agent swarms and Chainlink oracle network",
  keywords: ["DeFi", "Prediction Markets", "AI", "Chainlink", "Cross-chain", "Web3"],
  authors: [{ name: "Swarm Oracle Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "Swarm Oracle - AI-Powered Prediction Markets",
    description: "Cross-chain AI prediction markets powered by agent swarms and Chainlink oracle network",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swarm Oracle - AI-Powered Prediction Markets",
    description: "Cross-chain AI prediction markets powered by agent swarms and Chainlink oracle network",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen gradient-bg`}>
        <Providers>
          <div className="relative min-h-screen">
            <Navigation />
            <main className="relative">
              {children}
            </main>
            
            {/* Background Effects */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse"></div>
              <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-green-500/5 rounded-full filter blur-2xl"></div>
            </div>
            
            <Toaster 
              position="top-right"
              toastOptions={{
                className: "bg-slate-800 text-white border border-slate-700",
                duration: 4000,
                style: {
                  background: "#1e293b",
                  color: "#f8fafc",
                  border: "1px solid #334155",
                },
              }}
            />
          </div>
        </Providers>
      </body>
    </html>
  );
}
