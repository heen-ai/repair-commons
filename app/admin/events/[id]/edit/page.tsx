"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_id: string | null;
  venue_name: string;
  capacity: number;
  status: string;
  registration_opens_at: string | null;
}

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    start_time: "",
    end_time: "",
    venue_id: "",
    capacity: 40,
    status: "draft",
    registration_opens_at: "",
  });

  useEffect(() => {
    // Fetch venues
    fetch("/api/venues")
      .then((res) => res.json())
      .then((data) => {
        if (data.venues) {
          setVenues(data.venues);
        }
      })
      .catch((err) => console.error("Error fetching venues:", err));

    // Fetch event data
    fetch(`/api/admin/events/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.event) {
          const event = data.event;
          setFormData({
            title: event.title || "",
            description: event.description || "",
            date: event.date ? event.date.split("T")[0] : "",
            start_time: event.start_time || "",
            end_time: event.end_time || "",
            venue_id: event.venue_id || "",
            capacity: event.capacity || 40,
            status: event.status || "draft",
            registration_opens_at: event.registration_opens_at
              ? event.registration_opens_at.slice(0, 16)
              : "",
          });
        } else {
          setError("Event not found");
        }
      })
      .catch((err) => console.error("Error fetching event:", err))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/events/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.message || "Failed to update event");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/events/${params.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        router.push("/admin/events");
      } else {
        setError(data.message || "Failed to delete event");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/admin/events"
        className="text-green-600 hover:text-green-700 text-sm mb-4 inline-block"
      >
        ← Back to Events
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Event</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
          Event updated successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="e.g., February Repair Café"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Describe the event..."
          />
        </div>

        {/* Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              required
              value={formData.start_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              required
              value={formData.end_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Venue */}
        <div>
          <label htmlFor="venue_id" className="block text-sm font-medium text-gray-700 mb-1">
            Venue
          </label>
          <select
            id="venue_id"
            name="venue_id"
            value={formData.venue_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select a venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} - {venue.city}
              </option>
            ))}
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
            Capacity
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            min="1"
            value={formData.capacity}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* Registration Opens */}
        <div>
          <label htmlFor="registration_opens_at" className="block text-sm font-medium text-gray-700 mb-1">
            Registration Opens At
          </label>
          <input
            type="datetime-local"
            id="registration_opens_at"
            name="registration_opens_at"
            value={formData.registration_opens_at}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use default (registration opens 2 weeks before event)
          </p>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push("/admin/events")}
            className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Delete button */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete this event"}
        </button>
      </div>
    </div>
  );
}
