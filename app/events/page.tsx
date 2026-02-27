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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-green-800 to-emerald-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Upcoming Events</h1>
          <p className="text-xl text-green-100/80 max-w-2xl">Join us at a repair café near you. Register to save your spot and let us know what you're bringing.</p>
        </div>
      </section>

      {/* Events */}
      <section className="py-12 -mt-8">
        <div className="max-w-6xl mx-auto px-4">
          {events.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">📅</div>
              <p className="text-gray-500">No upcoming events. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((e: Record<string, string | number>) => {
                const spotsLeft = Number(e.capacity) - Number(e.registration_count);
                return (
                  <Link key={String(e.id)} href={`/events/${e.id}`} className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-2">
                    {/* Date badge */}
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-green-100">{new Date(String(e.date)).toLocaleDateString("en-CA", { month: "long" })}</div>
                          <div className="text-4xl font-bold">{new Date(String(e.date)).getDate()}</div>
                          <div className="text-sm text-green-100">{new Date(String(e.date)).toLocaleDateString("en-CA", { weekday: "long" })}</div>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                          🗓️
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{e.title}</h2>
                      
                      <div className="space-y-2 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-2">
                          <span>🕐</span>
                          <span>{formatTime(String(e.start_time))} - {formatTime(String(e.end_time))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{e.venue_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📌</span>
                          <span>{e.venue_address}, {e.venue_city}</span>
                        </div>
                      </div>
                      
                      {e.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{e.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className={`text-sm font-semibold ${spotsLeft <= 10 ? "text-orange-600" : "text-green-600"}`}>
                          {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
                        </span>
                        <span className="text-green-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                          View Details 
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
