'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  name: string;
  problem: string;
  status: string;
  outcome: string | null;
  outcome_notes: string | null;
  queue_position: number | null;
  repair_started_at: string | null;
  repair_completed_at: string | null;
  repair_notes: string | null;
  repair_method: string | null;
  parts_used: string | null;
  fixer_name: string | null;
  ratings: number[] | null;
}

interface EventGroup {
  event_id: string;
  event_title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  items: Item[];
}

interface Stats {
  total: number;
  registered: number;
  inProgress: number;
  completed: number;
  fixed: number;
  partiallyFixed: number;
  notRepairable: number;
}

export default function MyItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itemsByEvent, setItemsByEvent] = useState<EventGroup[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, registered: 0, inProgress: 0, completed: 0, fixed: 0, partiallyFixed: 0, notRepairable: 0
  });

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items/my');
      const data = await res.json();
      
      if (data.success) {
        setItemsByEvent(data.itemsByEvent || []);
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to load items');
      }
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedItem) return;
    
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/items/${selectedItem.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setShowFeedbackModal(false);
        setSelectedItem(null);
        setFeedbackRating(5);
        setFeedbackComment('');
        fetchItems(); // Refresh to show updated rating
      } else {
        alert(data.message || 'Failed to submit feedback');
      }
    } catch (err) {
      alert('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const openFeedbackModal = (item: Item) => {
    setSelectedItem(item);
    setShowFeedbackModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Queued</span>;
      case 'in-progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">In Progress</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Completed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{status}</span>;
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    switch (outcome) {
      case 'fixed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Fixed ✓</span>;
      case 'partially_fixed':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Partially Fixed</span>;
      case 'not_repairable':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Not Repairable</span>;
      case 'needs_parts':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Needs Parts</span>;
      default:
        return null;
    }
  };

  const hasGivenFeedback = (item: Item) => {
    return item.ratings && item.ratings.length > 0;
  };

  const getAverageRating = (item: Item) => {
    if (!item.ratings || item.ratings.length === 0) return 0;
    const sum = item.ratings.reduce((a, b) => a + b, 0);
    return Math.round((sum / item.ratings.length) * 10) / 10;
  };

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-green-600 hover:underline"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-green-600 hover:underline text-sm"
          >
            ← Back to Home
          </button>
          <a
            href="/settings/notifications"
            className="text-green-600 hover:underline text-sm"
          >
            Notification Settings
          </a>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Items</h1>
        <p className="text-gray-600 mb-6">Track all your items across repair events.</p>

        {/* Stats Summary */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Fixed</p>
              <p className="text-2xl font-bold text-green-600">{stats.fixed + stats.partiallyFixed}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Not Repairable</p>
              <p className="text-2xl font-bold text-red-600">{stats.notRepairable}</p>
            </div>
          </div>
        )}

        {itemsByEvent.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">You haven't registered any items yet.</p>
            <a
              href="/events"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Browse Events
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {itemsByEvent.map((eventGroup) => (
              <div key={eventGroup.event_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">{eventGroup.event_title}</h2>
                  <p className="text-sm text-gray-500">
                    {new Date(eventGroup.event_date).toLocaleDateString('en-CA', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })} • {eventGroup.start_time} - {eventGroup.end_time}
                    {eventGroup.venue_name && ` • ${eventGroup.venue_name}`}
                  </p>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {eventGroup.items.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            {getStatusBadge(item.status)}
                            {getOutcomeBadge(item.outcome)}
                            {hasGivenFeedback(item) && (
                              <span className="text-yellow-500">★ {getAverageRating(item)}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{item.problem}</p>
                          
                          {item.fixer_name && (
                            <p className="text-xs text-gray-500 mt-1">Fixer: {item.fixer_name}</p>
                          )}
                          
                          {item.status === 'completed' && (
                            <div className="mt-2">
                              {item.outcome_notes && (
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  <span className="font-medium">Notes:</span> {item.outcome_notes}
                                </p>
                              )}
                              {item.repair_method && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <span className="font-medium">Method:</span> {item.repair_method}
                                </p>
                              )}
                              {item.parts_used && (
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Parts used:</span> {item.parts_used}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {item.status === 'completed' && (
                          <button
                            onClick={() => openFeedbackModal(item)}
                            className={`ml-4 px-3 py-1.5 rounded-lg text-sm font-medium ${
                              hasGivenFeedback(item)
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            }`}
                          >
                            {hasGivenFeedback(item) ? 'Update Feedback' : 'Leave Feedback'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Leave Feedback</h2>
              <p className="text-gray-600 mb-4">
                How was your repair experience for <strong>{selectedItem.name}</strong>?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl ${
                        star <= feedbackRating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (optional)
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Tell us about your experience..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
