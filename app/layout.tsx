import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import 'react-big-calendar/lib/css/react-big-calendar.css';

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--ff-font",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FeelFluent B2B Admin",
  description: "Piattaforma di gestione formazione linguistica aziendale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${nunito.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
