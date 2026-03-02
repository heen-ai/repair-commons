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
  owner_name: string;
}

function QueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'queued' | 'in-progress' | 'completed'>('all');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [claimingItem, setClaimingItem] = useState<string | null>(null);

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

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated || false);
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

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'queued') return item.status === 'registered' || item.status === 'queued';
    if (filter === 'in-progress') return item.status === 'in_progress';
    if (filter === 'completed') return item.status === 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <a href="/" className="text-green-600 hover:underline text-sm mb-4 inline-block">
          &larr; Back to Events
        </a>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fixer Queue</h1>

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
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.status === 'completed' ? 'bg-green-100 text-green-700' :
                    item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.status === 'in_progress' ? 'In Progress' : item.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">
                    {item.fixer_name ? `Claimed by ${item.fixer_name}` : `Owner: ${item.owner_name}`}
                  </span>
                  {!item.fixer_name && (
                    <button
                      onClick={() => handleClaim(item.id)}
                      disabled={claimingItem === item.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {claimingItem === item.id ? 'Claiming...' : 'Claim'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
