"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    availability: "",
    comments: "",
    hasVolunteeredBefore: false,
    roles: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const roles = [
    { id: "welcome", label: "Welcome/greeter" },
    { id: "checkin", label: "Check-in" },
    { id: "checkout", label: "Check-out" },
    { id: "triage", label: "Triage" },
    { id: "photography", label: "Photography" },
    { id: "videos", label: "Videos/interviews" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter((r) => r !== roleId)
        : [...prev.roles, roleId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/helpers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          availability: "",
          comments: "",
          hasVolunteeredBefore: false,
          roles: [],
        });
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/volunteer" className="text-green-600 hover:text-green-700 font-medium">
          ← Back to Volunteer Info
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Register as a Helper</h1>
      <p className="text-gray-600 mb-8">
        Join our team of volunteers and help make Repair Café events possible!
      </p>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Has volunteered before */}
        <div className="bg-gray-50 rounded-lg p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="hasVolunteeredBefore"
              checked={formData.hasVolunteeredBefore}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hasVolunteeredBefore: e.target.checked,
                  // Clear roles if they've never volunteered before
                  roles: e.target.checked ? prev.roles : [],
                }))
              }
              className="mt-1 w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
            />
            <div>
              <span className="font-medium text-gray-900">
                Have you volunteered at one of our Repair Cafés before?
              </span>
              <p className="text-sm text-gray-500 mt-1">
                If yes, please select the roles you'd like to help with below.
              </p>
            </div>
          </label>
        </div>

        {/* Roles (shown only if they've volunteered before) */}
        {formData.hasVolunteeredBefore && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-medium text-gray-900 mb-4">
              Which roles are you interested in? (Select all that apply)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role.id)}
                    onChange={() => handleCheckboxChange(role.id)}
                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="text-gray-700">{role.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Your full name"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="your@email.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone (optional)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="(519) 123-4567"
          />
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
            Availability (optional)
          </label>
          <textarea
            id="availability"
            name="availability"
            rows={3}
            value={formData.availability}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="e.g., Saturday mornings, weekday evenings, any time..."
          />
        </div>

        {/* Comments/Suggestions */}
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
            Comments or Suggestions (optional)
          </label>
          <textarea
            id="comments"
            name="comments"
            rows={4}
            value={formData.comments}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Any ideas, questions, or anything else you'd like to share..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Submitting..." : "Register as Helper"}
        </button>
      </form>
    </div>
  );
}
