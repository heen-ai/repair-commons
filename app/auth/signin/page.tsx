"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else setError(data.message);
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-600">We sent a sign-in link to <strong>{email}</strong>. Click the link in the email to sign in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Sign In</h1>
        <p className="text-gray-600 text-center mb-6">Enter your email to receive a magic link</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="w-full rounded-lg border border-gray-300 px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
        <p className="text-center text-gray-500 text-sm mt-4">
          <Link href="/events" className="text-green-600 hover:text-green-700">Back to events</Link>
        </p>
      </div>
    </div>
  );
}
