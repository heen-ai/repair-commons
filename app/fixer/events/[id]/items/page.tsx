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
  ai_suggested_skills: string[];
  comment_count: number;
  interest_count: number;
  user_interested: boolean;
  owner_name: string;
  skill_match: boolean;
  interested_fixers: { id: string; fixer_name: string; notes: string }[];
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

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId, filters]);

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
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/fixer/events" className="text-green-200 hover:text-white mb-2 inline-block">
                ← Back to Events
              </Link>
              <h1 className="text-2xl font-bold">{event?.title || 'Event Items'}</h1>
              {event && (
                <p className="text-green-100">
                  {formatDate(event.event_date)} • {event.venue_name}
                </p>
              )}
            </div>
            <Link
              href="/settings/notifications"
              className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm"
            >
              ⚙️ Notification Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill Category</label>
              <select
                value={filters.skill}
                onChange={e => setFilters({ ...filters, skill: e.target.value })}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">All Skills</option>
                {['electrical', 'electronics', 'textiles', 'mechanical', 'furniture'].map(skill => (
                  <option key={skill} value={skill}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
              <select
                value={filters.type}
                onChange={e => setFilters({ ...filters, type: e.target.value })}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">All Types</option>
                {Array.from(new Set(items.map(i => i.item_type).filter(Boolean))).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ skill: '', type: '' })}
                className="text-amber-600 hover:text-amber-800 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No items found for this event.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map(item => (
              <div 
                key={item.id} 
                className={`bg-white rounded-lg shadow p-4 ${item.skill_match ? 'ring-2 ring-green-500' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.skill_match && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                          ✨ Matches Your Skills
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'repaired' ? 'bg-green-100 text-green-700' :
                        item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {item.item_type} • {item.make} {item.model}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{item.problem}</p>
                    {item.ai_suggested_skills && item.ai_suggested_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.ai_suggested_skills.map((skill: string) => (
                          <span key={skill} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500 ml-4">
                    <div>{item.comment_count} 💬</div>
                    <div>{item.interest_count} 👋</div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => loadComments(item)}
                    className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                  >
                    💬 Comments ({item.comment_count})
                  </button>
                  {isFixer && (
                    <button
                      onClick={() => handleInterestToggle(item)}
                      disabled={interestSubmitting}
                      className={`ml-4 px-3 py-1 rounded text-sm font-medium ${
                        item.user_interested
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {item.user_interested ? '✓ Interested' : '👋 Express Interest'}
                    </button>
                  )}
                  {item.interested_fixers && item.interested_fixers.length > 0 && (
                    <div className="ml-auto text-sm text-gray-500">
                      Fixers interested: {item.interested_fixers.map(f => f.fixer_name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comments Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Comments on {selectedItem.name}</h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {comments.map(comment => (
                      <div key={comment.id} className="bg-gray-50 rounded p-3">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">{comment.user_name}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleCommentSubmit}>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full border rounded-lg p-3 text-sm mb-2"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !commentText.trim()}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {commentSubmitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
