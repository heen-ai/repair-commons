'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import pool from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

interface AttendeeInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  checked_in_at: string | null;
  items: { id: string; name: string; problem: string; status: string }[];
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [attendee, setAttendee] = useState<AttendeeInfo | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AttendeeInfo[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchEventInfo();
    }
    return () => {
      stopCamera();
    };
  }, [eventId]);

  const fetchEventInfo = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin-data`);
      const data = await res.json();
      if (data.success) {
        setEventTitle(data.event.title);
        setCheckedInCount(data.checkedInCount);
        setTotalCount(data.totalCount);
      } else {
        setError(data.message || 'Failed to load event');
      }
    } catch (err) {
      setError('Failed to load event info');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
      setMessage(null);
      
      // Start scanning loop
      scanFrame();
    } catch (err) {
      console.error('Camera error:', err);
      setMessage({ type: 'error', text: 'Could not access camera. Try manual search instead.' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = async () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Dynamic import jsqr to avoid SSR issues
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code && code.data !== lastScanned) {
        setLastScanned(code.data);
        await lookupQRCode(code.data);
        stopCamera();
        return;
      }
    }
    
    if (scanning) {
      requestAnimationFrame(scanFrame);
    }
  };

  const lookupQRCode = async (qrCode: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin-lookup?qr=${encodeURIComponent(qrCode)}`);
      const data = await res.json();
      
      if (data.success) {
        setAttendee(data.attendee);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: data.message || 'Registration not found' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error looking up QR code' });
    }
  };

  const handleCheckIn = async () => {
    if (!attendee) return;
    setCheckInLoading(true);
    
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: attendee.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        setAttendee({ ...attendee, status: 'checked_in', checked_in_at: new Date().toISOString() });
        setCheckedInCount(prev => prev + 1);
        setMessage({ type: 'success', text: `✅ Checked in: ${attendee.name}` });
      } else {
        setMessage({ type: 'error', text: data.message || 'Check-in failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Check-in failed' });
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin-search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data.success) {
        setSearchResults(data.attendees);
        if (data.attendees.length === 0) {
          setMessage({ type: 'error', text: 'No attendees found matching that search.' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Search failed' });
    }
  };

  const selectAttendee = (a: AttendeeInfo) => {
    setAttendee(a);
    setSearchResults([]);
    setSearchQuery('');
  };

  const clearAttendee = () => {
    setAttendee(null);
    setLastScanned(null);
    setMessage(null);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <a href="/admin/dashboard" className="text-green-600 hover:underline text-sm mb-4 inline-block">
          ← Back to Dashboard
        </a>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{eventTitle}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">{checkedInCount}</span>
            <span className="text-gray-500">/ {totalCount} checked in</span>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Scan QR Code</h2>
          
          {scanning ? (
            <div className="relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '300px' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white rounded-lg animate-pulse"></div>
              </div>
              <button
                onClick={stopCamera}
                className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              📷 Start Scanning
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Search Manually</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name or email..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-200">
              {searchResults.map(a => (
                <li key={a.id}>
                  <button
                    onClick={() => selectAttendee(a)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-gray-500">{a.email}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {attendee && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Attendee</h2>
              <button onClick={clearAttendee} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="font-medium text-xl">{attendee.name}</p>
              <p className="text-gray-500">{attendee.email}</p>
              <span className={`inline-block mt-2 px-2 py-1 rounded text-sm font-medium ${
                attendee.status === 'checked_in' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {attendee.status === 'checked_in' ? '✅ Checked In' : 'Not Checked In'}
              </span>
              {attendee.checked_in_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Checked in at: {new Date(attendee.checked_in_at).toLocaleTimeString()}
                </p>
              )}
            </div>

            {attendee.items.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Items</h3>
                <ul className="space-y-2">
                  {attendee.items.map(item => (
                    <li key={item.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.problem}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {attendee.status !== 'checked_in' && (
              <button
                onClick={handleCheckIn}
                disabled={checkInLoading}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {checkInLoading ? 'Checking In...' : '✅ Check In'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
