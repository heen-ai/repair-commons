'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface NextItem {
  id: string;
  name: string;
  problem: string;
  item_type: string;
  queue_position: number | null;
  owner_name: string;
  match_reason: 'interest' | 'pre_assigned' | 'queue';
  fixer_notes?: string;
}

interface ActiveItem {
  id: string;
  name: string;
  problem: string;
  item_type: string;
  status: string;
  owner_name: string;
  repair_started_at: string | null;
}

interface BrowseItem {
  id: string;
  name: string;
  problem: string;
  item_type: string;
  queue_position: number | null;
  owner_name: string;
  my_interest: boolean;
  total_interest: number;
  interested_fixers: string | null;
}

export default function FixerMyWorkPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [tab, setTab] = useState<'active' | 'next' | 'browse'>('active');
  const [fixerName, setFixerName] = useState('');
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [nextItem, setNextItem] = useState<NextItem | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [browseItems, setBrowseItems] = useState<BrowseItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMyItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/queue`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveItems((data.items || []).filter((i: ActiveItem) => ['in_progress', 'fixer_assigned'].includes(i.status)));
      setCompletedCount((data.items || []).filter((i: ActiveItem) => ['fixed', 'unfixable', 'completed'].includes(i.status)).length);
    } catch {}
  }, [eventId]);

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) return;
      const data = await res.json();
      setFixerName(data.user?.name || '');
    } catch {}
    setLoading(false);
  }, []);

  const fetchNextItem = useCallback(async () => {
    setNextLoading(true);
    try {
      const skip = skippedIds.join(',');
      const res = await fetch(`/api/fixer/events/${eventId}/next-item${skip ? `?skip=${skip}` : ''}`);
      const data = await res.json();
      setNextItem(data.item);
    } catch {}
    setNextLoading(false);
  }, [eventId, skippedIds]);

  const fetchBrowseQueue = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/browse-queue`);
      const data = await res.json();
      setBrowseItems(data.items || []);
    } catch {}
    setBrowseLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchAuth();
    fetchMyItems();
  }, [fetchAuth, fetchMyItems]);

  useEffect(() => {
    if (tab === 'next') fetchNextItem();
    if (tab === 'browse') fetchBrowseQueue();
  }, [tab, fetchNextItem, fetchBrowseQueue]);

  // Auto-refresh active items every 15s
  useEffect(() => {
    const interval = setInterval(fetchMyItems, 15000);
    return () => clearInterval(interval);
  }, [fetchMyItems]);

  const acceptItem = async (itemId: string) => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/accept-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        setNextItem(null);
        setSkippedIds([]);
        setTab('active');
        fetchMyItems();
      } else {
        const data = await res.json();
        alert(data.error || 'Item no longer available');
        fetchNextItem();
      }
    } catch {}
    setAccepting(false);
  };

  const skipItem = (itemId: string) => {
    setSkippedIds(prev => [...prev, itemId]);
    setNextItem(null);
  };

  const toggleReady = async () => {
    const newReady = !isReady;
    setIsReady(newReady);
    try {
      await fetch(`/api/fixer/events/${eventId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ready: newReady }),
      });
      if (newReady) setTab('next');
    } catch {}
  };

  // Update skippedIds effect → refetch
  useEffect(() => {
    if (tab === 'next' && skippedIds.length > 0) fetchNextItem();
  }, [skippedIds, tab, fetchNextItem]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const matchLabel = (reason: string) => {
    if (reason === 'interest') return '⭐ You expressed interest';
    if (reason === 'pre_assigned') return '📋 Pre-assigned to you';
    return '📥 Next in queue';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-4">
        <h1 className="text-xl font-bold">{fixerName || 'Fixer'}</h1>
        <p className="text-green-200 text-sm">
          {activeItems.length} active repair{activeItems.length !== 1 ? 's' : ''} · {completedCount} completed
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        {(['active', 'next', 'browse'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'active' ? `My Repairs (${activeItems.length})` : t === 'next' ? 'Next Up' : `Browse Queue (${browseItems.length})`}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Active tab */}
        {tab === 'active' && (
          <div>
            {activeItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No active repairs right now</p>
                <button
                  onClick={toggleReady}
                  className={`px-6 py-3 rounded-xl text-lg font-bold transition-all ${
                    isReady
                      ? 'bg-green-100 text-green-700 border-2 border-green-500'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isReady ? '✓ Ready for Next Item' : 'Ready for Next Item'}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  {isReady ? 'Helpers can see you\'re available' : 'Let helpers know you\'re free'}
                </p>
                <button
                  onClick={() => setTab('next')}
                  className="mt-4 text-green-600 font-medium text-sm hover:underline"
                >
                  Or pick your next item →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeItems.map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.owner_name}</p>
                        <p className="text-sm text-gray-500 mt-1">{item.problem}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                        {item.status === 'in_progress' ? 'Repairing' : 'Assigned'}
                      </span>
                    </div>
                    <a
                      href={`/fixer/events/${eventId}/checkout/${item.id}`}
                      className="mt-3 block text-center bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700"
                    >
                      Complete Repair
                    </a>
                  </div>
                ))}
                {activeItems.length > 0 && (
                  <p className="text-center text-xs text-gray-400 mt-4">
                    Finish your current repair, then check &quot;Next Up&quot; for your next item
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Next Up tab */}
        {tab === 'next' && (
          <div>
            {nextLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Finding your next item...</p>
              </div>
            ) : nextItem ? (
              <div className="bg-white rounded-xl shadow-sm border-2 border-green-300 overflow-hidden">
                <div className="bg-green-50 px-4 py-2">
                  <p className="text-sm font-medium text-green-700">{matchLabel(nextItem.match_reason)}</p>
                </div>
                <div className="p-5">
                  <h3 className="text-2xl font-bold text-gray-900">{nextItem.name}</h3>
                  <p className="text-gray-600 mt-1">Brought by <span className="font-medium">{nextItem.owner_name}</span></p>
                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium text-gray-700">Problem:</p>
                    <p className="text-gray-600">{nextItem.problem}</p>
                  </div>
                  {nextItem.item_type && (
                    <p className="text-xs text-gray-400 mt-2">Type: {nextItem.item_type}</p>
                  )}
                  {nextItem.fixer_notes && (
                    <div className="bg-yellow-50 rounded-lg p-3 mt-3">
                      <p className="text-sm font-medium text-yellow-700">Your notes from earlier:</p>
                      <p className="text-yellow-600 text-sm">{nextItem.fixer_notes}</p>
                    </div>
                  )}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => skipItem(nextItem.id)}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 text-lg"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => acceptItem(nextItem.id)}
                      disabled={accepting}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 text-lg"
                    >
                      {accepting ? 'Accepting...' : 'Accept & Start'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">☕</p>
                <p className="text-xl font-medium text-gray-700">No items waiting right now</p>
                <p className="text-gray-500 mt-2">Take a break! We&apos;ll assign you something when the next item arrives.</p>
                {skippedIds.length > 0 && (
                  <button
                    onClick={() => { setSkippedIds([]); }}
                    className="mt-4 text-green-600 font-medium text-sm hover:underline"
                  >
                    Reset skipped items ({skippedIds.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Browse Queue tab */}
        {tab === 'browse' && (
          <div>
            {browseLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : browseItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No items waiting in the queue</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">{browseItems.length} items waiting. Tap to claim.</p>
                {browseItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:border-green-400 transition-colors ${
                      item.my_interest ? 'border-green-300 bg-green-50' : 'border-gray-200'
                    }`}
                    onClick={() => acceptItem(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          {item.my_interest && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">⭐ Interested</span>}
                        </div>
                        <p className="text-sm text-gray-600">{item.owner_name}</p>
                        <p className="text-xs text-gray-500 truncate">{item.problem}</p>
                        {Number(item.total_interest) > 0 && !item.my_interest && (
                          <p className="text-xs text-gray-400 mt-1">{item.total_interest} fixer{Number(item.total_interest) > 1 ? 's' : ''} interested</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={fetchBrowseQueue}
              className="w-full mt-4 text-center text-sm text-green-600 font-medium hover:underline"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
