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
  outcome?: string;
  outcome_notes?: string;
  parts_used?: string;
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
  
  // Mobile: track if modal is open
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchQueue();
    }
  }, [eventId, filter, sortBy]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!eventId) return;
    
    const interval = setInterval(() => {
      fetchQueue(false); // Don't set loading on refresh
    }, 30000);
    
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchQueue = async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
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
        closeModal();
      } else {
        alert(data.message || 'Failed to claim item');
      }
    } catch (err) {
      alert('Failed to claim item');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (itemId: string, status: string, outcome?: string, outcome_notes?: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/update-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status, outcome, outcome_notes }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchQueue();
        closeModal();
      } else {
        alert(data.message || 'Failed to update item');
      }
    } catch (err) {
      alert('Failed to update item');
    } finally {
      setUpdating(false);
    }
  };

  // Mobile-friendly modal handlers
  const openModal = (item: QueueItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Queued</span>;
      case 'in-progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">In Progress</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Completed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">{status}</span>;
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
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-2xl mx-auto px-3 md:px-4">
        <a href="/" className="text-green-600 hover:underline text-sm mb-4 inline-block">
          ← Back to Events
        </a>

        {/* Header - Mobile optimized */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Fixer Queue</h1>
          <p className="text-gray-600 text-sm md:text-base">{eventTitle}</p>
          
          {/* Stats - Horizontal scroll on mobile if needed */}
          <div className="mt-4 flex gap-3 md:gap-4 text-xs md:text-sm overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 bg-gray-300 rounded-full"></span>
              <span className="font-medium">Queued: <span className="text-gray-900">{queuedCount}</span></span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
              <span className="font-medium">In Progress: <span className="text-blue-700">{inProgressCount}</span></span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
              <span className="font-medium">Completed: <span className="text-green-700">{completedCount}</span></span>
            </div>
          </div>
        </div>

        {/* Filters - Touch-friendly */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* Filter buttons - Large touch targets */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['all', 'queued', 'in-progress', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                    filter === f
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {f === 'all' ? 'All' : 
                   f === 'queued' ? 'Queued' : 
                   f === 'in-progress' ? 'In Progress' : 'Completed'}
                </button>
              ))}
            </div>
            
            {/* Sort - Easy to tap */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'position' | 'name')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[44px]"
              >
                <option value="position">Position</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Queue Items - Mobile optimized cards */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
            <p className="text-gray-500">No items in queue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => openModal(item)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.queue_position && (
                        <span className="text-sm text-gray-400 font-mono">#{item.queue_position}</span>
                      )}
                      <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.problem}</p>
                    <p className="text-xs text-gray-400 mt-1.5">Owner: {item.owner_name}</p>
                  </div>
                  {item.fixer_name && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">Claimed by</p>
                      <p className="text-sm font-medium text-blue-600">{item.fixer_name}</p>
                    </div>
                  )}
                </div>
                
                {/* Quick action button - Very thumb friendly */}
                {!item.fixer_name && item.status === 'registered' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClaimItem(item.id); }}
                    disabled={updating}
                    className="mt-3 w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-base touch-manipulation active:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Claim Item'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mobile Modal - Full screen on mobile, centered on desktop */}
        {isModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
            <div 
              className="bg-white rounded-t-2xl md:rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-900 pr-8">{selectedItem.name}</h2>
                <button
                  onClick={closeModal}
                  className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-4 md:p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Problem</p>
                  <p className="text-gray-900">{selectedItem.problem}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Owner</p>
                  <p className="text-gray-900">{selectedItem.owner_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedItem.status)}</p>
                  {selectedItem.fixer_name && (
                    <p className="text-sm text-blue-600 mt-1">Claimed by: {selectedItem.fixer_name}</p>
                  )}
                </div>

                {/* Outcome section for completed items */}
                {selectedItem.status === 'in-progress' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm text-gray-500 mb-3">Mark repair as:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedItem.id, 'completed', 'fixed', '')}
                        disabled={updating}
                        className="w-full py-4 bg-green-600 text-white rounded-lg font-medium text-base touch-manipulation active:bg-green-700 disabled:opacity-50"
                      >
                        ✅ Fixed!
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedItem.id, 'completed', 'partially_fixed', '')}
                        disabled={updating}
                        className="w-full py-4 bg-yellow-500 text-white rounded-lg font-medium text-base touch-manipulation active:bg-yellow-600 disabled:opacity-50"
                      >
                        ⚠️ Partially Fixed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedItem.id, 'completed', 'not_repairable', '')}
                        disabled={updating}
                        className="w-full py-4 bg-red-500 text-white rounded-lg font-medium text-base touch-manipulation active:bg-red-600 disabled:opacity-50"
                      >
                        ❌ Not Repairable
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedItem.id, 'completed', 'needs_parts', '')}
                        disabled={updating}
                        className="w-full py-4 bg-orange-500 text-white rounded-lg font-medium text-base touch-manipulation active:bg-orange-600 disabled:opacity-50"
                      >
                        🔧 Needs Parts
                      </button>
                    </div>
                  </div>
                )}

                {/* Claim button */}
                {!selectedItem.fixer_name && selectedItem.status === 'registered' && (
                  <button
                    onClick={() => handleClaimItem(selectedItem.id)}
                    disabled={updating}
                    className="w-full py-4 bg-blue-600 text-white rounded-lg font-medium text-base touch-manipulation active:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Claim This Item'}
                  </button>
                )}
                
                {/* Put back in queue */}
                {selectedItem.fixer_name && selectedItem.status === 'registered' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedItem.id, 'in-progress')}
                    disabled={updating}
                    className="w-full py-4 bg-blue-600 text-white rounded-lg font-medium text-base touch-manipulation active:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Start Repair'}
                  </button>
                )}

                {selectedItem.status === 'in-progress' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedItem.id, 'registered')}
                    disabled={updating}
                    className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium text-base touch-manipulation active:bg-gray-300 disabled:opacity-50"
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
