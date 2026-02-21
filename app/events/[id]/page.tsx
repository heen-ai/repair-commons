import Link from "next/link";
import { notFound } from "next/navigation";

async function getEvent(id: string) {
  const baseUrl = process.env.APP_URL || "http://localhost:3300";
  try {
    const res = await fetch(`${baseUrl}/api/events/${id}`, { cache: "no-store" });
    const data = await res.json();
    return data.event || null;
  } catch { return null; }
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  if (!event) return notFound();

  const spotsLeft = event.capacity - Number(event.registration_count);
  const dateStr = new Date(event.date).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue_address}, ${event.venue_city}`)}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/events" className="text-green-600 hover:text-green-700 text-sm mb-4 inline-block">&larr; All Events</Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{event.title}</h1>
          <p className="text-green-100">{dateStr}</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">When</h3>
              <p className="text-gray-600">{dateStr}</p>
              <p className="text-gray-600">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Where</h3>
              <p className="text-gray-600">{event.venue_name}</p>
              <p className="text-gray-600">{event.venue_address}, {event.venue_city}</p>
              <a href={mapsUrl} target="_blank" rel="noopener" className="text-green-600 hover:text-green-700 text-sm">View on Google Maps &rarr;</a>
            </div>
          </div>

          {event.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">About</h3>
              <p className="text-gray-600">{event.description}</p>
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-lg font-semibold ${spotsLeft <= 5 ? "text-orange-600" : "text-gray-900"}`}>
                  {spotsLeft} spots remaining
                </span>
                <p className="text-gray-500 text-sm">out of {event.capacity} total</p>
              </div>
              <Link href={`/events/${event.id}/register`} className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Register Now &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
