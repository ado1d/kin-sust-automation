import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KIN Automation - Donation & Volunteer Management",
  description: "Empowering communities through seamless donation and volunteer management. Track donations, manage volunteers, and distribute aid efficiently.",
  keywords: ["KIN", "donation", "volunteer", "charity", "management", "Bangladesh", "community"],
  authors: [{ name: "KIN - Knowledge for Innovation and Nurturing" }],
  icons: {
    icon: "/kin-logo.png",
  },
  openGraph: {
    title: "KIN Automation",
    description: "Empowering communities through seamless donation and volunteer management",
    siteName: "KIN Automation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KIN Automation",
    description: "Empowering communities through seamless donation and volunteer management",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}