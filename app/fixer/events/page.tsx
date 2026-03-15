import Link from "next/link";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

async function getEvents() {
  const result = await pool.query(
    `SELECT e.id, e.title, e.date, e.start_time, e.end_time, e.capacity,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'registered') as registered_count
     FROM events e 
     WHERE e.status = 'published' AND e.date >= CURRENT_DATE
     ORDER BY e.date ASC`
  );
  return result.rows;
}

export default async function FixerEventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/fixer/profile" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Profile
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Upcoming Events</h1>
            <p className="text-gray-600 mt-1">Select an event to view items needing repair</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No upcoming events scheduled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const spotsLeft = event.capacity - parseInt(event.registered_count);
              const date = new Date(event.date + "T12:00:00");
              const formattedDate = date.toLocaleDateString("en-CA", { 
                weekday: "long", 
                month: "long", 
                day: "numeric",
                year: "numeric"
              });
              const startTime = event.start_time.slice(0, 5);
              const endTime = event.end_time.slice(0, 5);

              return (
                <Link 
                  key={event.id} 
                  href={`/fixer/events/${event.id}/items`}
                  className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
                      <p className="text-gray-600 mt-1">{formattedDate}</p>
                      <p className="text-gray-500 text-sm mt-1">{startTime} - {endTime}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm ${spotsLeft > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {spotsLeft} spots left
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
