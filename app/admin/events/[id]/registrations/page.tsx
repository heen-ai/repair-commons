import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventRegistrationsPage({ params }: Props) {
  const { id: eventId } = await params;

  // Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/auth/signin?redirect=/admin/events/" + eventId + "/registrations");
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

  // Fetch event details with registration count
  const eventResult = await pool.query(
    `SELECT e.*, 
      v.name as venue_name, v.address as venue_address,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
     FROM events e
     LEFT JOIN venues v ON e.venue_id = v.id
     WHERE e.id = $1`,
    [eventId]
  );

  if (eventResult.rows.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Event Not Found</h1>
        <p className="mt-4 text-gray-600">The event you're looking for doesn't exist.</p>
        <a href="/admin/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Dashboard
        </a>
      </div>
    );
  }

  const event = eventResult.rows[0];

  // Fetch registrations with user info and items
  const registrationsResult = await pool.query(
    `SELECT 
      r.id, r.status, r.position, r.created_at,
      u.name as attendee_name, u.email as attendee_email,
      (SELECT json_agg(i.name) FROM items i WHERE i.registration_id = r.id) as items
     FROM registrations r
     JOIN users u ON r.user_id = u.id
     WHERE r.event_id = $1 AND r.status != 'cancelled'
     ORDER BY r.created_at DESC`,
    [eventId]
  );

  const registrations = registrationsResult.rows;

  const eventDate = new Date(event.date).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <a href="/admin/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">{eventDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time</p>
            <p className="font-medium">{event.start_time} - {event.end_time}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Registrations</p>
            <p className="font-medium">
              {event.registration_count} / {event.capacity}
              {parseInt(event.registration_count) >= event.capacity && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Full</span>
              )}
            </p>
          </div>
          {event.venue_name && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-500">Venue</p>
              <p className="font-medium">{event.venue_name}</p>
              {event.venue_address && (
                <p className="text-sm text-gray-600">{event.venue_address}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <a
            href={`/admin/events/${eventId}/report`}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Impact Report
          </a>
          <a
            href={`/admin/events/${eventId}/checkin`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Check-in Mode
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Registrations ({registrations.length})
          </h2>
        </div>

        {registrations.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No registrations yet for this event.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.map((reg: any) => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{reg.attendee_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{reg.attendee_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {reg.items && reg.items.length > 0 ? (
                          <span className="inline-flex flex-wrap gap-1">
                            {reg.items.map((item: string, idx: number) => (
                              <span key={idx} className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {item}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">No items</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reg.status === "registered"
                          ? "bg-green-100 text-green-800"
                          : reg.status === "waitlisted"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{reg.position || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reg.created_at).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
