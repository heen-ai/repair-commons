'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';

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

interface ChecklistCheck {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
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
  const { id: eventId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistCheck[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [includeWaitlist, setIncludeWaitlist] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState<number | null>(null);

  const fetchChecklist = async () => {
    try {
      setChecklistLoading(true);
      const res = await fetch(`/api/admin/events/${eventId}/checklist`);
      const data = await res.json();
      if (data.success) {
        setChecklist(data.checks);
      }
    } catch (err) {
      console.error('Failed to fetch checklist:', err);
    } finally {
      setChecklistLoading(false);
    }
  };

  const sendBulkEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) return;
    
    try {
      setEmailSending(true);
      const res = await fetch(`/api/admin/events/${eventId}/email-attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage,
          include_waitlist: includeWaitlist,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSent(data.sent);
        setEmailSubject('');
        setEmailMessage('');
        setIncludeWaitlist(false);
        setTimeout(() => {
          setShowEmailForm(false);
          setEmailSent(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to send email:', err);
    } finally {
      setEmailSending(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchStats();
      fetchChecklist();
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/admin/events/${eventId}/live?id=${eventId}`}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Live View →
            </a>
            <a
              href={`/admin/events/${eventId}/checkin?id=${eventId}`}
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
            <a
              href={`/admin/events/${eventId}/print-list`}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print List
            </a>
            <a
              href={`/volunteer/events/${eventId}`}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Volunteer View
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

        {/* Pre-event Checklist */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pre-event Checklist</h2>
            <button
              onClick={fetchChecklist}
              className="text-sm text-green-600 hover:underline"
              disabled={checklistLoading}
            >
              {checklistLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="space-y-2">
            {checklist.length === 0 && !checklistLoading && (
              <p className="text-gray-500 text-sm">Loading checklist...</p>
            )}
            {checklist.map((check) => (
              <div key={check.id} className="flex items-center gap-3 text-sm">
                <span className={`text-lg ${
                  check.status === 'ok' ? 'text-green-500' : check.status === 'warn' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {check.status === 'ok' ? '✓' : check.status === 'warn' ? '⚠' : '✕'}
                </span>
                <span className="font-medium text-gray-700">{check.label}:</span>
                <span className="text-gray-600">{check.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email Attendees */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Attendees</h2>
            {!showEmailForm && (
              <button
                onClick={() => setShowEmailForm(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email All Registrants
              </button>
            )}
          </div>

          {emailSent !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 text-sm">Sent to {emailSent} registrant{emailSent !== 1 ? 's' : ''}</p>
            </div>
          )}

          {showEmailForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Your message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeWaitlist"
                  checked={includeWaitlist}
                  onChange={(e) => setIncludeWaitlist(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="includeWaitlist" className="text-sm text-gray-700">
                  Include waitlisted attendees
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={sendBulkEmail}
                  disabled={emailSending || !emailSubject.trim() || !emailMessage.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {emailSending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Email'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailSubject('');
                    setEmailMessage('');
                    setIncludeWaitlist(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
