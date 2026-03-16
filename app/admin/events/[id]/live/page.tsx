'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface LiveData {
  event: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string | null;
  };
  stats: {
    total_registered: number;
    checked_in: number;
    items_waiting: number;
    items_in_progress: number;
    items_completed: number;
    fixers_present: number;
  };
  waiting_items: Array<{
    id: string;
    name: string;
    item_type: string;
    problem: string;
    owner_name: string;
    wait_minutes: number;
    queue_position: number | null;
  }>;
  in_progress_items: Array<{
    id: string;
    name: string;
    item_type: string;
    owner_name: string;
    fixer_name: string | null;
    fixer_table: number | null;
    elapsed_minutes: number;
  }>;
  completed_items: Array<{
    id: string;
    name: string;
    item_type: string;
    owner_name: string;
    fixer_name: string | null;
    outcome: string | null;
    repair_completed_at: string;
  }>;
  fixers: Array<{
    id: string;
    name: string;
    table_number: number | null;
    checked_in_at: string;
    current_item_id: string | null;
    current_item_name: string | null;
  }>;
}

function LiveRoomContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<LiveData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (eventId) {
      fetchLiveData();
      // Auto-refresh every 10 seconds
      const interval = setInterval(fetchLiveData, 10000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const fetchLiveData = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/live`);
      const result = await res.json();

      if (result.success) {
        setData(result);
        setLastUpdated(new Date());
      } else {
        setError(result.message || 'Failed to load live data');
      }
    } catch (err) {
      setError('Failed to load live data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getOutcomeBadge = (outcome: string | null) => {
    const colors: Record<string, string> = {
      'fixed': 'bg-green-100 text-green-800',
      'partial_fix': 'bg-teal-100 text-teal-800',
      'not_fixable': 'bg-red-100 text-red-800',
      'needs_parts': 'bg-yellow-100 text-yellow-800',
      'referred': 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      'fixed': 'Fixed',
      'partial_fix': 'Partial Fix',
      'not_fixable': 'Not Fixable',
      'needs_parts': 'Needs Parts',
      'referred': 'Referred',
    };
    if (!outcome) return null;
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[outcome] || 'bg-gray-100 text-gray-800'}`}>
        {labels[outcome] || outcome}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && !data) {
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
          <p className="text-gray-600">{error}</p>
          <a href="/admin/dashboard" className="mt-4 inline-block text-green-600 hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { event, stats, waiting_items, in_progress_items, completed_items, fixers } = data;

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-2 md:px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="flex items-center justify-between mb-2">
          <a href={`/admin/events/${eventId}/dashboard`} className="text-green-600 hover:underline text-sm">
            ← Back to Dashboard
          </a>
          <span className="text-xs text-gray-400">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{event.title}</h1>
              <div className="text-sm text-gray-500 mt-1">
                {formatDate(event.date)} • {event.start_time} - {event.end_time}
                {event.venue_name && ` • ${event.venue_name}`}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap gap-2 md:gap-4">
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-blue-600">{stats.total_registered}</div>
                <div className="text-xs text-gray-600">Registered</div>
              </div>
              <div className="bg-green-50 rounded-lg px-3 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-green-600">{stats.checked_in}</div>
                <div className="text-xs text-gray-600">Checked In</div>
              </div>
              <div className="bg-amber-50 rounded-lg px-3 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-amber-600">{stats.items_waiting}</div>
                <div className="text-xs text-gray-600">Waiting</div>
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-blue-600">{stats.items_in_progress}</div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
              <div className="bg-green-50 rounded-lg px-3 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-green-600">{stats.items_completed}</div>
                <div className="text-xs text-gray-600">Done</div>
              </div>
              <div className="bg-purple-50 rounded-lg px-3 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-purple-600">{stats.fixers_present}</div>
                <div className="text-xs text-gray-600">Fixers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Columns */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WAITING Column - Amber */}
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
          <h2 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            WAITING ({waiting_items.length})
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {waiting_items.length === 0 ? (
              <p className="text-amber-700 text-sm">No items waiting</p>
            ) : (
              waiting_items.map(item => (
                <div key={item.id} className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-amber-600 font-medium whitespace-nowrap">
                      {formatTime(item.wait_minutes)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {item.item_type}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Owner: {item.owner_name}
                  </div>
                  {item.problem && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.problem}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* IN PROGRESS Column - Blue */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h2 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
            IN PROGRESS ({in_progress_items.length})
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {in_progress_items.length === 0 ? (
              <p className="text-blue-700 text-sm">No items in progress</p>
            ) : (
              in_progress_items.map(item => (
                <div key={item.id} className="bg-white rounded-lg border border-blue-200 p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-blue-600 font-medium whitespace-nowrap">
                      {formatTime(item.elapsed_minutes)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {item.item_type}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Owner: {item.owner_name}
                  </div>
                  {item.fixer_name && (
                    <div className="text-sm text-purple-600 mt-1">
                      Fixer: {item.fixer_name}
                      {item.fixer_table && <span className="ml-1 text-xs">(Table {item.fixer_table})</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* DONE Column - Green */}
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <h2 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            DONE ({completed_items.length})
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {completed_items.length === 0 ? (
              <p className="text-green-700 text-sm">No completed items yet</p>
            ) : (
              completed_items.map(item => (
                <div key={item.id} className="bg-white rounded-lg border border-green-200 p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {getOutcomeBadge(item.outcome)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {item.item_type}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Owner: {item.owner_name}
                  </div>
                  {item.fixer_name && (
                    <div className="text-sm text-purple-600 mt-1">
                      Fixed by: {item.fixer_name}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fixers Row */}
      <div className="max-w-7xl mx-auto mt-4">
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <h2 className="text-lg font-bold text-purple-800 mb-3">
            Fixers Present ({fixers.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {fixers.length === 0 ? (
              <p className="text-purple-700 text-sm">No fixers checked in</p>
            ) : (
              fixers.map(fixer => (
                <div
                  key={fixer.id}
                  className={`bg-white rounded-full px-4 py-2 border border-purple-200 shadow-sm flex items-center gap-2 ${
                    fixer.current_item_id ? 'ring-2 ring-purple-400' : ''
                  }`}
                >
                  <span className="font-medium text-gray-900">{fixer.name}</span>
                  {fixer.table_number && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                      Table {fixer.table_number}
                    </span>
                  )}
                  {fixer.current_item_name && (
                    <span className="text-xs text-gray-500">
                      → {fixer.current_item_name}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="max-w-7xl mx-auto mt-2 text-center text-xs text-gray-400">
        Auto-refreshing every 10 seconds
      </div>
    </div>
  );
}

export default function LiveRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <LiveRoomContent />
    </Suspense>
  );
}
