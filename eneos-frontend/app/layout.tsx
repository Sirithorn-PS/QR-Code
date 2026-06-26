import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import { Navigation } from "@/components/Navigation";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
      className={`${plusJakartaSans.variable} ${dmSans.variable} h-full antialiased`}
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
