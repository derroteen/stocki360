import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRuntime from "./PwaRuntime";
import { BRAND_COMPANY_NAME } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stocki360",
  description: "Inventory and Stock Management System",
  authors: [{ name: BRAND_COMPANY_NAME }],
  creator: BRAND_COMPANY_NAME,
  publisher: BRAND_COMPANY_NAME,
  applicationName: "Stocki360",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Stocki360",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    // Referenced explicitly since some browsers only auto-discover /favicon.ico by convention.
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563EB" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const theme=localStorage.getItem("stocki-theme");document.documentElement.classList.toggle("dark",theme==="dark"||(theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch{document.documentElement.classList.toggle("dark",matchMedia("(prefers-color-scheme: dark)").matches)}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRuntime />
      </body>
    </html>
  );
}
