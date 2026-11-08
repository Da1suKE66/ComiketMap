import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComiPath · C109 参展手帐",
  description: "把喜欢的画师，放进你的冬日旅程。C109 场馆地图、摊位记录、品书与代购清单。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
