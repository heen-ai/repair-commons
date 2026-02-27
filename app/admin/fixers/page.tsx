"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Fixer {
  id: number;
  name: string;
  email: string;
  phone: string;
  skills: string;
  bio: string;
  availability: string;
  comments: string;
  status: string;
  approved_at: string | null;
  created_at: string;
  upcoming_events_count: number;
  userSkills: { id: number; name: string; category: string }[];
}

export default function AdminFixersPage() {
  const [fixers, setFixers] = useState<Fixer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchFixers();
  }, []);

  const fetchFixers = async () => {
    try {
      const response = await fetch("/api/admin/fixers");
      const data = await response.json();
      if (data.success) {
        setFixers(data.fixers);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to load fixers");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (fixerId: number, action: "approve" | "reject" | "remove") => {
    if (!confirm(`Are you sure you want to ${action} this fixer?`)) {
      return;
    }

    setUpdating(fixerId);
    setError("");

    try {
      const response = await fetch("/api/admin/fixers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fixerId, action }),
      });

      const data = await response.json();

      if (data.success) {
        fetchFixers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to update fixer");
    } finally {
      setUpdating(null);
    }
  };

  const filteredFixers = fixers.filter((fixer) => {
    if (filter === "all") return true;
    if (filter === "pending") return fixer.status === "pending";
    if (filter === "active") return fixer.status === "active";
    if (filter === "inactive") return fixer.status === "rejected" || fixer.status === "removed";
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    removed: "bg-gray-100 text-gray-800",
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/admin/dashboard" className="text-green-600 hover:text-green-700 text-sm mb-2 inline-block">
            ← Back to Dashboard
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Fixer Management</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "all"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({fixers.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "pending"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Pending ({fixers.filter((f) => f.status === "pending").length})
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "active"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Active ({fixers.filter((f) => f.status === "active").length})
        </button>
        <button
          onClick={() => setFilter("inactive")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "inactive"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Inactive ({fixers.filter((f) => f.status === "rejected" || f.status === "removed").length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredFixers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No fixers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fixer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upcoming Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFixers.map((fixer) => (
                  <tr key={fixer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{fixer.name}</div>
                      <div className="text-xs text-gray-500">
                        <a href={`mailto:${fixer.email}`} className="text-green-600 hover:underline">
                          {fixer.email}
                        </a>
                      </div>
                      {fixer.phone && (
                        <div className="text-xs text-gray-500">{fixer.phone}</div>
                      )}
                      {fixer.availability && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Availability:</span> {fixer.availability}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {fixer.userSkills && fixer.userSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {fixer.userSkills.map((skill) => (
                            <span
                              key={skill.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill.name}
                            </span>
                          ))}
                        </div>
                      ) : fixer.skills ? (
                        <div className="text-sm text-gray-500">{fixer.skills}</div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {fixer.bio || fixer.comments || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {fixer.upcoming_events_count} upcoming
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[fixer.status] || statusColors.pending
                      }`}>
                        {fixer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(fixer.created_at).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fixer.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(fixer.id, "approve")}
                            disabled={updating === fixer.id}
                            className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                          >
                            {updating === fixer.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleAction(fixer.id, "reject")}
                            disabled={updating === fixer.id}
                            className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {fixer.status === "active" && (
                        <button
                          onClick={() => handleAction(fixer.id, "remove")}
                          disabled={updating === fixer.id}
                          className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                        >
                          {updating === fixer.id ? "..." : "Remove"}
                        </button>
                      )}
                      {fixer.status === "rejected" && (
                        <button
                          onClick={() => handleAction(fixer.id, "approve")}
                          disabled={updating === fixer.id}
                          className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                        >
                          {updating === fixer.id ? "..." : "Re-approve"}
                        </button>
                      )}
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
