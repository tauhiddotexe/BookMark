import "./globals.css";

import { Manrope } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";

export const metadata = { title: "Bookmark", description: "A social book review platform inspired by Letterboxd." };

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <ToastProvider>
          <SiteHeader />
          <main className="shell app-shell">
            <div className="page">{children}</div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
