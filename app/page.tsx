import Link from "next/link";

async function getEvents() {
  const baseUrl = process.env.APP_URL || "http://localhost:3300";
  try {
    const res = await fetch(`${baseUrl}/api/events`, { cache: "no-store" });
    const data = await res.json();
    return data.events || [];
  } catch { return []; }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export default async function HomePage() {
  const events = await getEvents();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">London Repair Café</h1>
            <p className="text-xl text-green-100 mb-8">
              Community-powered repair events. Fix your stuff, save money, reduce waste, and learn new skills alongside skilled volunteers.
            </p>
            <Link href="/events" className="inline-flex items-center px-6 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors">
              Find an Event &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Upcoming Events</h2>
          {events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <p className="text-gray-600">Check back soon for new repair cafe events!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((e: Record<string, string | number>) => (
                <Link key={String(e.id)} href={`/events/${e.id}`} className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="bg-green-50 rounded-lg px-4 py-3 text-center sm:w-24 shrink-0">
                      <div className="text-sm font-medium text-green-700">{new Date(String(e.date)).toLocaleDateString("en-CA", { month: "short" })}</div>
                      <div className="text-2xl font-bold text-green-800">{new Date(String(e.date)).getDate()}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{e.title}</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {formatDate(String(e.date))} &middot; {formatTime(String(e.start_time))} - {formatTime(String(e.end_time))}
                      </p>
                      <p className="text-gray-500 text-sm">{e.venue_name}, {e.venue_address}, {e.venue_city}</p>
                    </div>
                    <div className="text-green-600 font-medium text-sm">
                      {Number(e.capacity) - Number(e.registration_count)} spots left &rarr;
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Find an Event", desc: "Browse upcoming repair cafes near you." },
              { step: "2", title: "Register", desc: "Sign up and tell us what you want to fix." },
              { step: "3", title: "Bring It In", desc: "Show up with your item. No appointment needed." },
              { step: "4", title: "Learn & Repair", desc: "Work with volunteers to fix your stuff." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 mx-auto mb-3 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">{s.step}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
