"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function VolunteerBanner() {
  const [role, setRole] = useState<{ isFixer: boolean; isHelper: boolean; isAdmin: boolean; name: string } | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && (data.user?.isFixer || data.user?.isHelper || data.user?.isAdmin)) {
          setRole({
            isFixer: data.user.isFixer,
            isHelper: data.user.isHelper,
            isAdmin: data.user.isAdmin,
            name: data.user.name,
          });
        }
      })
      .catch(() => {});

    // Get today's event - compare using event date only (no timezone issues)
    fetch("/api/events")
      .then(res => res.json())
      .then(data => {
        const now = new Date();
        const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const todayUTC = now.toISOString().slice(0, 10);
        // Match either local or UTC date (handles timezone edge cases on event day)
        const todayEvent = (data.events || []).find((e: { date: string }) => {
          const eDate = e.date?.slice(0, 10);
          return eDate === todayLocal || eDate === todayUTC;
        });
        if (todayEvent) setEventId(todayEvent.id);
      })
      .catch(() => {});
  }, []);

  if (!role || !eventId || dismissed) return null;

  const label = role.isFixer ? "Fixer" : role.isHelper ? "Helper" : "Admin";
  const link = role.isFixer
    ? `/fixer/events/${eventId}/items`
    : `/volunteer/triage/${eventId}`;

  return (
    <div className="bg-green-600 text-white px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-green-200 text-sm font-medium shrink-0">Hi {role.name}!</span>
          <span className="text-sm text-green-100 hidden sm:inline">You&apos;re logged in as {label.toLowerCase()} for today&apos;s event.</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={link}
            className="bg-white text-green-700 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-50 transition-colors"
          >
            {role.isFixer ? "My Items & Name Card" : "Open Triage Board"}
          </Link>
          {role.isAdmin && (
            <Link
              href={`/volunteer/triage/${eventId}`}
              className="bg-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
            >
              Triage Board
            </Link>
          )}
          <button onClick={() => setDismissed(true)} className="text-green-200 hover:text-white ml-1 text-lg leading-none">&times;</button>
        </div>
      </div>
    </div>
  );
}
