'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  item_type: string;
  make: string;
  model: string;
  description: string;
  problem: string;
  status: string;
  fixer_id: string | null;
  ai_suggested_skills: string[];
  comment_count: number;
  interest_count: number;
  user_interested: boolean;
  owner_name: string;
  skill_match: boolean;
  interested_fixers: { id: string; fixer_name: string; notes: string }[];
  photos?: string[];
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  venue_name: string;
}

export default function FixerEventItemsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id;

  const [items, setItems] = useState<Item[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFixer, setIsFixer] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [filters, setFilters] = useState({ skill: '', type: '' });
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [interestNotes, setInterestNotes] = useState('');
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  // Claim feature removed — fixers express interest only, admins assign
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (eventId) {
      checkAuth();
      fetchEventData();
    }
  }, [eventId, filters]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated || false);
    } catch {
      setIsAuthenticated(false);
    }
  };

  const fetchEventData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.skill) params.set('skill', filters.skill);
      if (filters.type) params.set('type', filters.type);

      const res = await fetch(`/api/events/${eventId}/items?${params}`);
      const data = await res.json();

      if (data.success) {
        setItems(data.items);
        setIsFixer(data.isFixer);
        setUserSkills(data.userSkills);
        
        // Fetch event details
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.event) {
          setEvent(eventData.event);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = async (item: Item) => {
    if (!isFixer) {
      // Redirect to signin if not authenticated
      if (!isAuthenticated) {
        router.push(`/auth/signin?redirect=/fixer/events/${eventId}/items`);
        return;
      }
      alert('You must be a registered fixer to express interest');
      return;
    }

    setInterestSubmitting(true);
    try {
      const newInterest = !item.user_interested;
      const res = await fetch(`/api/items/${item.id}/interest`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interested: newInterest,
          notes: interestNotes || null
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchEventData();
        setInterestNotes('');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error updating interest:', error);
    } finally {
      setInterestSubmitting(false);
    }
  };

  // handleClaim removed — interest-only model now

  const loadComments = async (item: Item) => {
    setSelectedItem(item);
    try {
      const res = await fetch(`/api/items/${item.id}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/items/${selectedItem?.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText })
      });
      const data = await res.json();
      if (data.success) {
        setComments([...comments, data.comment]);
        setCommentText('');
        // Update comment count
        setItems(items.map(i => 
          i.id === selectedItem?.id 
            ? { ...i, comment_count: i.comment_count + 1 } 
            : i
        ));
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(String(dateStr).substring(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showNameCard, setShowNameCard] = useState(false);
  const [fixerName, setFixerName] = useState<string>('');

  useEffect(() => {
    // Get logged-in user's name for name card
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => { if (data.user?.name) setFixerName(data.user.name); })
      .catch(() => {});
  }, []);

  // Name Card Overlay - full screen
  if (showNameCard) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={() => setShowNameCard(false)}
      >
        <div className="text-center px-8">
          <p className="text-gray-400 text-lg mb-4 uppercase tracking-widest">Fixer</p>
          <h1 className="text-[12vw] font-black text-gray-900 leading-tight break-words">
            {fixerName || 'Fixer'}
          </h1>
          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-green-600 font-semibold text-xl">Available for repairs</span>
          </div>
        </div>
        <p className="absolute bottom-6 text-gray-300 text-sm">Tap anywhere to exit</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/volunteer/dashboard" className="text-green-200 hover:text-white text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">{event?.title || 'Event Items'}</h1>
          {event && (
            <p className="text-green-100 mt-1">
              {formatDate(event.event_date)} &middot; {event.venue_name}
            </p>
          )}
          <p className="text-green-200 text-sm mt-1">{items.length} items registered</p>
          {isFixer && (
            <button
              onClick={() => setShowNameCard(true)}
              className="mt-3 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Show Name Card
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Filter by type</label>
              <select
                value={filters.type}
                onChange={e => setFilters({ ...filters, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Types</option>
                {Array.from(new Set(items.map(i => i.item_type).filter(Boolean))).sort().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {(filters.skill || filters.type) && (
              <button
                onClick={() => setFilters({ skill: '', type: '' })}
                className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-500">No items found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div 
                key={item.id} 
                className={`bg-white border rounded-lg overflow-hidden transition-shadow hover:shadow-md ${
                  item.skill_match ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        {item.skill_match && (
                          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-200 font-medium">
                            Matches your skills
                          </span>
                        )}
                      </div>
                      {item.item_type && (
                        <p className="text-xs text-gray-400 mb-2">
                          {[item.item_type, item.make, item.model].filter(Boolean).join(' &middot; ')}
                        </p>
                      )}
                      <p className="text-sm text-gray-600"><strong>Problem:</strong> {item.problem || 'Not described'}</p>
                      <p className="text-xs text-gray-400 mt-2">Brought by: {item.owner_name}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                      item.status === 'fixer_assigned' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      item.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      item.status === 'repaired' ? 'bg-green-50 text-green-700 border border-green-200' :
                      'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {item.status === 'fixer_assigned' ? 'Claimed' :
                       item.status === 'registered' ? 'Available' :
                       item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Item photos */}
                  {item.photos && Array.isArray(item.photos) && item.photos.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {item.photos.map((photo: string, idx: number) => (
                        <button key={idx} onClick={() => setLightboxPhoto(photo)} className="flex-shrink-0">
                          <img src={photo} alt={`${item.name} photo ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:border-green-400 transition-colors cursor-pointer" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interested fixers */}
                  {item.interested_fixers && item.interested_fixers.length > 0 && (
                    <p className="text-xs text-gray-400 mt-3">
                      Fixers interested: {item.interested_fixers.map(f => f.fixer_name).join(', ')}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 flex-wrap items-center">
                    {isFixer && (
                      <button
                        onClick={() => handleInterestToggle(item)}
                        disabled={interestSubmitting}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          item.user_interested
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.user_interested ? '✓ Interested' : 'Express Interest'}
                      </button>
                    )}
                    <button
                      onClick={() => loadComments(item)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      Comments {item.comment_count > 0 && `(${item.comment_count})`}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comments Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Comments on {selectedItem.name}</h3>
                  <button onClick={() => setSelectedItem(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
              </div>
              <div className="p-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet. Ask the owner a question!</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {comments.map(comment => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border-l-3 border-green-300">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm text-gray-900">{comment.user_name || comment.author_name}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
                {isAuthenticated && (
                  <form onSubmit={handleCommentSubmit}>
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Ask the item owner a question..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows={3}
                    />
                    <button
                      type="submit"
                      disabled={commentSubmitting || !commentText.trim()}
                      className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      {commentSubmitting ? 'Sending...' : 'Send Question'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Photo Lightbox */}
        {lightboxPhoto && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setLightboxPhoto(null)}>
            <div className="relative max-w-2xl max-h-[80vh]">
              <button onClick={() => setLightboxPhoto(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 shadow-lg text-lg font-bold">
                &times;
              </button>
              <img src={lightboxPhoto} alt="Item photo" className="max-w-full max-h-[80vh] rounded-lg object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
