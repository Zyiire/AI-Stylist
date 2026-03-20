import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verdant — Fashion Discovery",
  description:
    "Find, save, and publish fashion pieces you love. Powered by AI visual search.",
  openGraph: {
    title: "Verdant — Fashion Discovery",
    description: "The fashion community powered by AI.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#f7faf8] antialiased">{children}</body>
    </html>
  );
}
