"use client";
import { useState, useEffect, useCallback, use } from "react";

interface Fixer { fixer_id: string; name: string; table_number: string | null; items_in_progress: number; }
interface QueueItem { id: string; name: string; problem: string; status: string; queue_position: number | null; owner_name: string; fixer_user_id: string | null; fixer_name: string | null; has_phone: boolean; }
interface TriageData {
  fixers_present: Fixer[];
  queue_items: QueueItem[];
  stats: { fixers_present: number; queued: number; in_progress: number; completed: number; };
}

export default function HelperTriagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [data, setData] = useState<TriageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedFixer, setSelectedFixer] = useState<Record<string, string>>({});

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
          className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
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

  const queued = data.queue_items.filter(i => (i.status === "queued" || i.status === "registered") && !i.fixer_user_id);
  const inProgress = data.queue_items.filter(i => i.status === "in_progress" || (i.fixer_user_id && i.status !== "completed" && i.status !== "fixed" && i.status !== "unfixable" && i.status !== "cancelled"));
  const completed = data.queue_items.filter(i => i.status === "completed" || i.status === "fixed" || i.status === "unfixable");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white p-4">
        <h1 className="text-2xl font-bold">Triage Board</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm">
          <span>🔧 {data.stats.fixers_present} fixers</span>
          <span>📋 {queued.length} waiting</span>
          <span>⚙️ {inProgress.length} in progress</span>
          <span>✅ {completed.length} done</span>
        </div>
      </div>

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
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 whitespace-nowrap"
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
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-green-700"
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
