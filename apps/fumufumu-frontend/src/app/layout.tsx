import type { Metadata } from "next";
import { Toaster } from "react-hot-toast"; // ★追加
import "./globals.css";

export const metadata: Metadata = {
  title: "Fumufumu App",
  description: "エンジニア向けキャリア相談プラットフォーム",
  icons: {
    icon: [
      { url: "/fumufumu-favicon.svg", type: "image/svg+xml" },
      { url: "/fumufumu-favicon.png", type: "image/png" },
    ],
    apple: "/fumufumu-apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7FFF8]">
        {/* ここに配置することで、アプリ内のどこからでも通知を出せます */}
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
