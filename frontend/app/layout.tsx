import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Mira",
  description:
    "Find, save, and publish fashion pieces you love. Powered by AI visual search.",
  openGraph: {
    title: "Mira",
    description: "The fashion community powered by AI.",
    type: "website",
    images: "/MiraIcon.png",
  },
  icons: {
    icon: "/MiraIcon.png",
    apple: "/MiraIcon.png",
    other: [
      { rel: "apple-touch-icon", url: "/MiraIcon.png" }
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: "/MiraIcon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/MiraIcon.png" />
      </head>
      <body className="min-h-screen bg-surface antialiased font-body text-on-surface">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
