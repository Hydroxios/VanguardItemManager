import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { NotificationsProvider } from "./components/NotificationsProvider";

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
          {children}
        </NotificationsProvider>
      </body>
    </html>
  );
}
