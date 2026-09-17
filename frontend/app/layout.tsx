import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./providers";
import { Navigation } from "@/components/Navigation";

const inter = localFont({
  src: [
    {
      path: "./fonts/Inter-Latin.woff2",
      style: "normal",
    },
    {
      path: "./fonts/Inter-LatinExt.woff2",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

const promptFont = localFont({
  src: [
    {
      path: "./fonts/Prompt-300-Thai.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-300-Latin.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-400-Thai.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-400-Latin.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-500-Thai.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-500-Latin.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-600-Thai.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-600-Latin.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-700-Thai.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-700-Latin.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-800-Thai.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/Prompt-800-Latin.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-prompt-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QR Code Webapp",
  description: "ระบบสแกน QR สำหรับรับ/จ่ายสินค้า",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${promptFont.variable} h-full antialiased`}
    >
      <body className="min-h-full font-body bg-gray-50 text-gray-900 selection:bg-[#BE1111] selection:text-white">
        <AuthProvider>
          <Navigation>
            {children}
          </Navigation>
        </AuthProvider>
      </body>
    </html>
  );
}
