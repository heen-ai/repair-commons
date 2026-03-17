'use client';

import { useEffect, useState } from 'react';

interface Registration {
  id: string;
  name: string;
  email: string;
  status: string;
  qr_code: string;
  checked_in_at: string | null;
  registered_at: string;
  items: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string | null;
  venue_address: string | null;
}

interface PrintListContentProps {
  eventId: string;
}

export default function PrintListContent({ eventId }: PrintListContentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/print-list`);
      const data = await res.json();
      
      if (data.success) {
        setEvent(data.event);
        setRegistrations(data.registrations);
      } else {
        setError(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
          <a href={`/admin/events/${eventId}/dashboard`} className="mt-4 inline-block text-green-600 hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const checkedInCount = registrations.filter(r => r.status === 'checked_in').length;

  return (
    <>
      {/* Print button - hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save PDF
        </button>
      </div>

      {/* Back link - hidden when printing */}
      <div className="no-print fixed top-4 left-4 z-50">
        <a
          href={`/admin/events/${eventId}/dashboard`}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
        >
          ← Back to Dashboard
        </a>
      </div>

      {/* Print-friendly content */}
      <div className="min-h-screen bg-white p-8">
        {/* Header - shows event info */}
        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">{event?.title}</h1>
          <div className="mt-2 text-gray-600">
            <p>{formatDate(event?.date || '')}</p>
            <p>{event?.start_time} - {event?.end_time}</p>
            {event?.venue_name && <p>{event.venue_name}{event?.venue_address && ` - ${event.venue_address}`}</p>}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {checkedInCount} of {registrations.length} checked in
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 pr-4 w-8">#</th>
              <th className="text-left py-2 pr-4">Name</th>
              <th className="text-left py-2 pr-4">Items</th>
              <th className="text-left py-2 pr-4 w-16">Check-in</th>
              <th className="text-left py-2">QR Code</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg, index) => (
              <tr key={reg.id} className="border-b border-gray-200">
                <td className="py-2 pr-4 text-gray-500">{index + 1}</td>
                <td className="py-2 pr-4">
                  <div className="font-medium">{reg.name}</div>
                  <div className="text-sm text-gray-500">{reg.email}</div>
                </td>
                <td className="py-2 pr-4 text-sm">{reg.items || '-'}</td>
                <td className="py-2 pr-4">
                  {reg.status === 'checked_in' ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="inline-block w-5 h-5 border border-gray-300 rounded"></span>
                  )}
                </td>
                <td className="py-2 font-mono text-xs">{reg.qr_code}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-sm text-gray-400">
          Printed: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          table {
            font-size: 12px;
          }
          th, td {
            padding: 4px !important;
          }
        }
      `}</style>
    </>
  );
}
