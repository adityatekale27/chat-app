import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AuthProvider from "@/contexts/AuthContext";
import ThemeProvider from "@/contexts/ThemeContext";
import ToasterContext from "@/contexts/ToasterContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import PresenceManager from "@/components/others/PresenceManager";
import getCurrentUser from "@/actions/getCurrentUser";
import { WebRTCProvider } from "@/contexts/WebRTCContext";
import CallManager from "@/components/chat-ui/CallManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat App",
  description: "Real-time web chat app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PresenceProvider>
          <ThemeProvider>
            <AuthProvider>
              <WebRTCProvider>
                {currentUser && <PresenceManager currentUser={currentUser} />}
                {currentUser && <CallManager currentUser={currentUser} />}
                <ToasterContext />
                {children}
              </WebRTCProvider>
            </AuthProvider>
          </ThemeProvider>
        </PresenceProvider>
      </body>
    </html>
  );
}
