'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

interface StatusItem {
  id: string;
  name: string;
  status: string;
  outcome: string | null;
  outcome_notes: string | null;
  fixer_name: string | null;
  queue_position: number | null;
}

interface StatusData {
  registration: {
    status: string;
    checked_in_at: string | null;
  };
  event: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string | null;
    venue_address: string | null;
  };
  items: StatusItem[];
  queue_position: number;
  queue_total: number;
}

function StatusPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const regId = params.id as string;
  const token = searchParams.get('token');
  
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');

  const fetchStatus = async () => {
    if (!regId || !token) {
      setError('Missing registration ID or token');
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const res = await fetch(`/api/registrations/${regId}/status?token=${token}`);
      const data = await res.json();
      
      if (data.success) {
        setStatusData(data);
        setIsCheckedIn(data.registration.status === 'checked_in');
        setLastUpdated(0);
      } else {
        setError(data.message || 'Failed to load status');
      }
    } catch (err) {
      setError('Failed to load status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [regId, token]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!statusData) return;

    const interval = setInterval(() => {
      setLastUpdated(prev => prev + 30);
      fetchStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [statusData?.queue_position]);

  // Update seconds counter every second
  useEffect(() => {
    if (!statusData) return;
    
    const interval = setInterval(() => {
      setLastUpdated(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [statusData]);

  // Tab title notification when item is in progress (your turn!)
  useEffect(() => {
    if (!statusData) return;
    const hasInProgress = statusData.items?.some((item: { status: string }) => item.status === 'in_progress');
    const almostTurn = statusData.queue_position && statusData.queue_position <= 2;
    const originalTitle = 'London Repair Café';
    
    if (hasInProgress) {
      document.title = '🔧 YOUR ITEM IS BEING REPAIRED!';
      // Try to vibrate on mobile
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else if (almostTurn) {
      document.title = '⚡ Almost your turn!';
    } else {
      document.title = originalTitle;
    }

    // Flash the tab title for attention
    if (hasInProgress || almostTurn) {
      const flash = setInterval(() => {
        document.title = document.title === originalTitle 
          ? (hasInProgress ? '🔧 YOUR ITEM IS BEING REPAIRED!' : '⚡ Almost your turn!')
          : originalTitle;
      }, 1500);
      return () => { clearInterval(flash); document.title = originalTitle; };
    }
  }, [statusData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rc-navy mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="text-rc-navy hover:underline">Go Home</a>
        </div>
      </div>
    );
  }

  if (!statusData) return null;

  const { registration, event, items, queue_position, queue_total } = statusData;
  const isEventDay = new Date(event.date).toDateString() === new Date().toDateString();

  const handleCheckIn = async () => {
    if (!regId || !token) return;
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/registrations/${regId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCheckedIn(true);
        setCheckInMessage("Welcome! You're checked in.");
      } else {
        setCheckInMessage(data.error || 'Check-in failed');
      }
    } catch {
      setCheckInMessage('Check-in failed. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };
  
  // Format date
  const eventDate = new Date(event.date + "T12:00:00").toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">In Queue</span>;
      case 'fixer_assigned':
        return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">Fixer Assigned</span>;
      case 'in-progress':
        return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">Being Repaired</span>;
      case 'completed':
        return <span className="bg-green-100 text-rc-navy px-3 py-1 rounded-full text-sm font-medium">Completed</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">{status}</span>;
    }
  };

  // Check if any item is being worked on
  const itemInProgress = items.find(i => i.status === 'fixer_assigned' || i.status === 'in-progress');
  const completedItems = items.filter(i => i.status === 'completed');
  const waitingItems = items.filter(i => i.status === 'registered');

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
          <div className="bg-rc-navy px-6 py-4">
            <h1 className="text-xl font-bold text-white">{event.title}</h1>
            <p className="text-green-100 mt-1 text-lg">
              {registration.status === 'checked_in' ? '✓ Checked In' : '✓ Registered'}
            </p>
          </div>
          
          <div className="p-6">
            {/* Event Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-lg">{eventDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium text-lg">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
              </div>
              {event.venue_name && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-medium">{event.venue_name}</p>
                  {event.venue_address && <p className="text-sm text-gray-600">{event.venue_address}</p>}
                </div>
              )}
            </div>

            {/* Self-serve check-in button */}
            {!isCheckedIn && isEventDay && (
              <div className="mb-4">
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full bg-rc-navy hover:bg-rc-navy-600 disabled:opacity-50 text-white text-xl font-bold py-4 px-6 rounded-lg transition-colors"
                >
                  {checkingIn ? 'Checking in...' : 'Check In Now'}
                </button>
              </div>
            )}
            {checkInMessage && (
              <div className={`border rounded-lg p-4 mb-4 ${isCheckedIn ? 'bg-rc-navy-50 border-rc-navy-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`font-medium text-lg ${isCheckedIn ? 'text-rc-navy' : 'text-red-800'}`}>
                  {checkInMessage}
                </p>
              </div>
            )}

            {/* Queue Status - Show when checked in */}
            {isCheckedIn && (
              <div className="bg-rc-navy-50 border border-rc-navy-200 rounded-lg p-6 mb-6 text-center">
                <p className="text-rc-navy font-medium mb-2 text-lg">You're in the queue</p>
                {queue_position > 0 ? (
                  <>
                    <p className="text-5xl font-bold text-rc-navy mb-2">#{queue_position}</p>
                    <p className="text-rc-navy">of {queue_total} items</p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-rc-navy">Next up!</p>
                )}
              </div>
            )}

            {/* Item Being Worked On - Highlight */}
            {itemInProgress && (
              <div className="bg-rc-navy-50 border-2 border-green-500 rounded-lg p-4 mb-4">
                <p className="text-rc-navy font-bold text-lg mb-2">
                  ✨ Your {itemInProgress.name} is being repaired!
                </p>
                {itemInProgress.fixer_name && (
                  <p className="text-rc-navy">Fixer: {itemInProgress.fixer_name}</p>
                )}
              </div>
            )}

            {/* Items List */}
            <h2 className="text-lg font-semibold mb-3">Your Items</h2>
            
            {items.length === 0 ? (
              <p className="text-gray-500">No items registered.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`bg-white border rounded-lg p-4 ${
                      item.status === 'completed' ? 'border-rc-navy-200 bg-rc-navy-50' : 
                      item.status === 'in-progress' || item.status === 'fixer_assigned' ? 'border-green-300 bg-rc-navy-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    
                    {/* Completed item outcomes */}
                    {item.status === 'completed' && (
                      <div className="mt-2">
                        {item.outcome === 'fixed' && (
                          <p className="text-rc-navy font-medium text-lg">
                            ✅ Great news! Your {item.name} was fixed!
                          </p>
                        )}
                        {item.outcome === 'partial_fix' && (
                          <p className="text-yellow-700 font-medium">
                            ⚠️ Partially repaired
                            {item.outcome_notes && <span className="block text-sm mt-1">{item.outcome_notes}</span>}
                          </p>
                        )}
                        {item.outcome === 'not_fixed' && (
                          <p className="text-red-700 font-medium">
                            ❌ Unfortunately we couldn't fix your {item.name} today
                            {item.outcome_notes && <span className="block text-sm mt-1">{item.outcome_notes}</span>}
                          </p>
                        )}
                        {item.fixer_name && (
                          <p className="text-gray-600 text-sm mt-1">Fixed by: {item.fixer_name}</p>
                        )}
                      </div>
                    )}
                    
                    {/* In progress info */}
                    {(item.status === 'fixer_assigned' || item.status === 'in-progress') && (
                      <div className="mt-2">
                        {item.fixer_name && (
                          <p className="text-gray-600">Fixer: {item.fixer_name}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Last updated indicator */}
        <div className="text-center text-sm text-gray-500">
          {refreshing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-rc-navy"></span>
              Refreshing...
            </span>
          ) : (
            <span>Updated {lastUpdated > 0 ? `${lastUpdated} seconds ago` : 'just now'}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rc-navy"></div>
      </div>
    }>
      <StatusPageContent />
    </Suspense>
  );
}
