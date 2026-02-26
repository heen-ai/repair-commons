'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface QueueItem {
  id: string;
  name: string;
  problem: string;
  status: string;
  queue_position: number | null;
  fixer_name: string | null;
  owner_name: string;
}

function QueueContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'queued' | 'in-progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'position' | 'name'>('position');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchQueue();
    }
  }, [eventId, filter, sortBy]);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/queue?filter=${filter}&sort=${sortBy}`);
      const data = await res.json();
      
      if (data.success) {
        setItems(data.items);
        setEventTitle(data.eventTitle);
      } else {
        setError(data.message || 'Failed to load queue');
      }
    } catch (err) {
      setError('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimItem = async (itemId: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/claim-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchQueue();
        setSelectedItem(null);
      } else {
        alert(data.message || 'Failed to claim item');
      }
    } catch (err) {
      alert('Failed to claim item');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (itemId: string, status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/update-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchQueue();
        setSelectedItem(null);
      } else {
        alert(data.message || 'Failed to update item');
      }
    } catch (err) {
      alert('Failed to update item');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Queued</span>;
      case 'in-progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">In Progress</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Completed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{status}</span>;
    }
  };

  const queuedCount = items.filter(i => i.status === 'registered').length;
  const inProgressCount = items.filter(i => i.status === 'in-progress').length;
  const completedCount = items.filter(i => i.status === 'completed').length;

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
          <a href="/" className="mt-4 inline-block text-green-600 hover:underline">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <a href="/" className="text-green-600 hover:underline text-sm mb-4 inline-block">
          ← Back to Events
        </a>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Fixer Queue</h1>
          <p className="text-gray-600">{eventTitle}</p>
          
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-200 rounded-full"></span>
              <span>Queued: {queuedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
              <span>In Progress: {inProgressCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-400 rounded-full"></span>
              <span>Completed: {completedCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'queued', 'in-progress', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    filter === f
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : 
                   f === 'queued' ? 'Queued' : 
                   f === 'in-progress' ? 'In Progress' : 'Completed'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'position' | 'name')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="position">Queue Position</option>
                <option value="name">Item Name</option>
              </select>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No items in queue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {item.queue_position && (
                        <span className="text-sm text-gray-400">#{item.queue_position}</span>
                      )}
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.problem}</p>
                    <p className="text-xs text-gray-400 mt-1">Owner: {item.owner_name}</p>
                  </div>
                  {item.fixer_name && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Claimed by</p>
                      <p className="text-sm font-medium text-blue-600">{item.fixer_name}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Item Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">Problem</p>
                <p className="text-gray-900">{selectedItem.problem}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">Owner</p>
                <p className="text-gray-900">{selectedItem.owner_name}</p>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-gray-900">{getStatusBadge(selectedItem.status)}</p>
                {selectedItem.fixer_name && (
                  <p className="text-sm text-blue-600 mt-1">Claimed by: {selectedItem.fixer_name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                {!selectedItem.fixer_name && selectedItem.status === 'registered' && (
                  <button
                    onClick={() => handleClaimItem(selectedItem.id)}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Claim This Item'}
                  </button>
                )}
                
                {selectedItem.fixer_name && selectedItem.status === 'registered' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedItem.id, 'in-progress')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Start Repair'}
                  </button>
                )}
                
                {selectedItem.status === 'in-progress' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedItem.id, 'completed')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Mark Complete'}
                  </button>
                )}
                
                {selectedItem.status === 'in-progress' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedItem.id, 'registered')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Put Back in Queue'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <QueueContent />
    </Suspense>
  );
}
