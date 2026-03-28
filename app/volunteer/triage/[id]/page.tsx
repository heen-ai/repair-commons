"use client";
import { useState, useEffect, useCallback } from "react";

interface Fixer { fixer_id: string; name: string; table_number: string | null; items_in_progress: number; }
interface QueueItem { id: string; name: string; problem: string; status: string; queue_position: number | null; owner_name: string; fixer_user_id: string | null; fixer_name: string | null; has_phone: boolean; }
interface TriageData {
  fixers_present: Fixer[];
  queue_items: QueueItem[];
  stats: { fixers_present: number; queued: number; in_progress: number; completed: number; };
}

export default function HelperTriagePage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [data, setData] = useState<TriageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedFixer, setSelectedFixer] = useState<Record<string, string>>({});
  const [showWalkin, setShowWalkin] = useState(false);
  const [walkinForm, setWalkinForm] = useState({ name: '', email: '', item_name: '', item_problem: '', item_type: '', no_phone: false });
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinSuccess, setWalkinSuccess] = useState<string | null>(null);
  const [showCheckinVol, setShowCheckinVol] = useState(false);
  const [volList, setVolList] = useState<{id: string; name: string; is_fixer: boolean; is_helper: boolean; checked_in: boolean}[]>([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showCheckinAttendee, setShowCheckinAttendee] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeResults, setAttendeeResults] = useState<{id: string; name: string; email: string; status: string; item_count: number}[]>([]);
  const [attendeeSearching, setAttendeeSearching] = useState(false);
  const [checkinningAttendee, setCheckinningAttendee] = useState<string | null>(null);

  // Check if user is a helper or admin
  useEffect(() => {
    fetch("/api/auth/status")
      .then(res => res.json())
      .then(d => {
        if (d.authenticated && (d.user?.isHelper || d.user?.isAdmin || d.user?.isFixer)) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      })
      .catch(() => setAuthorized(false));
  }, []);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/volunteer/triage/${eventId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (authorized) {
      fetchData();
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [fetchData, authorized]);

  const assignFixer = async (itemId: string) => {
    const fixerId = selectedFixer[itemId];
    if (!fixerId) return;
    setAssigning(itemId);
    await fetch(`/api/volunteer/triage/${eventId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, fixerId })
    });
    setAssigning(null);
    fetchData();
  };

  if (authorized === null) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );

  if (authorized === false) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Required</h2>
        <p className="text-gray-600 mb-4">You need to be logged in as a helper, fixer, or admin to view this page.</p>
        <a href={`/auth/signin?redirect=/volunteer/triage/${eventId}`}
          className="inline-block bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600">
          Sign In
        </a>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-lg">Loading triage board...</p>
    </div>
  );
  if (!data) return <div className="p-8 text-red-600">Failed to load data.</div>;

  const submitWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinForm.name || !walkinForm.item_name || !walkinForm.item_problem) return;
    setWalkinSubmitting(true);
    try {
      const res = await fetch(`/api/volunteer/triage/${eventId}/walkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walkinForm),
      });
      const d = await res.json();
      if (d.success) {
        setWalkinSuccess(`${walkinForm.name} added to queue with "${walkinForm.item_name}"`);
        setWalkinForm({ name: '', email: '', item_name: '', item_problem: '', item_type: '', no_phone: false });
        fetchData();
        setTimeout(() => { setWalkinSuccess(null); setShowWalkin(false); }, 2000);
      }
    } catch { /* ignore */ }
    setWalkinSubmitting(false);
  };

  const loadVolunteers = async () => {
    setCheckinLoading(true);
    const res = await fetch(`/api/volunteer/triage/${eventId}/checkin-volunteer`);
    if (res.ok) { const d = await res.json(); setVolList(d.volunteers || []); }
    setCheckinLoading(false);
  };

  const checkinVolunteer = async (volId: string, tableNum?: string) => {
    await fetch(`/api/volunteer/triage/${eventId}/checkin-volunteer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerId: volId, tableNumber: tableNum || null }),
    });
    loadVolunteers();
    fetchData();
  };

  const searchAttendees = async (query: string) => {
    if (query.length < 2) { setAttendeeResults([]); return; }
    setAttendeeSearching(true);
    try {
      const res = await fetch(`/api/volunteer/triage/${eventId}/checkin-attendee?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const d = await res.json();
        setAttendeeResults(d.results || []);
      }
    } catch {}
    setAttendeeSearching(false);
  };

  const checkinAttendee = async (registrationId: string) => {
    setCheckinningAttendee(registrationId);
    try {
      const res = await fetch(`/api/volunteer/triage/${eventId}/checkin-attendee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      if (res.ok) {
        setAttendeeSearch('');
        setAttendeeResults([]);
        setShowCheckinAttendee(false);
        fetchData();
      }
    } catch {}
    setCheckinningAttendee(null);
  };

  const queued = data.queue_items.filter(i => (i.status === "queued" || i.status === "registered") && !i.fixer_user_id);
  const inProgress = data.queue_items.filter(i => i.status === "in_progress" || (i.fixer_user_id && i.status !== "completed" && i.status !== "fixed" && i.status !== "unfixable" && i.status !== "cancelled"));
  const completed = data.queue_items.filter(i => i.status === "completed" || i.status === "fixed" || i.status === "unfixable");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Triage Board</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <span>🔧 {data.stats.fixers_present} fixers</span>
              <span>📋 {queued.length} waiting</span>
              <span>⚙️ {inProgress.length} in progress</span>
              <span>✅ {completed.length} done</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowCheckinAttendee(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              Check in Attendee
            </button>
            <button
              onClick={() => { setShowCheckinVol(true); loadVolunteers(); }}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              Check in Volunteer
            </button>
            <button
              onClick={() => setShowWalkin(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              + Walk-in
            </button>
          </div>
        </div>
      </div>

      {/* Walk-in modal */}
      {showWalkin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowWalkin(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {walkinSuccess ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-lg font-semibold text-gray-900">{walkinSuccess}</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Add Walk-in</h2>
                <p className="text-sm text-gray-500 mb-4">Register someone who showed up without booking</p>
                <form onSubmit={submitWalkin} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" required value={walkinForm.name} onChange={e => setWalkinForm(f => ({...f, name: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Their name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400">(optional)</span></label>
                    <input type="email" value={walkinForm.email} onChange={e => setWalkinForm(f => ({...f, email: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="For sending them their status page" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item to Repair *</label>
                    <input type="text" required value={walkinForm.item_name} onChange={e => setWalkinForm(f => ({...f, item_name: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., Toaster, Bicycle, Lamp" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">What&apos;s wrong with it? *</label>
                    <textarea required rows={2} value={walkinForm.item_problem} onChange={e => setWalkinForm(f => ({...f, item_problem: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Brief description of the problem" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Type <span className="text-gray-400">(optional)</span></label>
                    <select value={walkinForm.item_type} onChange={e => setWalkinForm(f => ({...f, item_type: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500">
                      <option value="">Select type</option>
                      <option value="electrical">Electrical</option>
                      <option value="mechanical">Mechanical</option>
                      <option value="textile">Textile</option>
                      <option value="woodwork">Woodwork</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={walkinForm.no_phone} onChange={e => setWalkinForm(f => ({...f, no_phone: e.target.checked}))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                    <span className="text-sm text-gray-700">No phone <span className="text-gray-400">(analog guest - helper will manage their status)</span></span>
                  </label>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowWalkin(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={walkinSubmitting}
                      className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                      {walkinSubmitting ? 'Adding...' : 'Add to Queue'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Check in volunteer modal */}
      {showCheckinVol && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCheckinVol(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Check in Volunteer</h2>
            <p className="text-sm text-gray-500 mb-4">Mark fixers/helpers as present for today</p>
            {checkinLoading ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div></div>
            ) : (
              <div className="space-y-2">
                {volList.length === 0 && <p className="text-gray-500 text-sm">No volunteers RSVP&apos;d for this event.</p>}
                {volList.map(v => (
                  <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg border ${v.checked_in ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <div>
                      <p className="font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-500">{v.is_fixer ? 'Fixer' : 'Helper'}</p>
                    </div>
                    {v.checked_in ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Present</span>
                    ) : (
                      <button
                        onClick={() => checkinVolunteer(v.id)}
                        className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 font-medium"
                      >
                        Check in
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowCheckinVol(false)} className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Check in attendee modal */}
      {showCheckinAttendee && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCheckinAttendee(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Check in Attendee</h2>
            <p className="text-sm text-gray-500 mb-4">Search by name to check someone in</p>
            <input
              type="text"
              value={attendeeSearch}
              onChange={(e) => { setAttendeeSearch(e.target.value); searchAttendees(e.target.value); }}
              placeholder="Type a name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
              autoFocus
            />
            {attendeeSearching && <p className="text-sm text-gray-400 mt-2">Searching...</p>}
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {attendeeResults.map(r => (
                <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${r.status === 'checked_in' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                  <div>
                    <p className="font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.item_count} item{r.item_count !== 1 ? 's' : ''}</p>
                  </div>
                  {r.status === 'checked_in' ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Already in</span>
                  ) : (
                    <button
                      onClick={() => checkinAttendee(r.id)}
                      disabled={checkinningAttendee === r.id}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                    >
                      {checkinningAttendee === r.id ? 'Checking in...' : 'Check in'}
                    </button>
                  )}
                </div>
              ))}
              {attendeeSearch.length >= 2 && !attendeeSearching && attendeeResults.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No registrations found for &quot;{attendeeSearch}&quot;</p>
              )}
            </div>
            <button onClick={() => { setShowCheckinAttendee(false); setAttendeeSearch(''); setAttendeeResults([]); }} className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 p-4 max-w-7xl mx-auto">
        {/* Left column: Fixers + In Progress */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Fixers Present ({data.fixers_present.length})</h2>
          <div className="space-y-2">
            {data.fixers_present.length === 0 && <p className="text-gray-500 text-sm">No fixers checked in yet.</p>}
            {data.fixers_present.map(f => (
              <div key={f.fixer_id} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{f.name}</p>
                    {f.table_number && <p className="text-sm text-gray-500">Table {f.table_number}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${Number(f.items_in_progress) > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                    {Number(f.items_in_progress) > 0 ? `Busy (${f.items_in_progress})` : "Available"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-gray-700 mb-3 mt-6">In Progress ({inProgress.length})</h2>
          <div className="space-y-2">
            {inProgress.length === 0 && <p className="text-gray-500 text-sm">Nothing in progress yet.</p>}
            {inProgress.map(item => (
              <div key={item.id} className={`bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-orange-400 ${!item.has_phone ? 'ring-2 ring-amber-300' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.owner_name} → {item.fixer_name || "Unassigned"}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.problem}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!item.has_phone && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
                        📋 No phone
                      </span>
                    )}
                    <a
                      href={`/checkout/${item.id}`}
                      className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 whitespace-nowrap"
                    >
                      Check out →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Queue */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Repair Queue ({queued.length})</h2>
          <div className="space-y-2">
            {queued.length === 0 && <p className="text-gray-500 text-sm">Queue is empty!</p>}
            {queued.map((item, idx) => (
              <div key={item.id} className={`bg-white rounded-lg p-3 shadow-sm ${!item.has_phone ? 'ring-2 ring-amber-300' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      {!item.has_phone && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium shrink-0">📋 No phone</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{item.owner_name}</p>
                    <p className="text-xs text-gray-500 truncate">{item.problem}</p>
                    <div className="flex gap-2 mt-2">
                      <select
                        value={selectedFixer[item.id] || ""}
                        onChange={e => setSelectedFixer(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="text-xs border rounded px-2 py-1 flex-1"
                      >
                        <option value="">Assign fixer...</option>
                        {data.fixers_present.map(f => (
                          <option key={f.fixer_id} value={f.fixer_id}>
                            {f.name}{f.table_number ? ` (T${f.table_number})` : ""}{Number(f.items_in_progress) > 0 ? ` [${f.items_in_progress} active]` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => assignFixer(item.id)}
                        disabled={!selectedFixer[item.id] || assigning === item.id}
                        className="text-xs bg-green-500 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-green-600"
                      >
                        {assigning === item.id ? "..." : "Assign"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
