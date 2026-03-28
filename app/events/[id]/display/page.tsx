"use client";
import { useState, useEffect, useCallback } from "react";

interface DisplayData {
  event: { id: string; title: string; date: string; location: string };
  in_progress: { item_name: string; owner_first_name: string; fixer_name: string }[];
  up_next: { item_name: string; queue_position: number; owner_first_name: string }[];
  stats: { checked_in: number; in_progress: number; completed: number; fixed: number };
}

export default function DisplayPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [data, setData] = useState<DisplayData | null>(null);
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/display`);
    if (res.ok) setData(await res.json());
  }, [eventId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-green-600 text-2xl animate-pulse">Loading...</p>
    </div>
  );

  const successRate = Number(data.stats.completed) > 0
    ? Math.round((Number(data.stats.fixed) / Number(data.stats.completed)) * 100)
    : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="bg-green-600 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">London Repair Café</h1>
          <p className="text-green-200 text-lg">{data.event.location}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold">{time}</p>
          <p className="text-green-200">{new Date(data.event.date + "T12:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-0">
        <div className="p-8 border-r border-gray-700">
          <h2 className="text-2xl font-bold text-green-600 mb-6 uppercase tracking-wide">Now Being Repaired</h2>
          {data.in_progress.length === 0 ? (
            <p className="text-gray-500 text-xl">Waiting for repairs to start...</p>
          ) : (
            <div className="space-y-4">
              {data.in_progress.map((item, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-5">
                  <p className="text-2xl font-bold text-white">{item.item_name}</p>
                  <p className="text-lg text-gray-300 mt-1">{item.owner_first_name}</p>
                  {item.fixer_name && <p className="text-green-600 mt-1">Fixer: {item.fixer_name}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-6 uppercase tracking-wide">Up Next</h2>
          {data.up_next.length === 0 ? (
            <p className="text-gray-500 text-xl">Queue is empty!</p>
          ) : (
            <div className="space-y-3">
              {data.up_next.map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-gray-800 rounded-lg px-5 py-4">
                  <span className="text-3xl font-bold text-yellow-400 w-10">{i + 1}</span>
                  <div>
                    <p className="text-xl font-semibold">{item.item_name}</p>
                    <p className="text-gray-400">{item.owner_first_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-gray-800 px-8 py-4 flex gap-10 text-lg border-t border-gray-700">
        <span>Checked in: {data.stats.checked_in}</span>
        <span>In progress: {data.stats.in_progress}</span>
        <span>Completed: {data.stats.completed}</span>
        {successRate !== null && <span>Success rate: {successRate}%</span>}
      </div>
    </div>
  );
}
