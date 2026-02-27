import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "London Repair Café",
  description: "Community-powered repair events. Fix your stuff, save money, reduce waste.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🔧</span>
              </div>
              <span className="font-bold text-gray-900">London Repair Café</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/events" className="text-gray-600 hover:text-gray-900">Events</Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900">About</Link>
              <Link href="/faq" className="text-gray-600 hover:text-gray-900">FAQ</Link>
              <Link href="/volunteer" className="text-gray-600 hover:text-gray-900">Volunteer</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
              <Link href="/auth/signin" className="text-green-600 hover:text-green-700 font-medium">Sign In</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-gray-900 text-gray-400 py-8">
          <div className="max-w-5xl mx-auto px-4 text-center text-sm">
            <p>&copy; 2026 London Repair Café. Community-powered repair events.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
