import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "StockFlow Pro — Manage inventory. Track sales. Grow smarter.",
  description:
    "Professional inventory management and POS system for small businesses, retail shops, warehouses, and more.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}