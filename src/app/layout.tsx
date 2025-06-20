import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { NotificationsProvider } from "./components/NotificationsProvider";
import { ItemTooltipProvider } from "@/lib/hooks/useItemTooltip";
import GlobalItemTooltip from "./components/GlobalItemTooltip";
import { DebugProvider } from "./components/DebugProvider";

const roboto = Roboto({weight: "700", subsets: ["latin"]});

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
      >
        <NotificationsProvider>
          <DebugProvider>
            <ItemTooltipProvider>
              {children}
              <GlobalItemTooltip />
            </ItemTooltipProvider>
          </DebugProvider>
        </NotificationsProvider>
      </body>
    </html>
  );
}
