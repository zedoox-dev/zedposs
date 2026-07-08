import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // 👈 Naya provider import kiya

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 👇 Sirf ye Metadata update kiya gaya hai PWA aur production install ke liye
export const metadata: Metadata = {
  title: "ZedPoss | RamKesar Foods",
  description: "Official Desktop Billing System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZedPoss",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 👈 Yahan children ko Providers ke andar wrap kar diya */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
