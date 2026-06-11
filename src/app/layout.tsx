import type { Metadata } from "next";
import "@shopify/polaris/build/esm/styles.css";

import { PolarisProvider } from "@/components/polaris-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "LBS Birthday Campaign",
  description: "Internal dashboard for birthday metafield scanning and customer tagging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PolarisProvider>{children}</PolarisProvider>
      </body>
    </html>
  );
}
