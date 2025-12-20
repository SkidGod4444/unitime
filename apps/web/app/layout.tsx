import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme.provider";

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
  title: "UNITIME - Dashboard",
  description: "Your personal university's class dashboard",
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
            defaultTheme="dark"
            forcedTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}
