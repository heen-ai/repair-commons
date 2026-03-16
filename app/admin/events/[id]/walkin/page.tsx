'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface WalkInResult {
  success: boolean;
  registration?: {
    id: string;
    qr_code: string;
    status: string;
    checked_in_at: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  item?: {
    id: string;
    name: string;
    problem: string;
    item_type: string | null;
  };
  message?: string;
}

function WalkInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('id');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    item_name: '',
    item_problem: '',
    item_type: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<WalkInResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/walkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to create walk-in registration');
      }
    } catch (err) {
      setError('Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setFormData({
      name: '',
      email: '',
      item_name: '',
      item_problem: '',
      item_type: '',
    });
    setResult(null);
    setError('');
  };

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Missing Event ID</h2>
          <p className="text-gray-600">Please access this page from the check-in screen.</p>
          <a href="/admin/dashboard" className="mt-4 inline-block text-green-600 hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4">
          <a 
            href={`/admin/events/${eventId}/checkin?id=${eventId}`} 
            className="text-green-600 hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Check-in
          </a>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-800 mb-4">Walk-in Registered!</h2>
            
            <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
              <p className="font-semibold text-lg">{result.user?.name}</p>
              {result.user?.email && !result.user.email.startsWith('walkin-') && (
                <p className="text-gray-500 text-sm">{result.user?.email}</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">Item</p>
              <p className="font-medium">{result.item?.name}</p>
              <p className="text-sm text-gray-600">{result.item?.problem}</p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">QR Code</p>
              <p className="font-mono text-lg bg-gray-100 p-2 rounded">{result.registration?.qr_code}</p>
            </div>

            <button
              onClick={handleAddAnother}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              + Add Another Walk-in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <a 
          href={`/admin/events/${eventId}/checkin?id=${eventId}`} 
          className="text-green-600 hover:underline text-sm mb-4 inline-block"
        >
          ← Back to Check-in
        </a>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Add Walk-in</h1>
          <p className="text-gray-500 mb-6">Register someone who showed up without booking</p>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Their name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="For confirmation (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item to Repair <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., Toaster, Bicycle, Lamp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Problem Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.item_problem}
                onChange={(e) => setFormData({ ...formData, item_problem: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="What's wrong with it?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Type <span className="text-gray-400">(optional)</span>
              </label>
              <select
                value={formData.item_type}
                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select type (optional)</option>
                <option value="electrical">Electrical</option>
                <option value="mechanical">Mechanical</option>
                <option value="textile">Textile</option>
                <option value="woodwork">Woodwork</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Walk-in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function WalkInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <WalkInContent />
    </Suspense>
  );
}
