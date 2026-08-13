import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import { Navigation } from "@/components/Navigation";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const promptFont = Prompt({
  variable: "--font-prompt-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
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
