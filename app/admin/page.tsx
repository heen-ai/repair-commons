import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import Link from "next/link";

export default async function AdminPage() {
  // Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/auth/signin?redirect=/admin");
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

  // Fetch stats
  const [
    eventsResult,
    fixersResult,
    helpersResult,
    registrationsResult,
    itemsResult,
  ] = await Promise.all([
    // Total events
    pool.query(`SELECT COUNT(*) as count FROM events`),
    // Active fixers
    pool.query(`SELECT COUNT(*) as count FROM helpers WHERE registration_status = 'approved'`),
    // Total helpers/volunteers
    pool.query(`SELECT COUNT(*) as count FROM helpers`),
    // Total registrations
    pool.query(`SELECT COUNT(*) as count FROM registrations WHERE status != 'cancelled'`),
    // Total items
    pool.query(`SELECT COUNT(*) as count FROM items`),
  ]);

  const stats = {
    totalEvents: parseInt(eventsResult.rows[0]?.count || "0"),
    activeFixers: parseInt(fixersResult.rows[0]?.count || "0"),
    totalHelpers: parseInt(helpersResult.rows[0]?.count || "0"),
    totalRegistrations: parseInt(registrationsResult.rows[0]?.count || "0"),
    totalItems: parseInt(itemsResult.rows[0]?.count || "0"),
  };

  // Fetch upcoming events
  const upcomingEventsResult = await pool.query(
    `SELECT e.*, v.name as venue_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
     FROM events e
     LEFT JOIN venues v ON e.venue_id = v.id
     WHERE e.date >= CURRENT_DATE
     ORDER BY e.date ASC, e.start_time ASC
     LIMIT 5`
  );

  const upcomingEvents = upcomingEventsResult.rows;

  // Fetch recent activity
  const recentItemsResult = await pool.query(
    `SELECT i.name, i.status, i.updated_at, e.title as event_title
     FROM items i
     JOIN registrations r ON i.registration_id = r.id
     JOIN events e ON r.event_id = e.id
     ORDER BY i.updated_at DESC
     LIMIT 5`
  );

  const recentItems = recentItemsResult.rows;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-green-100 mt-1">Welcome back, {user.name}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
            <div className="text-sm text-gray-500">Total Events</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.activeFixers}</div>
            <div className="text-sm text-gray-500">Active Fixers</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totalHelpers}</div>
            <div className="text-sm text-gray-500">Volunteers</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totalRegistrations}</div>
            <div className="text-sm text-gray-500">Registrations</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totalItems}</div>
            <div className="text-sm text-gray-500">Items</div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/events/new"
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mb-2">📅</span>
                <span className="text-sm font-medium">Create Event</span>
              </Link>
              <Link
                href="/admin/events"
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mb-2">📋</span>
                <span className="text-sm font-medium">Manage Events</span>
              </Link>
              <Link
                href="/admin/fixers"
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mb-2">🔧</span>
                <span className="text-sm font-medium">Fixers</span>
              </Link>
              <Link
                href="/admin/volunteers"
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mb-2">🙋</span>
                <span className="text-sm font-medium">Volunteers</span>
              </Link>
              <Link
                href="/admin/items"
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mb-2">📦</span>
                <span className="text-sm font-medium">Items</span>
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mb-2">📊</span>
                <span className="text-sm font-medium">Event Stats</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event: any) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}/dashboard`}
                    className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                        })}
                        {" • "}
                        {event.venue_name || "TBD"}
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {event.registration_count} registered
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/admin/events"
              className="block mt-4 text-sm text-green-600 hover:text-green-700"
            >
              View all events →
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Item Activity</h2>
          {recentItems.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.event_title}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === 'repaired' ? 'bg-green-100 text-green-700' :
                      item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      item.status === 'repairable' ? 'bg-blue-100 text-blue-700' :
                      item.status === 'beyond_repair' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
