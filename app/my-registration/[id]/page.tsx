'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Item {
  id: string;
  name: string;
  problem: string;
  status: string;
  queue_position: number | null;
}

interface Registration {
  id: string;
  status: string;
  position: number;
  event_title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  user_name: string;
  created_at: string;
  items: Item[];
}

function MyRegistrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const regId = searchParams.get('id');
  const token = searchParams.get('token');
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<{ name: string; problem: string }[]>([]);
  const [newItem, setNewItem] = useState({ name: '', problem: '' });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!regId) {
      setError('Missing registration ID');
      setLoading(false);
      return;
    }

    const fetchRegistration = async () => {
      try {
        const url = token 
          ? `/api/registrations/${regId}?token=${token}`
          : `/api/registrations/${regId}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
          setRegistration(data.registration);
          setItems(data.registration.items.map((i: Item) => ({ name: i.name, problem: i.problem })));
        } else {
          setError(data.message || 'Failed to load registration');
        }
      } catch (err) {
        setError('Failed to load registration');
      } finally {
        setLoading(false);
      }
    };

    fetchRegistration();
  }, [regId, token]);

  const handleSaveItems = async () => {
    if (!regId) return;
    setSaving(true);
    
    try {
      const url = token
        ? `/api/registrations/${regId}?token=${token}`
        : `/api/registrations/${regId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Items updated successfully!');
      } else {
        alert(data.message || 'Failed to update items');
      }
    } catch (err) {
      alert('Failed to update items');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    if (newItem.name && newItem.problem) {
      setItems([...items, { ...newItem }]);
      setNewItem({ name: '', problem: '' });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCancelRegistration = async () => {
    if (!regId) return;
    setSaving(true);
    
    try {
      const url = token
        ? `/api/registrations/${regId}?token=${token}`
        : `/api/registrations/${regId}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        alert('Registration cancelled successfully');
        router.push('/');
      } else {
        alert(data.message || 'Failed to cancel registration');
      }
    } catch (err) {
      alert('Failed to cancel registration');
    } finally {
      setSaving(false);
      setShowCancelConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading registration...</p>
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
          <a href="/" className="text-green-600 hover:underline">Go Home</a>
        </div>
      </div>
    );
  }

  if (!registration) return null;

  const eventDate = new Date(registration.event_date).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const venueAddress = [registration.venue_address, registration.venue_city].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <a href="/" className="text-green-600 hover:underline text-sm mb-4 inline-block">
          ← Back to Events
        </a>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-green-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white">{registration.event_title}</h1>
            <p className="text-green-100 mt-1">
              {registration.status === 'registered' ? '✅ Confirmed' : 
               registration.status === 'waitlisted' ? '⏳ Waitlisted' : 
               registration.status === 'cancelled' ? '❌ Cancelled' : registration.status}
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{eventDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">{registration.start_time} - {registration.end_time}</p>
              </div>
              {registration.venue_name && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-medium">{registration.venue_name}</p>
                  {venueAddress && <p className="text-sm text-gray-600">{venueAddress}</p>}
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Position</p>
                <p className="font-medium">#{registration.position || '—'}</p>
              </div>
            </div>

            {registration.status !== 'cancelled' && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold mb-4">Your Items</h2>
                
                {items.length === 0 ? (
                  <p className="text-gray-500 mb-4">No items registered yet.</p>
                ) : (
                  <ul className="space-y-3 mb-4">
                    {items.map((item, index) => (
                      <li key={index} className="flex justify-between items-start bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.problem}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium mb-3">Add New Item</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="e.g., Toaster, Bicycle"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Problem Description</label>
                      <textarea
                        value={newItem.problem}
                        onChange={(e) => setNewItem({ ...newItem, problem: e.target.value })}
                        placeholder="What's wrong with it?"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <button
                      onClick={handleAddItem}
                      disabled={!newItem.name || !newItem.problem}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveItems}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {registration.status !== 'cancelled' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Cancel Registration</h2>
            <p className="text-gray-600 text-sm mb-4">
              If you can no longer attend, please cancel your registration to free up your spot.
            </p>
            
            {showCancelConfirm ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-3">Are you sure you want to cancel?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelRegistration}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    No, Keep
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                Cancel Registration
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <MyRegistrationContent />
    </Suspense>
  );
}
