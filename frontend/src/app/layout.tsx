import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header"; // Import the Header component
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Management App",
  description: "Manage your software projects, OpenAPI specs, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={\`\${inter.className} bg-gray-100\`}>
        <Header /> {/* Add Header here */}
        <main>{children}</main> {/* Ensure children are wrapped in a main or other appropriate tag if Header is outside */}
      </body>
    </html>
  );
}
