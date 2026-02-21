"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Item { name: string; problem: string; }

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Record<string, string | number> | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<Item[]>([{ name: "", problem: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/events/${params.id}`).then(r => r.json()).then(d => setEvent(d.event));
  }, [params.id]);

  const addItem = () => setItems([...items, { name: "", problem: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof Item, val: string) => {
    const updated = [...items];
    updated[i][field] = val;
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { setError("Name and email are required"); return; }
    const validItems = items.filter(i => i.name.trim() && i.problem.trim());
    if (validItems.length === 0) { setError("Please add at least one item to repair"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: params.id, email, name, items: validItems }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); setLoading(false); return; }
      setSuccess(data);
      setStep(3);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (!event) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;

  const formatTime = (t: string) => { const [h,m] = t.split(":"); const hr = parseInt(h); return `${hr>12?hr-12:hr}:${m} ${hr>=12?"PM":"AM"}`; };

  if (step === 3 && success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center text-3xl">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re registered!</h1>
          <p className="text-gray-600 mb-6">We&apos;ve saved your spot. A confirmation email is on its way.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
            <p className="font-medium text-gray-900">{event.title}</p>
            <p className="text-gray-600">{new Date(String(event.date)).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</p>
            <p className="text-gray-600">{formatTime(String(event.start_time))} - {formatTime(String(event.end_time))}</p>
            <p className="text-gray-600">{event.venue_name}, {event.venue_address}</p>
          </div>
          <Link href="/events" className="text-green-600 hover:text-green-700 font-medium">Browse more events &rarr;</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/events/${params.id}`} className="text-green-600 hover:text-green-700 text-sm mb-4 inline-block">&larr; Back to event</Link>

      <div className="bg-green-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-green-900">{event.title}</h2>
        <p className="text-green-700 text-sm">
          {new Date(String(event.date)).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })} &middot; {formatTime(String(event.start_time))} - {formatTime(String(event.end_time))}
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>{s}</div>
            <span className="text-sm text-gray-600 hidden sm:inline">{s === 1 ? "Your info" : "Your items"}</span>
            {s < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>
          <button onClick={() => { if (name && email) { setError(""); setStep(2); } else setError("Please fill in your name and email"); }} className="mt-6 w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            Next: Add Your Items &rarr;
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">What do you want to fix?</h3>
          <p className="text-gray-500 text-sm mb-4">Tell us about the items you&apos;d like repaired</p>
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Item {i + 1}</span>
                  {items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-500 text-sm hover:text-red-700">Remove</button>}
                </div>
                <div className="space-y-3">
                  <input type="text" value={item.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="What is it? (e.g. Toaster, Lamp, Jeans)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <textarea value={item.problem} onChange={e => updateItem(i, "problem", e.target.value)} placeholder="What's wrong with it?" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="mt-3 text-green-600 hover:text-green-700 text-sm font-medium">+ Add another item</button>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Back</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
              {loading ? "Registering..." : "Complete Registration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
