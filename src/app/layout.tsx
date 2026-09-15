import type { Metadata } from "next";
import { Geist_Mono, Inter, Nunito_Sans, Outfit } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { CanonicalRouteProvider } from "@/components/providers/canonical-route-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { themeInitScript } from "@/components/providers/theme-script";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
import { cn } from "@/lib/utils";

const outfitHeading = Outfit({subsets:['latin'],variable:'--font-heading'});

const nunitoSans = Nunito_Sans({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlexoWhats — WhatsApp automation",
  description:
    "Manage devices, campaigns, auto-replies, and chatbots for WhatsApp.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, geistMono.variable, "font-sans", nunitoSans.variable, outfitHeading.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          suppressHydrationWarning
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CanonicalRouteProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </CanonicalRouteProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
