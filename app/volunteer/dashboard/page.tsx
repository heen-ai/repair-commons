"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address: string;
  rsvp_status: string;
}

interface ItemComment {
  id: string;
  comment: string;
  author_name: string;
  created_at: string;
}

interface Item {
  id: string;
  name: string;
  item_type: string;
  problem: string;
  status: string;
  description: string;
  event_title: string;
  owner_name: string;
  interest_id: string | null;
  comment_count: number;
  photos: string[];
  comments: ItemComment[];
}

interface Profile {
  name: string;
  email: string;
  phone: string;
  is_fixer: boolean;
  is_helper: boolean;
  skills: string;
  roles: string[];
  availability: string;
  comments: string;
}

const fixerSkills = [
  "Lamps",
  "Computers",
  "Phones/tablets",
  "Electronics",
  "Small appliances",
  "Sewing machines",
  "Clothing repairs",
  "Soft goods",
  "Bicycles",
  "Furniture & household",
  "Jewellery",
  "Other",
];

const helperRoles = [
  { id: "welcome", label: "Welcome/greeter" },
  { id: "checkin", label: "Check-in" },
  { id: "checkout", label: "Check-out" },
  { id: "triage", label: "Triage" },
  { id: "photography", label: "Photography" },
  { id: "videos", label: "Videos/interviews" },
  { id: "setup", label: "Setup/teardown" },
  { id: "refreshments", label: "Refreshments" },
];

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "items" | "profile">("events");

  // Profile editing
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", selectedSkills: [] as string[], otherSkills: "",
    roles: [] as string[], availability: "", comments: "",
  });
  const [saving, setSaving] = useState(false);

  // Item modals
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [interestNotes, setInterestNotes] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  useEffect(() => { fetchDashboard(); }, []);

  const parseSkills = (skillsStr: string): { selected: string[]; other: string } => {
    if (!skillsStr) return { selected: [], other: "" };
    const parts = skillsStr.split(",").map(s => s.trim()).filter(Boolean);
    const known = parts.filter(s => fixerSkills.includes(s));
    const other = parts.filter(s => !fixerSkills.includes(s) && s !== "Other").join(", ");
    if (other && !known.includes("Other")) known.push("Other");
    return { selected: known, other };
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/volunteer/dashboard");
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) { router.push("/auth/signin?redirect=/volunteer/dashboard"); return; }
        if (res.status === 404) { setError(data.message || "Please register as a volunteer first."); return; }
        throw new Error(data.message);
      }

      setProfile(data.profile);
      setEvents(data.events);
      setItems(data.items || []);

      const parsed = parseSkills(data.profile.skills || "");
      setForm({
        name: data.profile.name || "",
        phone: data.profile.phone || "",
        selectedSkills: parsed.selected,
        otherSkills: parsed.other,
        roles: data.profile.roles || [],
        availability: data.profile.availability || "",
        comments: data.profile.comments || "",
      });
    } catch (err) {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Build skills string from checkboxes + other
      let skillsList = form.selectedSkills.filter(s => s !== "Other");
      if (form.selectedSkills.includes("Other") && form.otherSkills.trim()) {
        skillsList.push(form.otherSkills.trim());
      }

      const res = await fetch("/api/volunteer/dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: skillsList.join(", "),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Profile updated!" });
        setEditing(false);
        fetchDashboard();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const updateRsvp = async (eventId: string, response: "yes" | "no" | "maybe") => {
    try {
      const res = await fetch("/api/volunteer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, response }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "RSVP updated!" });
        fetchDashboard();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update RSVP" });
    }
  };

  const expressInterest = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/fixer/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selectedItem.id, notes: interestNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Interest registered!" });
        setShowInterestModal(false);
        setInterestNotes("");
        fetchDashboard();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to express interest" });
    } finally {
      setSubmitting(false);
    }
  };

  const addComment = async () => {
    if (!selectedItem || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/items/${selectedItem.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setShowCommentModal(false);
        setCommentText("");
        fetchDashboard();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to send question" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skill)
        ? prev.selectedSkills.filter(s => s !== skill)
        : [...prev.selectedSkills, skill],
      ...(skill === "Other" && prev.selectedSkills.includes(skill) ? { otherSkills: "" } : {}),
    }));
  };

  const toggleRole = (roleId: string) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId) ? prev.roles.filter(r => r !== roleId) : [...prev.roles, roleId],
    }));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    // dateStr might be "2026-03-28" or "2026-03-28T00:00:00.000Z" - extract YYYY-MM-DD
    const d = dateStr.substring(0, 10);
    const [y, m, day] = d.split("-").map(Number);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = new Date(y, m - 1, day);
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    const hour = parseInt(parts[0]);
    const min = parts[1] || "00";
    const ampm = hour >= 12 ? "pm" : "am";
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h12}:${min} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Oops</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/fixers/register" className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 text-sm">
              Register as Fixer
            </Link>
            <Link href="/volunteer/register" className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 text-sm">
              Register as Helper
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFixer = profile?.is_fixer;
  const isHelper = profile?.is_helper;

  const tabs = [
    { key: "events" as const, label: "Events", count: events.length },
    ...(items.length > 0 ? [{ key: "items" as const, label: isFixer ? "Items to Repair" : "Upcoming Items", count: items.length }] : []),
    { key: "profile" as const, label: "My Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Dashboard</h1>
          <div className="flex gap-2 mt-1">
            {isFixer && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Fixer</span>}
            {isHelper && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Helper</span>}
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">x</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {"count" in tab && tab.count !== undefined && (
                <span className="ml-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming events scheduled.</p>
            ) : events.map((event) => (
              <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(event.date)} - {formatTime(event.start_time)} to {formatTime(event.end_time)}
                </p>
                <p className="text-sm text-gray-500">{event.venue_name} - {event.venue_address}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-600 mr-1">RSVP:</span>
                  {(["yes", "maybe", "no"] as const).map((r) => (
                    <button key={r} onClick={() => updateRsvp(event.id, r)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        event.rsvp_status === r
                          ? r === "yes" ? "bg-green-600 text-white" : r === "maybe" ? "bg-yellow-500 text-white" : "bg-gray-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {r === "yes" ? "Yes" : r === "maybe" ? "Maybe" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Items Tab (fixers only) */}
        {activeTab === "items" && isFixer && (
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No items available yet.</p>
                <p className="text-sm text-gray-400">RSVP "Yes" to events to see items that need fixing.</p>
              </div>
            ) : items.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    {item.item_type && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.item_type}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{item.event_title}</span>
                </div>

                {/* Item photos */}
                {item.photos && item.photos.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {item.photos.map((photo, idx) => (
                      <button key={idx} onClick={() => setLightboxPhoto(photo)} className="flex-shrink-0">
                        <img src={photo} alt={`${item.name} photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:border-green-400 transition-colors cursor-pointer" />
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-1"><strong>Problem:</strong> {item.problem || "Not described"}</p>
                {item.description && <p className="text-sm text-gray-500 mb-1">{item.description}</p>}
                <p className="text-xs text-gray-400 mb-3">Brought by: {item.owner_name}</p>

                {/* Inline comments/questions - visible to all fixers */}
                {item.comments && item.comments.length > 0 && (
                  <div className="mb-3 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => setExpandedComments(prev => {
                        const next = new Set(prev);
                        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                        return next;
                      })}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
                    >
                      {expandedComments.has(item.id) ? "Hide" : "Show"} {item.comments.length} question{item.comments.length !== 1 ? "s" : ""}
                    </button>
                    {expandedComments.has(item.id) && (
                      <div className="space-y-2 ml-1">
                        {item.comments.map((c) => (
                          <div key={c.id} className="bg-gray-50 rounded-lg p-3 border-l-3 border-blue-300">
                            <p className="text-sm text-gray-800">{c.comment}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {c.author_name} - {new Date(c.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {isFixer ? (
                    item.interest_id ? (
                      <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                        You're interested
                      </span>
                    ) : (
                      <button onClick={() => { setSelectedItem(item); setShowInterestModal(true); }}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                        I can fix this
                      </button>
                    )
                  ) : (
                    <Link href="/fixers/register" className="px-3 py-1.5 bg-gray-100 text-gray-500 text-sm rounded-lg hover:bg-gray-200 inline-block">
                      Register as fixer to claim items
                    </Link>
                  )}
                  <button onClick={() => { setSelectedItem(item); setShowCommentModal(true); }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200 hover:bg-blue-100">
                    Ask question {item.comment_count > 0 && `(${item.comment_count})`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && profile && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
              {!editing && (
                <button onClick={() => {
                  const parsed = parseSkills(profile.skills || "");
                  setForm({
                    name: profile.name || "", phone: profile.phone || "",
                    selectedSkills: parsed.selected, otherSkills: parsed.other,
                    roles: profile.roles || [], availability: profile.availability || "",
                    comments: profile.comments || "",
                  });
                  setEditing(true);
                }}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="(519) 123-4567" />
                </div>

                {/* Fixer: skill checkboxes (matching registration form) */}
                {isFixer && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        What can you fix?
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {fixerSkills.map((skill) => (
                          <label key={skill} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                            <input type="checkbox" checked={form.selectedSkills.includes(skill)} onChange={() => toggleSkill(skill)}
                              className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                            <span className="text-sm text-gray-700">{skill}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {form.selectedSkills.includes("Other") && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Please describe your other skills
                        </label>
                        <textarea value={form.otherSkills} onChange={(e) => setForm(f => ({ ...f, otherSkills: e.target.value }))} rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="e.g., Watch repair, Knife sharpening..." />
                      </div>
                    )}
                  </>
                )}

                {/* Helper: role checkboxes */}
                {isHelper && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Helper Roles</label>
                    <div className="grid grid-cols-2 gap-3">
                      {helperRoles.map((role) => (
                        <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                          <input type="checkbox" checked={form.roles.includes(role.id)} onChange={() => toggleRole(role.id)}
                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                          <span className="text-sm text-gray-700">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                  <textarea value={form.availability} onChange={(e) => setForm(f => ({ ...f, availability: e.target.value }))} rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="When are you generally available to volunteer? e.g., Saturday mornings, weekday evenings" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Any other comments or suggestions? (optional)</label>
                  <textarea value={form.comments} onChange={(e) => setForm(f => ({ ...f, comments: e.target.value }))} rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={saveProfile} disabled={saving} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{profile.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{profile.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{profile.phone || "-"}</p>
                  </div>
                </div>

                {isFixer && (
                  <div>
                    <p className="text-sm text-gray-500">Repair Skills</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.skills ? profile.skills.split(",").map(s => s.trim()).filter(Boolean).map((s) => (
                        <span key={s} className="px-2 py-1 bg-green-50 text-green-700 text-sm rounded border border-green-200">{s}</span>
                      )) : <span className="text-gray-400">None selected</span>}
                    </div>
                  </div>
                )}

                {isHelper && (
                  <div>
                    <p className="text-sm text-gray-500">Helper Roles</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.roles && profile.roles.length > 0 ? profile.roles.map((r) => {
                        const role = helperRoles.find(hr => hr.id === r);
                        return <span key={r} className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200">{role?.label || r}</span>;
                      }) : <span className="text-gray-400">None selected</span>}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Availability</p>
                  <p className="font-medium text-gray-900">{profile.availability || "-"}</p>
                </div>
                {profile.comments && (
                  <div>
                    <p className="text-sm text-gray-500">Comments</p>
                    <p className="font-medium text-gray-900">{profile.comments}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interest Modal */}
        {showInterestModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-900 mb-2">I can fix this</h3>
              <p className="text-sm text-gray-600 mb-4">{selectedItem.name}</p>
              <textarea value={interestNotes} onChange={(e) => setInterestNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-4"
                placeholder="Any notes? (e.g., parts needed, estimated time...)" />
              <div className="flex gap-3">
                <button onClick={() => setShowInterestModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
                <button onClick={expressInterest} disabled={submitting} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {submitting ? "Submitting..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comment Modal */}
        {showCommentModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ask a Question</h3>
              <p className="text-sm text-gray-600 mb-1">{selectedItem.name}</p>
              <p className="text-xs text-gray-400 mb-4">The owner will be notified by email</p>
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-4"
                placeholder="What would you like to know about this item?" />
              <div className="flex gap-3">
                <button onClick={() => { setShowCommentModal(false); setCommentText(""); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
                <button onClick={addComment} disabled={submitting || !commentText.trim()} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? "Sending..." : "Send Question"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Photo Lightbox */}
        {lightboxPhoto && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setLightboxPhoto(null)}>
            <div className="relative max-w-2xl max-h-[80vh]">
              <button onClick={() => setLightboxPhoto(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 shadow-lg text-lg font-bold">
                x
              </button>
              <img src={lightboxPhoto} alt="Item photo" className="max-w-full max-h-[80vh] rounded-lg object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
