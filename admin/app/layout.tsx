import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import AdminShell from "../components/AdminShell";

export const metadata: Metadata = {
  title: "Snoopa | Admin & Analytics",
  description: "Tactical Luxury Admin Intelligence for Snoopa",
  icons: {
    icon: "/images/icon-nobg.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
