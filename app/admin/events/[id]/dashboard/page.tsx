'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface EventInfo {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  venue_name: string | null;
  venue_address: string | null;
}

interface Stats {
  registrations: {
    total: number;
    registered: number;
    waitlisted: number;
    checked_in: number;
    cancelled: number;
    active: number;
  };
  items: {
    total: number;
    queued: number;
    in_progress: number;
    completed: number;
  };
  outcomes: {
    fixed: number;
    partial_fix: number;
    not_fixable: number;
    needs_parts: number;
    referred: number;
  };
  success_rate: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchStats();
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchStats(true);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await fetch(`/api/admin/events/${eventId}/stats`);
      const data = await res.json();
      
      if (data.success) {
        setEvent(data.event);
        setStats({
          registrations: data.registrations,
          items: data.items,
          outcomes: data.outcomes,
          success_rate: data.success_rate,
        });
        setLastUpdated(new Date());
      } else {
        setError(data.message || 'Failed to load stats');
      }
    } catch (err) {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  if (!event || !stats) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <a href="/admin/dashboard" className="text-green-600 hover:underline text-sm">
            ← Back to Dashboard
          </a>
          <div className="flex items-center gap-2">
            {refreshing && (
              <span className="text-sm text-gray-500 animate-pulse">Refreshing...</span>
            )}
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <div className="mt-2 flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(event.date)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {event.start_time} - {event.end_time}
                </span>
              </div>
              {event.venue_name && (
                <div className="mt-2 text-gray-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.venue_name}
                  {event.venue_address && <span className="text-gray-400">- {event.venue_address}</span>}
                </div>
              )}
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              event.status === 'published'
                ? 'bg-green-100 text-green-800'
                : event.status === 'draft'
                ? 'bg-gray-100 text-gray-800'
                : event.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {event.status}
            </span>
          </div>
        </div>

        {/* Registration Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.registrations.total}</div>
              <div className="text-sm text-gray-600">Total Registered</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.registrations.registered}</div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.registrations.waitlisted}</div>
              <div className="text-sm text-gray-600">Waitlisted</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.registrations.checked_in}</div>
              <div className="text-sm text-gray-600">Checked In</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-600">{stats.registrations.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Item Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.items.total}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.items.queued}</div>
              <div className="text-sm text-gray-600">In Queue</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.items.in_progress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.items.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Outcomes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.outcomes.fixed}</div>
              <div className="text-sm text-gray-600">Fixed</div>
            </div>
            <div className="bg-teal-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-teal-600">{stats.outcomes.partial_fix}</div>
              <div className="text-sm text-gray-600">Partial Fix</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.outcomes.not_fixable}</div>
              <div className="text-sm text-gray-600">Not Fixable</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.outcomes.needs_parts}</div>
              <div className="text-sm text-gray-600">Needs Parts</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.outcomes.referred}</div>
              <div className="text-sm text-gray-600">Referred</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{stats.success_rate}%</div>
              <div className="text-sm text-gray-300">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/admin/events/${eventId}/checkin`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Check-In
            </a>
            <a
              href={`/admin/events/${eventId}/registrations`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View Registrations
            </a>
            <button
              onClick={() => fetchStats()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
            >
              <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Now
            </button>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-4 text-center text-sm text-gray-400">
          Auto-refreshing every 30 seconds
        </div>
      </div>
    </div>
  );
}

export default function EventDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
