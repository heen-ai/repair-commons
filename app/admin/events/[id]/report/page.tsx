'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ReportData {
  event: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    venue_address: string;
    venue_city: string;
  };
  summary: {
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    registeredItems: number;
    totalRegistrations: number;
    checkedIn: number;
    checkedOut: number;
    volunteerCount: number;
  };
  outcomes: {
    fixed: number;
    partially_fixed: number;
    not_repairable: number;
    needs_parts: number;
    not_attempted: number;
  };
  successRate: number;
  volunteerHours: number;
  materials: {
    electronic: number;
    metal: number;
    plastic: number;
    textile: number;
    other: number;
    total: number;
  };
}

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchReport();
    }
  }, [eventId]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/report`);
      const data = await res.json();
      
      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.message || 'Failed to load report');
      }
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const rows = [
      ['Impact Report - ' + report.event.title],
      ['Generated:', new Date().toISOString()],
      [],
      ['Summary'],
      ['Total Items', report.summary.totalItems],
      ['Completed Items', report.summary.completedItems],
      ['In Progress', report.summary.inProgressItems],
      ['Queued', report.summary.registeredItems],
      [],
      ['Outcomes'],
      ['Fixed', report.outcomes.fixed],
      ['Partially Fixed', report.outcomes.partially_fixed],
      ['Not Repairable', report.outcomes.not_repairable],
      ['Needs Parts', report.outcomes.needs_parts],
      ['Not Attempted', report.outcomes.not_attempted],
      ['Success Rate', report.successRate + '%'],
      [],
      ['Engagement'],
      ['Total Registrations', report.summary.totalRegistrations],
      ['Checked In', report.summary.checkedIn],
      ['Checked Out', report.summary.checkedOut],
      ['Volunteers', report.summary.volunteerCount],
      ['Volunteer Hours', report.volunteerHours],
      [],
      ['Materials Diverted (kg)'],
      ['Electronic', report.materials.electronic],
      ['Metal', report.materials.metal],
      ['Plastic', report.materials.plastic],
      ['Textile', report.materials.textile],
      ['Other', report.materials.other],
      ['Total', report.materials.total],
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${report.event.date}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            onClick={() => router.push('/admin/dashboard')}
            className="text-green-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const eventDate = new Date(report.event.date).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate outcomes for pie chart
  const outcomeData = [
    { label: 'Fixed', value: report.outcomes.fixed, color: 'bg-green-500' },
    { label: 'Partially Fixed', value: report.outcomes.partially_fixed, color: 'bg-yellow-500' },
    { label: 'Not Repairable', value: report.outcomes.not_repairable, color: 'bg-red-500' },
    { label: 'Needs Parts', value: report.outcomes.needs_parts, color: 'bg-orange-500' },
    { label: 'Not Attempted', value: report.outcomes.not_attempted, color: 'bg-gray-400' },
  ].filter(o => o.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push(`/admin/events/${eventId}/registrations`)}
            className="text-green-600 hover:underline text-sm"
          >
            ← Back to Registrations
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-green-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Impact Report</h1>
            <p className="text-green-100 mt-1">{report.event.title}</p>
            <p className="text-green-100 text-sm">{eventDate} • {report.event.start_time} - {report.event.end_time}</p>
            {report.event.venue_name && (
              <p className="text-green-100 text-sm">{report.event.venue_name}</p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-3xl font-bold text-gray-900">{report.summary.totalItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Repaired</p>
            <p className="text-3xl font-bold text-green-600">{report.summary.completedItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-3xl font-bold text-blue-600">{report.summary.inProgressItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="text-3xl font-bold text-gray-900">{report.successRate}%</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Outcomes Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Outcomes</h2>
            
            {outcomeData.length > 0 ? (
              <div className="space-y-3">
                {outcomeData.map((outcome, idx) => {
                  const percentage = report.summary.totalItems > 0
                    ? Math.round((outcome.value / report.summary.totalItems) * 100)
                    : 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{outcome.label}</span>
                        <span className="text-gray-500">{outcome.value} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${outcome.color} h-2 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No items recorded yet.</p>
            )}
          </div>

          {/* Volunteer & Engagement */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Registrations</span>
                <span className="font-semibold text-gray-900">{report.summary.totalRegistrations}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Checked In</span>
                <span className="font-semibold text-gray-900">{report.summary.checkedIn}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Checked Out</span>
                <span className="font-semibold text-gray-900">{report.summary.checkedOut}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Volunteers</span>
                <span className="font-semibold text-gray-900">{report.summary.volunteerCount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Est. Volunteer Hours</span>
                <span className="font-semibold text-gray-900">{report.volunteerHours} hrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Materials Diverted */}
        {report.materials.total > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Materials Diverted from Landfill</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{report.materials.electronic}</p>
                <p className="text-xs text-gray-500">Electronic (kg)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{report.materials.metal}</p>
                <p className="text-xs text-gray-500">Metal (kg)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{report.materials.plastic}</p>
                <p className="text-xs text-gray-500">Plastic (kg)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{report.materials.textile}</p>
                <p className="text-xs text-gray-500">Textile (kg)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{report.materials.total}</p>
                <p className="text-xs text-gray-500">Total (kg)</p>
              </div>
            </div>
          </div>
        )}

        {/* Environmental Impact Note */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">🌱 Environmental Impact</h3>
          <p className="text-sm text-green-700">
            By repairing {report.outcomes.fixed + report.outcomes.partially_fixed} items instead of replacing them,
            you've helped divert approximately {report.materials.total}kg of materials from the landfill.
            Great job, London Repair Cafe community! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
