'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface QueueItem {
  id: string;
  name: string;
  problem: string;
  status: string;
  queue_position: number | null;
  fixer_name: string | null;
  fixer_id: string | null;
  owner_name: string;
  outcome: string | null;
  outcome_notes: string | null;
  parts_used: string | null;
  weight_kg: number | null;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isFixer: boolean;
  isHelper: boolean;
  isAdmin: boolean;
}

function QueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'queued' | 'in-progress' | 'completed'>('all');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [claimingItem, setClaimingItem] = useState<string | null>(null);
  
  // Outcome modal state
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<'fixed' | 'partial_fix' | 'not_fixed' | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [submittingOutcome, setSubmittingOutcome] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!eventId) {
      setError('No event ID');
      setLoading(false);
      return;
    }
    checkAuth();
    fetchQueue();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated || false);
      if (data.user) {
        setAuthUser(data.user);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/queue?filter=${filter}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      } else {
        setError(data.message || 'Failed to load');
      }
    } catch (err) {
      setError('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (itemId: string) => {
    // Check authentication first
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/fixer/events/${eventId}/queue?id=${eventId}`);
      return;
    }

    setClaimingItem(itemId);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/claim-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchQueue();
      } else {
        alert(data.message || 'Failed to claim');
      }
    } catch {
      alert('Failed to claim item');
    } finally {
      setClaimingItem(null);
    }
  };

  const handleOpenOutcomeModal = (item: QueueItem) => {
    setSelectedItem(item);
    setSelectedOutcome(null);
    setOutcomeNotes('');
    setPartsUsed('');
    setWeightKg('');
    setShowOutcomeModal(true);
  };

  const handleSubmitOutcome = async () => {
    if (!selectedItem || !selectedOutcome) return;

    setSubmittingOutcome(true);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/update-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          status: 'completed',
          outcome: selectedOutcome,
          outcome_notes: outcomeNotes,
          parts_used: partsUsed,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowOutcomeModal(false);
        setSelectedItem(null);
        setSuccessMessage('Repair logged! ✓');
        fetchQueue();
      } else {
        alert(data.message || 'Failed to submit outcome');
      }
    } catch {
      alert('Failed to submit outcome');
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const isCurrentUserFixer = (item: QueueItem) => {
    return authUser && item.fixer_id === authUser.id;
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (outcome === 'fixed') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Fixed ✅</span>;
    } else if (outcome === 'partial_fix') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Partial Fix ⚠️</span>;
    } else if (outcome === 'not_fixed') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Not Fixed ❌</span>;
    }
    return null;
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'queued') return item.status === 'registered';
    if (filter === 'in-progress') return item.status === 'in_progress';
    if (filter === 'completed') return item.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <a href="/" className="text-green-600 hover:underline text-sm mb-4 inline-block">
          &larr; Back to Events
        </a>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fixer Queue</h1>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center font-medium">
            {successMessage}
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'queued', 'in-progress', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === f 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500">No items in queue</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.problem}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'completed' ? 'bg-green-100 text-green-700' :
                      item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status === 'in_progress' ? 'In Progress' : item.status}
                    </span>
                    {item.status === 'completed' && item.outcome && getOutcomeBadge(item.outcome)}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">
                    {item.fixer_name ? `Claimed by ${item.fixer_name}` : `Owner: ${item.owner_name}`}
                  </span>
                  
                  {/* State 1: status='registered' - Show Claim button */}
                  {item.status === 'registered' && !item.fixer_id && (
                    <button
                      onClick={() => handleClaim(item.id)}
                      disabled={claimingItem === item.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {claimingItem === item.id ? 'Claiming...' : 'Claim'}
                    </button>
                  )}

                  {/* State 2: status='in-progress' AND current user is fixer - Show Complete Repair */}
                  {item.status === 'in_progress' && isCurrentUserFixer(item) && (
                    <button
                      onClick={() => handleOpenOutcomeModal(item)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                    >
                      <span>✓</span>
                      Complete Repair
                    </button>
                  )}

                  {/* State 3: status='completed' - Show outcome badge for current user */}
                  {item.status === 'completed' && isCurrentUserFixer(item) && item.outcome && getOutcomeBadge(item.outcome)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outcome Modal */}
      {showOutcomeModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Complete Repair — {selectedItem.name}
              </h2>

              {/* Outcome Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repair Outcome
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedOutcome('fixed')}
                    className={`w-full py-4 px-4 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-colors ${
                      selectedOutcome === 'fixed' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    <span>✅</span> Fixed
                  </button>
                  <button
                    onClick={() => setSelectedOutcome('partial_fix')}
                    className={`w-full py-4 px-4 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-colors ${
                      selectedOutcome === 'partial_fix' 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                    }`}
                  >
                    <span>⚠️</span> Partially Fixed
                  </button>
                  <button
                    onClick={() => setSelectedOutcome('not_fixed')}
                    className={`w-full py-4 px-4 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-colors ${
                      selectedOutcome === 'not_fixed' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <span>❌</span> Not Fixed
                  </button>
                </div>
              </div>

              {/* Repair Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repair Notes
                </label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="What did you do? Tips for next time?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                />
              </div>

              {/* Parts Used */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parts Used
                </label>
                <input
                  type="text"
                  value={partsUsed}
                  onChange={(e) => setPartsUsed(e.target.value)}
                  placeholder="e.g. new capacitor, fuse 5A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Weight */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="0.5"
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowOutcomeModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitOutcome}
                  disabled={!selectedOutcome || submittingOutcome}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingOutcome ? 'Submitting...' : 'Submit Outcome'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <QueueContent />
    </Suspense>
  );
}
