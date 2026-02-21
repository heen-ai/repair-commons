import Link from "next/link";

async function getEvents() {
  const baseUrl = process.env.APP_URL || "http://localhost:3300";
  try {
    const res = await fetch(`${baseUrl}/api/events`, { cache: "no-store" });
    const data = await res.json();
    return data.events || [];
  } catch { return []; }
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export default async function EventsPage() {
  const events = await getEvents();
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Events</h1>
      <p className="text-gray-600 mb-8">Join us at a repair cafe near you</p>
      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-600">No upcoming events. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((e: Record<string, string | number>) => {
            const spotsLeft = Number(e.capacity) - Number(e.registration_count);
            return (
              <div key={String(e.id)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="bg-green-50 p-6 md:w-40 flex flex-row md:flex-col items-center md:justify-center gap-3">
                    <div className="text-center">
                      <div className="text-sm font-medium text-green-700 uppercase">{new Date(String(e.date)).toLocaleDateString("en-CA", { month: "short" })}</div>
                      <div className="text-3xl font-bold text-green-800">{new Date(String(e.date)).getDate()}</div>
                      <div className="text-sm text-green-700">{new Date(String(e.date)).toLocaleDateString("en-CA", { weekday: "short" })}</div>
                    </div>
                  </div>
                  <div className="flex-1 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{e.title}</h2>
                    <p className="text-gray-600 text-sm mb-4">{e.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                      <span>🕐 {formatTime(String(e.start_time))} - {formatTime(String(e.end_time))}</span>
                      <span>📍 {e.venue_name}, {e.venue_address}, {e.venue_city}</span>
                      <span className={spotsLeft <= 5 ? "text-orange-600 font-medium" : ""}>{spotsLeft} spots left</span>
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/events/${e.id}`} className="inline-flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm">
                        Register &rarr;
                      </Link>
                      <Link href={`/events/${e.id}`} className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
