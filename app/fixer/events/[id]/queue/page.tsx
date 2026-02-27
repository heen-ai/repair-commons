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
  
  // Outcome form state
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: '',
    outcome_notes: '',
    parts_used: '',
  });
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

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

  const handleSubmitOutcome = async () => {
    if (!outcomeForm.outcome) {
      alert('Please select an outcome');
      return;
    }
    
    setSubmittingOutcome(true);
    try {
      const res = await fetch(`/api/fixer/events/${eventId}/items/${selectedItem?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: outcomeForm.outcome,
          outcome_notes: outcomeForm.outcome_notes,
          parts_used: outcomeForm.parts_used,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchQueue();
        setShowOutcomeModal(false);
        setSelectedItem(null);
        setOutcomeForm({ outcome: '', outcome_notes: '', parts_used: '' });
      } else {
        alert(data.message || 'Failed to log outcome');
      }
    } catch (err) {
      alert('Failed to log outcome');
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const openOutcomeModal = () => {
    setOutcomeForm({ outcome: '', outcome_notes: '', parts_used: '' });
    setShowOutcomeModal(true);
  };

  const getStatusBadge = (status: string, outcome?: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Queued</span>;
      case 'in-progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">In Progress</span>;
      case 'completed':
        // Show outcome badge
        if (outcome === 'fixed') {
          return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✅ Fixed</span>;
        } else if (outcome === 'partial_fix') {
          return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">🔧 Partial Fix</span>;
        } else if (outcome === 'not_fixable') {
          return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">❌ Not Fixable</span>;
        } else if (outcome === 'needs_parts') {
          return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">🔩 Needs Parts</span>;
        } else if (outcome === 'referred') {
          return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">📤 Referred</span>;
        }
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
                      {getStatusBadge(item.status, item.outcome)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.problem}</p>
                    <p className="text-xs text-gray-400 mt-1">Owner: {item.owner_name}</p>
                    {item.outcome_notes && item.status === 'completed' && (
                      <p className="text-xs text-gray-500 mt-2 italic">"{item.outcome_notes}"</p>
                    )}
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
        {selectedItem && !showOutcomeModal && (
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
                <p className="text-gray-900">{getStatusBadge(selectedItem.status, selectedItem.outcome)}</p>
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
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedItem.id, 'in-progress')}
                      disabled={updating}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updating ? 'Processing...' : 'Start Repair'}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedItem.id, 'registered')}
                      disabled={updating}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    >
                      {updating ? 'Processing...' : 'Release (Put Back in Queue)'}
                    </button>
                  </>
                )}
                
                {selectedItem.status === 'in-progress' && (
                  <button
                    onClick={openOutcomeModal}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Log Repair Outcome'}
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

        {/* Repair Outcome Modal */}
        {selectedItem && showOutcomeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Log Repair Outcome</h2>
                <button
                  onClick={() => setShowOutcomeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Item: <span className="font-medium">{selectedItem.name}</span>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outcome *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'fixed', label: '✅ Fixed', desc: 'Item is fully repaired' },
                    { value: 'partial_fix', label: '🔧 Partial Fix', desc: 'Partially working' },
                    { value: 'not_fixable', label: '❌ Not Fixable', desc: 'Cannot be repaired' },
                    { value: 'needs_parts', label: '🔩 Needs Parts', desc: 'Requires parts to complete' },
                    { value: 'referred', label: '📤 Referred', desc: 'Sent to another repairer' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setOutcomeForm({ ...outcomeForm, outcome: option.value })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        outcomeForm.outcome === option.value
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (What was done, what's still needed)
                </label>
                <textarea
                  value={outcomeForm.outcome_notes}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome_notes: e.target.value })}
                  placeholder="Describe the repair work completed..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows={3}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parts Used (Optional)
                </label>
                <input
                  type="text"
                  value={outcomeForm.parts_used}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, parts_used: e.target.value })}
                  placeholder="e.g., Replacement belt, new fuse"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOutcomeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitOutcome}
                  disabled={submittingOutcome || !outcomeForm.outcome}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submittingOutcome ? 'Saving...' : 'Save Outcome'}
                </button>
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
