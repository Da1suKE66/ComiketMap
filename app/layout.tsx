import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComiPath · C109 参展手帐",
  description: "C109 场馆地图、路线规划、摊位记录与购买清单。",
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
