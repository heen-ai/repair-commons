import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export default async function AdminEventsPage() {
  // Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/auth/signin?redirect=/admin/events");
  }

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.name, u.role
     FROM users u JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );

  const user = userResult.rows[0];
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  // Fetch all events with venue info
  const eventsResult = await pool.query(
    `SELECT e.*, v.name as venue_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
     FROM events e
     LEFT JOIN venues v ON e.venue_id = v.id
     ORDER BY e.date DESC`
  );

  const events = eventsResult.rows;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/admin/dashboard" className="text-green-600 hover:text-green-700 text-sm mb-2 inline-block">
            ← Back to Dashboard
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
        >
          + New Event
        </Link>
      </div>

      <div className="text-sm text-gray-500 mb-6">
        Signed in as {user.name} ({user.email})
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {events.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No events yet.</p>
            <Link
              href="/admin/events/new"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Create your first event →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event: any) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {event.description?.substring(0, 60)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(event.date).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {event.start_time} - {event.end_time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {event.venue_name || <span className="text-gray-400">TBD</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {event.registration_count} / {event.capacity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[event.status] || statusColors.draft
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
