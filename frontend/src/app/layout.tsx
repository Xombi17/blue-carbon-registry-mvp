import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from '@/contexts/AuthContext';
// import { Navbar } from '@/components/layout/Navbar';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Blue Carbon Registry | Protecting Ocean Ecosystems",
  description: "A blockchain-powered registry for blue carbon credits, enabling transparent tracking and verification of mangrove, seagrass, and salt marsh restoration projects.",
  keywords: ["blue carbon", "carbon credits", "blockchain", "ocean conservation", "mangroves", "seagrass", "climate change"],
  authors: [{ name: "Blue Carbon Registry Team" }],
  openGraph: {
    title: "Blue Carbon Registry",
    description: "Protecting Ocean Ecosystems Through Blockchain Technology",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            {/* <Navbar /> */}
            <main>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
