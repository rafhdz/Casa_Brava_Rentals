import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Casa Brava Rentals",
  description: "Sistema de reservaciones para casa privada — acceso por invitación.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-neutral-900">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-w-0 flex-1">{children}</main>
            <Footer />
            {/* Paleta minimalista en escala de grises (ver CLAUDE.md) en vez
                del look "richColors" por defecto de sonner — success/error se
                distinguen con el mismo texto neutral-900, no con verde/rojo. */}
            <Toaster
              position="top-center"
              toastOptions={{
                unstyled: true,
                classNames: {
                  toast:
                    "flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-lg",
                  title: "font-medium",
                  description: "text-neutral-500",
                  actionButton:
                    "rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white",
                  cancelButton:
                    "rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600",
                  closeButton:
                    "border-neutral-200 bg-white text-neutral-500",
                  error: "border-red-200 bg-red-50 text-red-800",
                  success: "border-green-200 bg-green-50 text-green-800",
                },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
