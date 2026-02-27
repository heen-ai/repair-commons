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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <header className="bg-white/95 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:shadow-green-300 transition-shadow">
                  <span className="text-white text-xl">🔧</span>
                </div>
                <span className="font-serif text-xl font-bold text-gray-900">London Repair Café</span>
              </Link>
              <nav className="flex items-center gap-1">
                {[
                  { href: "/events", label: "Events" },
                  { href: "/about", label: "About" },
                  { href: "/faq", label: "FAQ" },
                  { href: "/volunteer", label: "Volunteer" },
                  { href: "/contact", label: "Contact" },
                ].map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link 
                  href="/auth/signin" 
                  className="ml-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-lg shadow-green-200 hover:shadow-green-300 transition-all"
                >
                  Sign In
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-gray-400 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🔧</span>
                  <span className="font-serif font-bold text-white">London Repair Café</span>
                </div>
                <p className="text-sm text-gray-500">Community-powered repair events since 2024. Reducing waste, building skills, connecting neighbors.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Quick Links</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/events" className="hover:text-green-400 transition-colors">Upcoming Events</Link></li>
                  <li><Link href="/about" className="hover:text-green-400 transition-colors">About Us</Link></li>
                  <li><Link href="/volunteer" className="hover:text-green-400 transition-colors">Volunteer</Link></li>
                  <li><Link href="/faq" className="hover:text-green-400 transition-colors">FAQ</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Contact</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li>info@reimagineinstitute.ca</li>
                  <li>London, Ontario</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Follow Us</h4>
                <div className="flex gap-3">
                  <a href="https://facebook.com/reimagineinstitute" className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">f</a>
                  <a href="https://instagram.com/reimagineinstitute" className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">📷</a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-600">
              <p>© 2026 London Repair Café. A program of <a href="https://reimagineinstitute.ca" className="text-green-400 hover:underline">Reimagine Institute</a>.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
