"use client";

import { useState, useEffect, useRef } from "react";

interface SearchResult {
  id: string;
  name: string;
  email: string;
  type: "attendee" | "fixer" | "helper";
  items?: string[];
}

export default function CheckinLookupPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/checkin/lookup?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) setResults(data.results);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

  const handleSelect = async (result: SearchResult) => {
    setError(null);
    setSuccess(null);

    if (result.type === "attendee") {
      // Redirect to their registration status page
      try {
        const res = await fetch(`/api/checkin/lookup?action=get_token&userId=${result.id}`);
        const data = await res.json();
        if (data.success && data.registrationId && data.token) {
          window.location.href = `/my-registration/${data.registrationId}?token=${data.token}`;
        } else {
          setError("Could not find your registration. Please ask a helper for assistance.");
        }
      } catch {
        setError("Something went wrong. Please ask a helper.");
      }
    } else {
      // Fixer or helper - send magic link
      try {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: result.email }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccess(`Magic link sent to ${result.email}. Check your email to log in!`);
        } else {
          setError(data.message || "Could not send login link.");
        }
      } catch {
        setError("Something went wrong. Please ask a helper.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rc-navy-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900">London Repair Café</h1>
          <p className="text-gray-600 mt-2">Welcome! Type your name to check in.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSuccess(null); setError(null); }}
            placeholder="Start typing your name..."
            autoFocus
            className="w-full text-lg px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rc-navy focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors"
          />

          {loading && (
            <div className="mt-4 text-center text-gray-500 text-sm">Searching...</div>
          )}

          {results.length > 0 && !success && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Select your name:</p>
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-rc-navy-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      {r.type === "attendee" && r.items && r.items.length > 0 && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          Items: {r.items.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.type === "fixer" ? "bg-orange-100 text-orange-700" :
                      r.type === "helper" ? "bg-purple-100 text-purple-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {r.type === "attendee" ? "Attendee" : r.type === "fixer" ? "Fixer" : "Helper"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="mt-4 text-center text-gray-500">
              <p>No one found with that name.</p>
              <p className="text-sm mt-1">Please check the spelling or ask a helper for assistance.</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-rc-navy-50 border border-green-200 rounded-lg text-rc-navy font-medium">
              {success}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Having trouble? Ask a helper at the welcome desk.
        </p>
      </div>
    </div>
  );
}
