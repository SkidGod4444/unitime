import { ThemeProvider } from "@/components/theme.provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fontLora = localFont({
  src: [
    {
      path: "../fonts/Lora-Bold.ttf",
      weight: "400",
      style: "bold",
    },
    {
      path: "../fonts/Lora-SemiBold.ttf",
      weight: "400",
      style: "semibold",
    },
    {
      path: "../fonts/Lora-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/Lora-SemiBoldItalic.ttf",
      weight: "400",
      style: "semibold-italic",
    },
    {
      path: "../fonts/Lora-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-lora",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "UNiTIME — Class Management for Galgotias University",
  description:
    "UNiTIME is an open-source class management platform built by students, for students of Galgotias University. Download the beta APK and experience a better alternative to iCloud.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fontLora.variable} antialiased `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
