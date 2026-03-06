import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-sans",
  display: "swap",
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-ibm-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://policycanary.io"),
  title: "Policy Canary",
  description: "FDA regulatory intelligence for your specific products.",
  openGraph: {
    siteName: "Policy Canary",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
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
      className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-sans antialiased bg-surface-muted text-text-body">
        {children}
      </body>
    </html>
  );
}
