"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/contact", label: "Contact" },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isFixer: boolean;
  isHelper: boolean;
  isAdmin: boolean;
  isVolunteer: boolean;
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/status")
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            
            <span className="font-serif text-xl font-bold text-gray-900">London Repair Café</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
              >
                {link.label}
              </Link>
            ))}
            {loading ? (
              <span className="ml-2 px-4 py-2 text-sm text-gray-400">Loading...</span>
            ) : user ? (
              <>
                {user.isAdmin && (
                  <Link href="/admin" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all">
                    Admin
                  </Link>
                )}
                {(user.isVolunteer || user.isAdmin) && (
                  <Link href="/volunteer/dashboard" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all">
                    My Dashboard
                  </Link>
                )}
                <Link href="/my-items" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all">
                  My Items
                </Link>
                <button onClick={handleSignOut} className="ml-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all">
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                href="/auth/signin" 
                className="ml-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-600-600 rounded-lg shadow-lg shadow-green-200 hover:shadow-green-300 transition-all"
              >
                Sign In
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button 
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden py-4 border-t border-green-100 mt-3 -mx-4 px-4 space-y-2">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                {user.isAdmin && (
                  <Link href="/admin" className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                    Admin
                  </Link>
                )}
                {(user.isVolunteer || user.isAdmin) && (
                  <Link href="/volunteer/dashboard" className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                    My Dashboard
                  </Link>
                )}
                <Link href="/my-items" className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                  My Items
                </Link>
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="block w-full text-left px-4 py-3 text-base font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg">
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                href="/auth/signin" 
                className="block mt-4 text-center px-4 py-3 text-base font-semibold text-white bg-green-600 hover:bg-green-600-600 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
