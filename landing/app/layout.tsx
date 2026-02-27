import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const spaceGrotesk = localFont({
  src: [
    {
      path: "../public/fonts/SpaceGrotesk/SpaceGrotesk-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/SpaceGrotesk/SpaceGrotesk-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/SpaceGrotesk/SpaceGrotesk-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/SpaceGrotesk/SpaceGrotesk-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/SpaceGrotesk/SpaceGrotesk-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Snoopa — Don't Search, Just Snoop",
  description:
    "Snoopa is a conversational AI agent that tracks the topics you care about. From injury reports to market shifts, Snoopa monitors the web 24/7 and notifies you when things change.",
  icons: {
    icon: "/images/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable}`}>{children}</body>
    </html>
  );
}
