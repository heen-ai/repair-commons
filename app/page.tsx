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
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-green-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-full px-4 py-1.5 text-sm font-medium text-green-100 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Free community events
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Don't Toss It — <br />
              <span className="text-green-300">Fix It Together.</span>
            </h1>
            <p className="text-xl text-green-100/80 mb-8 max-w-xl">
              Bring your broken treasures to our community repair café. Skilled volunteers will help you fix them — for free. Save money, reduce waste, learn something new.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/events" className="inline-flex items-center px-8 py-4 bg-white text-green-800 font-semibold rounded-xl hover:bg-green-50 transition-all shadow-xl shadow-green-900/20 hover:shadow-2xl hover:shadow-green-900/30 hover:-translate-y-0.5">
                Find an Event
                <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link href="/volunteer" className="inline-flex items-center px-8 py-4 bg-green-600/30 backdrop-blur-sm border border-green-400/30 text-white font-semibold rounded-xl hover:bg-green-600/40 transition-all">
                Become a Fixer
              </Link>
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-16 md:h-24">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "500+", label: "Items Repaired" },
              { number: "40+", label: "Volunteer Fixers" },
              { number: "12", label: "Events Hosted" },
              { number: "85%", label: "Success Rate" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-3xl md:text-4xl font-bold text-green-600 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Join us at a repair café near you. Register to save your spot.</p>
          </div>
          
          {events.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">📅</div>
              <p className="text-gray-500">Check back soon for new repair café events!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((e: Record<string, string | number>) => {
                const spotsLeft = Number(e.capacity) - Number(e.registration_count);
                return (
                  <Link key={String(e.id)} href={`/events/${e.id}`} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all hover:-translate-y-1">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                          <div className="text-xs font-semibold text-green-600 uppercase">{new Date(String(e.date)).toLocaleDateString("en-CA", { month: "short" })}</div>
                          <div className="text-2xl font-bold text-gray-900">{new Date(String(e.date)).getDate()}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{e.title}</div>
                          <div className="text-sm text-gray-500">{formatTime(String(e.start_time))} - {formatTime(String(e.end_time))}</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <span>📍</span>
                        <span>{e.venue_name}, {e.venue_address}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${spotsLeft <= 10 ? "text-orange-600" : "text-green-600"}`}>
                          {spotsLeft} spots left
                        </span>
                        <span className="text-green-600 font-medium group-hover:translate-x-1 transition-transform">Register →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">It's simple. Bring your broken item. Leave it fixed.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Find an Event", desc: "Browse upcoming repair cafés near you.", icon: "🔍" },
              { step: "2", title: "Register", desc: "Sign up and tell us what you want fixed.", icon: "📝" },
              { step: "3", title: "Bring It In", desc: "Show up with your item. No appointment needed.", icon: "🎒" },
              { step: "4", title: "Learn & Repair", desc: "Work with volunteers to fix your stuff.", icon: "🛠️" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center text-3xl">{s.icon}</div>
                <div className="text-sm font-semibold text-green-600 mb-2">Step {s.step}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-green-600 to-emerald-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">Ready to Fix Something?</h2>
          <p className="text-xl text-green-100 mb-8">Join our community of repair enthusiasts. It's free, fun, and you'll learn something new.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/events" className="px-8 py-4 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-all shadow-lg">
              Browse Events
            </Link>
            <Link href="/volunteer" className="px-8 py-4 bg-green-500/30 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-green-500/40 transition-all">
              Become a Fixer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
