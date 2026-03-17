'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type TabType = 'checkin' | 'queue' | 'greeter';

interface Attendee {
  id: string;
  name: string;
  email: string;
  status: string;
  checked_in_at: string | null;
  items: {
    id: string;
    name: string;
    problem: string;
    status: string;
  }[];
}

interface EventInfo {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  venue_name: string | null;
  venue_address: string | null;
  notes: string | null;
}

interface Stats {
  registrations: {
    total: number;
    checked_in: number;
  };
  items: {
    queued: number;
    in_progress: number;
    completed: number;
  };
  waiting_for_return: {
    count: number;
    items: {
      id: string;
      name: string;
      owner_name: string;
    }[];
  };
}

function VolunteerEventContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('checkin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (eventId) {
      fetchEventInfo();
      fetchStats();
      
      // Auto-refresh every 15 seconds
      const interval = setInterval(() => {
        fetchStats();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const fetchEventInfo = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/stats`);
      const data = await res.json();
      
      if (data.success) {
        setEvent(data.event);
      }
    } catch (err) {
      console.error('Error fetching event info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/stats`);
      const data = await res.json();
      
      if (data.success) {
        setStats({
          registrations: data.registrations,
          items: data.items,
          waiting_for_return: {
            count: data.items.completed - (data.registrations.checked_in || 0), // Simplified
            items: [], // Would need a proper API for this
          },
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.success) {
        setSearchResults(data.attendees || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async (registrationId: string) => {
    setCheckingIn(registrationId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, method: 'search' }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Refresh search results and stats
        handleSearch(searchQuery);
        fetchStats();
      } else {
        alert(data.message || 'Check-in failed');
      }
    } catch (err) {
      alert('Check-in failed');
    } finally {
      setCheckingIn(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600">Could not load event information.</p>
          <a href="/volunteer/dashboard" className="mt-4 inline-block text-green-600 hover:underline">
            Back to Volunteer Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <a href="/volunteer/dashboard" className="text-green-600 hover:underline text-sm">
            ← Back to Dashboard
          </a>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{event.title}</h1>
          <p className="text-xs text-gray-400 mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('checkin')}
              className={`flex-1 py-3 px-4 font-medium text-center ${
                activeTab === 'checkin'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Check-in
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-3 px-4 font-medium text-center ${
                activeTab === 'queue'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Queue
            </button>
            <button
              onClick={() => setActiveTab('greeter')}
              className={`flex-1 py-3 px-4 font-medium text-center ${
                activeTab === 'greeter'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Greeter
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* CHECK-IN TAB */}
            {activeTab === 'checkin' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Check-in Attendees</h2>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 min-h-[44px] text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {searching && (
                  <div className="text-center py-4 text-gray-500">Searching...</div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{attendee.name}</div>
                          <div className="text-sm text-gray-500">{attendee.email}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {attendee.items.length} item(s): {attendee.items.map(i => i.name).join(', ')}
                          </div>
                        </div>
                        {attendee.status === 'checked_in' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            ✓ Checked In
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(attendee.id)}
                            disabled={checkingIn === attendee.id}
                            className="px-4 py-2 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {checkingIn === attendee.id ? 'Checking in...' : 'Check In'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No results found</div>
                )}

                <div className="mt-6 pt-4 border-t">
                  <a
                    href={`/admin/events/${eventId}/walkin?id=${eventId}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Add Walk-in
                  </a>
                </div>
              </div>
            )}

            {/* QUEUE TAB */}
            {activeTab === 'queue' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Queue</h2>
                
                {stats && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-600">{stats.items.queued}</div>
                      <div className="text-sm text-gray-600">Waiting</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-orange-600">{stats.items.in_progress}</div>
                      <div className="text-sm text-gray-600">In Progress</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">{stats.items.completed}</div>
                      <div className="text-sm text-gray-600">Done</div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Summary:</strong>{' '}
                    {stats?.items.queued || 0} people waiting,{' '}
                    {stats?.items.in_progress || 0} repairs in progress,{' '}
                    {stats?.items.completed || 0} done.
                  </p>
                </div>
              </div>
            )}

            {/* GREETER TAB */}
            {activeTab === 'greeter' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Greeter View</h2>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Event Details</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p><strong>Date:</strong> {formatDate(event.date)}</p>
                      <p><strong>Time:</strong> {event.start_time} - {event.end_time}</p>
                      <p><strong>Venue:</strong> {event.venue_name || 'TBD'}</p>
                      {event.venue_address && <p><strong>Address:</strong> {event.venue_address}</p>}
                      <p><strong>Capacity:</strong> {event.capacity}</p>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Check-in Status</h3>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {stats?.registrations.checked_in || 0}
                      <span className="text-lg font-normal text-gray-600"> of {stats?.registrations.total || 0} registered</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats?.registrations.total ? 
                        Math.round((stats.registrations.checked_in / stats.registrations.total) * 100) 
                        : 0}% arrived
                    </p>
                  </div>

                  {event.notes && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900">Notes</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VolunteerEventPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <VolunteerEventContent />
    </Suspense>
  );
}
