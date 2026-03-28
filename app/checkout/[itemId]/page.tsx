"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface ItemData {
  id: string;
  name: string;
  problem: string;
  owner_name: string;
  fixer_name: string | null;
  status: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const itemId = params.itemId as string;
  const token = searchParams.get("token");

  const [item, setItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [outcome, setOutcome] = useState<string>("");
  const [learnings, setLearnings] = useState("");
  const [repairNotes, setRepairNotes] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [pctElectronic, setPctElectronic] = useState("");
  const [pctMetal, setPctMetal] = useState("");
  const [pctPlastic, setPctPlastic] = useState("");
  const [pctTextile, setPctTextile] = useState("");
  const [pctOther, setPctOther] = useState("");
  const [materialOtherDesc, setMaterialOtherDesc] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/checkout/${itemId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setItem(data.item);
        else setError(data.message);
      })
      .catch(() => setError("Failed to load item"))
      .finally(() => setLoading(false));
  }, [itemId]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) { setError("Please select whether the item was repaired."); return; }

    setSubmitting(true);
    setError(null);

    try {
      // Upload photos first
      const uploadedPhotoUrls: string[] = [];
      for (const photo of photos) {
        const formData = new FormData();
        formData.append("file", photo);
        formData.append("itemId", itemId);
        const uploadRes = await fetch("/api/upload/item-photo", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedPhotoUrls.push(uploadData.url);
        }
      }

      const res = await fetch(`/api/checkout/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          outcome,
          learnings,
          repair_notes: repairNotes,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          pct_electronic: pctElectronic ? parseInt(pctElectronic) : null,
          pct_metal: pctMetal ? parseInt(pctMetal) : null,
          pct_plastic: pctPlastic ? parseInt(pctPlastic) : null,
          pct_textile: pctTextile ? parseInt(pctTextile) : null,
          pct_other: pctOther ? parseInt(pctOther) : null,
          material_other_desc: materialOtherDesc || null,
          repair_photos: uploadedPhotoUrls,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "Failed to submit checkout");
      }
    } catch {
      setError("Something went wrong. Please ask a helper.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">{outcome === "fixed" ? "🎉" : outcome === "partial" ? "🔧" : "💚"}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {outcome === "fixed" ? "Item Fixed!" : outcome === "partial" ? "Partial Fix" : "Thanks for Trying!"}
        </h1>
        {outcome === "fixed" && (
          <p className="text-lg text-green-700 font-semibold mb-4">🔔 Ring the bell!</p>
        )}
        <p className="text-gray-600 mb-6">
          Thank you for coming to London Repair Café! We hope to see you at our next event.
        </p>
        <div className="space-y-3">
          <a href="/events" className="block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600-600 transition-colors">
            See Upcoming Events
          </a>
          <a href="/" className="block text-green-600 hover:underline text-sm">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );

  if (!item) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-600 font-medium">{error || "Item not found"}</p>
        <a href="/checkin" className="text-green-600 hover:underline mt-4 inline-block">Go to Check-in</a>
      </div>
    </div>
  );

  const showWeightAndMaterials = outcome === "fixed" || outcome === "partial";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="text-green-600 hover:underline text-sm mb-3 inline-block"
          >
            ← Go back (opened by mistake)
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Check Out</h1>
            <p className="text-gray-600 mt-1">London Repair Café</p>
          </div>
        </div>

        {/* Item info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="font-semibold text-gray-900 text-lg">{item.name}</h2>
          <p className="text-sm text-gray-600 mt-1">Brought by: {item.owner_name}</p>
          {item.fixer_name && <p className="text-sm text-gray-600">Fixed by: {item.fixer_name}</p>}
          <p className="text-sm text-gray-500 mt-1">Problem: {item.problem}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Was the item repaired? */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Was the item repaired?</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "fixed", label: "Fixed!", emoji: "✅", color: "green" },
                { value: "partial", label: "Partial Fix", emoji: "🔧", color: "yellow" },
                { value: "not_fixed", label: "Not Fixed", emoji: "❌", color: "red" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    outcome === opt.value
                      ? opt.color === "green" ? "border-green-500 bg-green-50" 
                        : opt.color === "yellow" ? "border-yellow-500 bg-yellow-50"
                        : "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.emoji}</div>
                  <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. What did you learn? */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              What did you learn today?
            </label>
            <textarea
              value={learnings}
              onChange={e => setLearnings(e.target.value)}
              placeholder="e.g., I learned how to solder a loose wire, or I learned that my toaster's heating element can't be replaced..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>

          {/* 3. Repair notes (for fixer) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Repair notes <span className="text-gray-400 font-normal">(optional - for the fixer)</span>
            </label>
            <textarea
              value={repairNotes}
              onChange={e => setRepairNotes(e.target.value)}
              placeholder="What was done? What parts were used? Any tips for next time?"
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>

          {/* 4 & 5. Weight and materials - only for fixed/partial */}
          {showWeightAndMaterials && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Item weight (kg)
                </label>
                <p className="text-xs text-gray-500 mb-2">Weigh the item on the scale at the checkout desk</p>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  placeholder="e.g., 2.500"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Estimated material composition (%)
                </label>
                <p className="text-xs text-gray-500 mb-3">Estimate what the item is made of. Doesn&apos;t need to be exact - should add up to roughly 100%.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Electronic", value: pctElectronic, set: setPctElectronic, icon: "⚡" },
                    { label: "Metal", value: pctMetal, set: setPctMetal, icon: "🔩" },
                    { label: "Plastic", value: pctPlastic, set: setPctPlastic, icon: "♻️" },
                    { label: "Textile", value: pctTextile, set: setPctTextile, icon: "🧵" },
                    { label: "Other", value: pctOther, set: setPctOther, icon: "📦" },
                  ].map(field => (
                    <div key={field.label} className="flex items-center gap-2">
                      <span className="text-lg">{field.icon}</span>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600">{field.label}</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={field.value}
                          onChange={e => field.set(e.target.value)}
                          placeholder="%"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {pctOther && parseInt(pctOther) > 0 && (
                  <input
                    type="text"
                    value={materialOtherDesc}
                    onChange={e => setMaterialOtherDesc(e.target.value)}
                    placeholder="Describe 'other' materials (e.g., wood, ceramic)"
                    className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                )}
              </div>
            </>
          )}

          {/* 6. Photos */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Photos <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Snap a selfie with the fixer! Or a photo of the repaired item. Any photo is welcome.
            </p>
            
            {photoPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photoPreviews.map((preview, idx) => (
                  <div key={idx} className="relative">
                    <img src={preview} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <span className="text-2xl block mb-1">📸</span>
              <span className="text-sm text-gray-600">Tap to add a photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoAdd}
              className="hidden"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !outcome}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-green-600-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Complete Check-out"}
          </button>
        </form>
      </div>
    </div>
  );
}
