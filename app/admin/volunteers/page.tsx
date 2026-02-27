import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export default async function AdminVolunteersPage() {
  // Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/auth/signin?redirect=/admin/volunteers");
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

  // Fetch all helpers
  const helpersResult = await pool.query(
    `SELECT * FROM helpers ORDER BY created_at DESC`
  );

  const helpers = helpersResult.rows;

  const roleLabels: Record<string, string> = {
    welcome: "Welcome/Greeter",
    checkin: "Check-in",
    checkout: "Check-out",
    triage: "Triage",
    photography: "Photography",
    videos: "Videos/Interviews",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    contacted: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/admin/dashboard" className="text-green-600 hover:text-green-700 text-sm mb-2 inline-block">
            ← Back to Dashboard
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Registrations</h1>
        </div>
        <div className="text-sm text-gray-500">
          Signed in as {user.name} ({user.email})
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Helpers ({helpers.length})</h2>
        </div>

        {helpers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No volunteer registrations yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {helpers.map((helper: any) => (
                  <tr key={helper.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{helper.name}</div>
                      {helper.phone && (
                        <div className="text-xs text-gray-500">{helper.phone}</div>
                      )}
                      {helper.availability && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Availability:</span> {helper.availability}
                        </div>
                      )}
                      {helper.comments && (
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={helper.comments}>
                          <span className="font-medium">Notes:</span> {helper.comments}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <a href={`mailto:${helper.email}`} className="text-green-600 hover:underline">
                          {helper.email}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {helper.has_volunteered_before ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {helper.roles && helper.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {helper.roles.map((role: string) => (
                            <span
                              key={role}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {roleLabels[role] || role}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[helper.status] || statusColors.pending
                      }`}>
                        {helper.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(helper.created_at).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
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
