"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Volunteer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  availability: string | null;
  skills: string[] | null;
  comments: string | null;
  has_volunteered_before: boolean;
  status: string;
  is_fixer: boolean;
  is_helper: boolean;
  created_at: string;
  updated_at: string;
  rsvp_response: string;
  rsvp_created_at: string | null;
}

interface RsvpEvent {
  id: string;
  title: string;
  date: string;
}

interface RsvpVolunteer {
  id: string;
  name: string;
  email: string;
  is_fixer: boolean;
  is_helper: boolean;
  status: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-800",
};

const rsvpColors: Record<string, string> = {
  yes: "bg-green-100 text-green-800",
  maybe: "bg-yellow-100 text-yellow-800",
  no: "bg-red-100 text-red-800",
  "no reply": "bg-gray-100 text-gray-800",
};

const roleLabels: Record<string, string> = {
  welcome: "Welcome/Greeter",
  checkin: "Check-in",
  checkout: "Check-out",
  triage: "Triage",
  photography: "Photography",
  videos: "Videos/Interviews",
};

const rsvpCycle = ["yes", "maybe", "no"];

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Volunteer>>({});
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterFixer, setFilterFixer] = useState<string>("all");
  const [filterHelper, setFilterHelper] = useState<string>("all");
  const [filterRsvp, setFilterRsvp] = useState<string>("all");
  
  // RSVP matrix view
  const [showRsvpMatrix, setShowRsvpMatrix] = useState(false);
  const [rsvpEvents, setRsvpEvents] = useState<RsvpEvent[]>([]);
  const [rsvpVolunteers, setRsvpVolunteers] = useState<RsvpVolunteer[]>([]);
  const [rsvpData, setRsvpData] = useState<Record<string, Record<string, string>>>({});
  const [rsvpLoading, setRsvpLoading] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Volunteer | null;
    direction: 'ascending' | 'descending';
  }>({ key: null, direction: 'ascending' });

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);
      if (filterFixer !== "all") params.set("is_fixer", filterFixer);
      if (filterHelper !== "all") params.set("is_helper", filterHelper);
      if (filterRsvp !== "all") params.set("rsvp", filterRsvp);

      if (sortConfig.key) {
        params.set("sort", sortConfig.key);
        params.set("direction", sortConfig.direction);
      }
      
      const res = await fetch(`/api/admin/volunteers?${params}`);
      const data = await res.json();
      
      if (data.success) {
        let sortedVolunteers = [...data.volunteers];
        
        if (sortConfig.key) {
          sortedVolunteers.sort((a, b) => {
            if (a[sortConfig.key as keyof Volunteer] < b[sortConfig.key as keyof Volunteer]) {
              return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key as keyof Volunteer] > b[sortConfig.key as keyof Volunteer]) {
              return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
          });
        }
        
        setVolunteers(sortedVolunteers);
      }
    } catch (error) {
      console.error("Error fetching volunteers:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, search, sortConfig, filterFixer, filterHelper, filterRsvp]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const fetchRsvpMatrix = async () => {
    setRsvpLoading(true);
    try {
      const res = await fetch("/api/admin/volunteers/rsvps");
      const data = await res.json();
      if (data.success) {
        setRsvpEvents(data.events);
        setRsvpVolunteers(data.volunteers);
        setRsvpData(data.rsvps);
      }
    } catch (error) {
      console.error("Error fetching RSVP matrix:", error);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleRsvpToggle = async (volunteerId: string, eventId: string) => {
    const current = rsvpData[volunteerId]?.[eventId] || "no reply";
    const currentIdx = rsvpCycle.indexOf(current);
    const next = rsvpCycle[(currentIdx + 1) % rsvpCycle.length];
    
    // Optimistic update
    setRsvpData(prev => ({
      ...prev,
      [volunteerId]: {
        ...(prev[volunteerId] || {}),
        [eventId]: next,
      }
    }));

    try {
      await fetch("/api/admin/volunteers/rsvps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId, eventId, response: next }),
      });
    } catch (error) {
      console.error("Error updating RSVP:", error);
      // Revert on error
      fetchRsvpMatrix();
    }
  };

  const handleMainTableRsvpToggle = async (volunteer: Volunteer, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = volunteer.rsvp_response;
    const currentIdx = rsvpCycle.indexOf(current);
    const next = rsvpCycle[(currentIdx + 1) % rsvpCycle.length];
    
    // We need the next event ID - fetch it
    try {
      const res = await fetch("/api/admin/volunteers/rsvps");
      const data = await res.json();
      if (data.success && data.events.length > 0) {
        const nextEventId = data.events[0].id;
        await fetch("/api/admin/volunteers/rsvps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volunteerId: volunteer.id, eventId: nextEventId, response: next }),
        });
        fetchVolunteers();
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === volunteers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(volunteers.map((v) => v.id));
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/admin/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerIds: selectedIds, action }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds([]);
        fetchVolunteers();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error performing bulk action:", error);
    }
  };

  const openVolunteerModal = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setEditForm({ ...volunteer });
    setEditMode(false);
  };

  const closeModal = () => {
    setSelectedVolunteer(null);
    setEditMode(false);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!selectedVolunteer) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/volunteers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerId: selectedVolunteer.id,
          ...editForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVolunteer(data.volunteer);
        setEditMode(false);
        fetchVolunteers();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error saving volunteer:", error);
    } finally {
      setSaving(false);
    }
  };

  const statusFilters = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "archived", label: "Archived" },
  ];
  
  const handleSort = (key: keyof Volunteer) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    }));
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-green-100 hover:text-white text-sm mb-1 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold">Volunteer Management</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter Tabs + RSVP tab */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {statusFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilter(f.key); setShowRsvpMatrix(false); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === f.key && !showRsvpMatrix
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => { setShowRsvpMatrix(true); fetchRsvpMatrix(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showRsvpMatrix
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                RSVP
              </button>
            </div>

            {/* Dropdown filters - only show on main table view */}
            {!showRsvpMatrix && (
              <>
                <select
                  value={filterFixer}
                  onChange={(e) => setFilterFixer(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Roles</option>
                  <option value="yes">Fixers</option>
                  <option value="no">Not Fixers</option>
                </select>

                <select
                  value={filterHelper}
                  onChange={(e) => setFilterHelper(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Types</option>
                  <option value="yes">Helpers</option>
                  <option value="no">Not Helpers</option>
                </select>

                <select
                  value={filterRsvp}
                  onChange={(e) => setFilterRsvp(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All RSVP</option>
                  <option value="yes">RSVP: Yes</option>
                  <option value="maybe">RSVP: Maybe</option>
                  <option value="no">RSVP: No</option>
                  <option value="no reply">RSVP: No Reply</option>
                </select>
              </>
            )}

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* RSVP Matrix View */}
        {showRsvpMatrix ? (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {rsvpLoading ? (
              <div className="p-12 text-center text-gray-500">Loading RSVP data...</div>
            ) : rsvpEvents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No upcoming events found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      {rsvpEvents.map((event) => (
                        <th key={event.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[100px]">
                          <div>{formatEventDate(event.date)}</div>
                          <div className="text-[10px] text-gray-400 font-normal normal-case truncate max-w-[120px]">
                            {event.title.replace("Repair Cafe at ", "")}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rsvpVolunteers
                      .filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase()))
                      .map((volunteer) => (
                      <tr key={volunteer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 sticky left-0 bg-white z-10">
                          <div className="text-sm font-medium text-gray-900">{volunteer.name}</div>
                          <div className="text-xs text-gray-500">{volunteer.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {volunteer.is_fixer && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                                F
                              </span>
                            )}
                            {volunteer.is_helper && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                                H
                              </span>
                            )}
                          </div>
                        </td>
                        {rsvpEvents.map((event) => {
                          const response = rsvpData[volunteer.id]?.[event.id] || "no reply";
                          return (
                            <td key={event.id} className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleRsvpToggle(volunteer.id, event.id)}
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${rsvpColors[response]}`}
                              >
                                {response}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
              Click any RSVP to cycle: yes → maybe → no → yes
            </div>
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-green-800">
                    {selectedIds.length} selected
                  </span>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleBulkAction("approve")} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                    Approve Selected
                  </button>
                  <button onClick={() => handleBulkAction("reject")} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                    Reject Selected
                  </button>
                  <button onClick={() => handleBulkAction("mark_fixer")} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                    Mark as Fixer
                  </button>
                  <button onClick={() => handleBulkAction("mark_helper")} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                    Mark as Helper
                  </button>
                  <button onClick={() => handleBulkAction("archive")} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">
                    Archive Selected
                  </button>
                </div>
              </div>
            )}

            {/* Volunteers Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-500">Loading...</div>
              ) : volunteers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No volunteers found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === volunteers.length && volunteers.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                          Name {sortConfig.key === 'name' && <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>
                          Email {sortConfig.key === 'email' && <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fixer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Helper</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                          Status {sortConfig.key === 'status' && <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('rsvp_response')}>
                          RSVP {sortConfig.key === 'rsvp_response' && <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                          Registered {sortConfig.key === 'created_at' && <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {volunteers.map((volunteer) => (
                        <tr key={volunteer.id} onClick={() => openVolunteerModal(volunteer)} className="hover:bg-gray-50 cursor-pointer">
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(volunteer.id)}
                              onChange={() => handleSelectOne(volunteer.id)}
                              className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{volunteer.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600">{volunteer.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            {volunteer.skills && volunteer.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {volunteer.skills.slice(0, 2).map((skill) => (
                                  <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {roleLabels[skill] || skill}
                                  </span>
                                ))}
                                {volunteer.skills.length > 2 && (
                                  <span className="text-xs text-gray-500">+{volunteer.skills.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {volunteer.is_fixer ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">✓ Fixer</span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {volunteer.is_helper ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">✓ Helper</span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[volunteer.status] || statusColors.pending}`}>
                              {volunteer.status}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleMainTableRsvpToggle(volunteer, e)}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${rsvpColors[volunteer.rsvp_response] || rsvpColors["no reply"]}`}
                              title="Click to change RSVP"
                            >
                              {volunteer.rsvp_response}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-500">
                              {new Date(volunteer.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Showing {volunteers.length} volunteer{volunteers.length !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </div>

      {/* Volunteer Detail Modal */}
      {selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? "Edit Volunteer" : "Volunteer Details"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {editMode ? (
                  <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                ) : (
                  <p className="text-gray-900">{selectedVolunteer.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {editMode ? (
                  <input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                ) : (
                  <p className="text-gray-900">
                    <a href={`mailto:${selectedVolunteer.email}`} className="text-green-600 hover:underline">{selectedVolunteer.email}</a>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {editMode ? (
                  <input type="tel" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                ) : (
                  <p className="text-gray-900">{selectedVolunteer.phone || "-"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                {editMode ? (
                  <textarea value={editForm.availability || ""} onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                ) : (
                  <p className="text-gray-900">{selectedVolunteer.availability || "-"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                {editMode ? (
                  <input type="text" value={(editForm.skills as string[])?.join(", ") || ""} 
                    onChange={(e) => setEditForm({ ...editForm, skills: e.target.value.split(",").map(s => s.trim()) })}
                    placeholder="Comma-separated skills"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedVolunteer.skills && selectedVolunteer.skills.length > 0 ? (
                      selectedVolunteer.skills.map((skill) => (
                        <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {roleLabels[skill] || skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                {editMode ? (
                  <textarea value={editForm.comments || ""} onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                ) : (
                  <p className="text-gray-900">{selectedVolunteer.comments || "-"}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Has volunteered before:</label>
                {editMode ? (
                  <input type="checkbox" checked={editForm.has_volunteered_before || false}
                    onChange={(e) => setEditForm({ ...editForm, has_volunteered_before: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                ) : (
                  <span className={selectedVolunteer.has_volunteered_before ? "text-green-600" : "text-gray-400"}>
                    {selectedVolunteer.has_volunteered_before ? "✓ Yes" : "No"}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                {editMode ? (
                  <select value={editForm.status || "pending"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedVolunteer.status] || statusColors.pending}`}>
                    {selectedVolunteer.status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={editMode ? editForm.is_fixer || false : selectedVolunteer.is_fixer}
                    onChange={(e) => { if (editMode) setEditForm({ ...editForm, is_fixer: e.target.checked }); }}
                    disabled={!editMode} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                  <span className="text-sm font-medium text-gray-700">Is Fixer</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={editMode ? editForm.is_helper || false : selectedVolunteer.is_helper}
                    onChange={(e) => { if (editMode) setEditForm({ ...editForm, is_helper: e.target.checked }); }}
                    disabled={!editMode} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                  <span className="text-sm font-medium text-gray-700">Is Helper</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm text-gray-500">
                <div><span className="font-medium">Created:</span> {new Date(selectedVolunteer.created_at).toLocaleString()}</div>
                <div><span className="font-medium">Updated:</span> {new Date(selectedVolunteer.updated_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              {editMode ? (
                <>
                  <button onClick={() => { setEditMode(false); setEditForm({ ...selectedVolunteer }); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100">Close</button>
                  <button onClick={() => setEditMode(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Edit</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}