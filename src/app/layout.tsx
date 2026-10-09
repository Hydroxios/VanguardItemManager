import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "../../node_modules/flag-icons/css/flag-icons.min.css";
import "./globals.css";
import { NotificationsProvider } from "./components/NotificationsProvider";
import { DebugProvider } from "@/app/components/debug/DebugProvider";
import { AuthProvider } from "@/lib/hooks/useAuth";
import MotionPreference from "./components/MotionPreference";


import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"


const roboto = Roboto({ weight: "700", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vanguard Item Manager"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.bungie.net" />
      </head>
      <body
        className={`${roboto.className} antialiased`}
        role="main"
      >
        <MotionPreference />
        <NotificationsProvider>
          <AuthProvider>
            <DebugProvider>
              {children}
            </DebugProvider>
          </AuthProvider>
        </NotificationsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
