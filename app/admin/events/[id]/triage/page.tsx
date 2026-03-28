"use client";
import { useState, useEffect, useCallback } from "react";
import { use } from "react";

interface Fixer { fixer_id: string; name: string; table_number: string | null; items_in_progress: number; }
interface QueueItem { id: string; name: string; problem: string; status: string; queue_position: number | null; owner_name: string; fixer_user_id: string | null; fixer_name: string | null; }
interface TriageData {
  fixers_present: Fixer[];
  queue_items: QueueItem[];
  stats: { fixers_present: number; queued: number; in_progress: number; completed: number; };
}

export default function TriagePage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [data, setData] = useState<TriageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedFixer, setSelectedFixer] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}/triage`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const assignFixer = async (itemId: string) => {
    const fixerId = selectedFixer[itemId];
    if (!fixerId) return;
    setAssigning(itemId);
    await fetch(`/api/admin/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixer_id: fixerId, status: "in_progress" })
    });
    setAssigning(null);
    fetchData();
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-lg">Loading triage board...</p>
    </div>
  );
  if (!data) return <div className="p-8 text-red-600">Failed to load data.</div>;

  const queued = data.queue_items.filter(i => i.status === "queued" && !i.fixer_user_id);
  const inProgress = data.queue_items.filter(i => i.status === "in_progress");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white p-4">
        <h1 className="text-2xl font-bold">Triage Board</h1>
        <div className="flex gap-6 mt-2 text-sm">
          <span>🔧 {data.stats.fixers_present} fixers present</span>
          <span>📋 {data.stats.queued} in queue</span>
          <span>⚙️ {data.stats.in_progress} in progress</span>
          <span>✅ {data.stats.completed} completed</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 max-w-7xl mx-auto">
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
            {inProgress.map(item => (
              <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-l-orange-400">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-600">{item.owner_name} → {item.fixer_name || "Unassigned"}</p>
                <p className="text-xs text-gray-500 mt-1">{item.problem}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Repair Queue ({queued.length})</h2>
          <div className="space-y-2">
            {queued.length === 0 && <p className="text-gray-500 text-sm">Queue is empty!</p>}
            {queued.map((item, idx) => (
              <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
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
                            {f.name}{f.table_number ? ` (T${f.table_number})` : ""}
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
