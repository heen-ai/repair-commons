"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  title: string;
  date: string;
  venue_name: string;
  venue_address: string;
}

interface Rsvp {
  eventId: string;
  response: "yes" | "no" | "maybe";
}

interface Profile {
  name: string;
  email: string;
  phone: string;
  skills: string;
  availability: string;
  comments: string;
  is_fixer: boolean;
  is_helper: boolean;
}

export default function FixerRegisterPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAlreadyFixer, setIsAlreadyFixer] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    availability: "",
    skills: "",
    otherSkills: "",
    comments: "",
  });
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [demographics, setDemographics] = useState({
    ageGroup: "",
    gender: "",
    genderSelfDescribe: "",
    newcomer: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check if user is logged in and pre-populate
  useEffect(() => {
    fetch("/api/volunteer/dashboard")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then((data) => {
        if (data.profile) {
          const p: Profile = data.profile;
          // Pre-populate form with existing profile
          setFormData((prev) => ({
            ...prev,
            name: p.name || prev.name,
            email: p.email || prev.email,
            phone: p.phone || prev.phone,
            skills: p.skills || prev.skills,
            availability: p.availability || prev.availability,
            comments: p.comments || prev.comments,
          }));
          // Check if already a fixer
          if (p.is_fixer) {
            setIsAlreadyFixer(true);
          }
        }
      })
      .catch(() => {
        // Not logged in - that's fine, show the form as-is
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const skills = [
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

  useEffect(() => {
    // Fetch upcoming events
    fetch("/api/fixers/register")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events) {
          setEvents(data.events);
        }
      })
      .catch((err) => console.error("Failed to fetch events:", err))
      .finally(() => setLoadingEvents(false));
  }, []);

  const handleSkillChange = (skill: string, checked: boolean) => {
    const current = formData.skills ? formData.skills.split(",").filter(Boolean) : [];
    if (checked) {
      setFormData((prev) => ({ ...prev, skills: [...current, skill].join(",") }));
    } else {
      setFormData((prev) => ({ ...prev, skills: current.filter((s) => s !== skill).join(","), otherSkills: skill === "Other" ? "" : prev.otherSkills }));
    }
  };

  const isSkillSelected = (skill: string) => formData.skills?.includes(skill);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRsvpChange = (eventId: string, response: "yes" | "no" | "maybe") => {
    setRsvps((prev) => {
      const existing = prev.find((r) => r.eventId === eventId);
      if (existing) {
        return prev.map((r) => (r.eventId === eventId ? { ...r, response } : r));
      }
      return [...prev, { eventId, response }];
    });
  };

  const getRsvpValue = (eventId: string): "" | "yes" | "no" | "maybe" => {
    const rsvp = rsvps.find((r) => r.eventId === eventId);
    return rsvp?.response || "";
  };

  const handleDemographicsChange = (field: string, value: string) => {
    setDemographics((prev) => ({ ...prev, [field]: value }));
    if (field !== "genderSelfDescribe") {
      setDemographics((prev) => ({ ...prev, genderSelfDescribe: field === "gender" && value !== "self_describe" ? "" : prev.genderSelfDescribe }));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const finalSkills = isSkillSelected("Other") && formData.otherSkills
      ? formData.skills.replace("Other", `Other: ${formData.otherSkills}`)
      : formData.skills;

    // Filter out empty RSVPs
    const validRsvps = rsvps.filter((r) => r.response);

    try {
      const response = await fetch("/api/fixers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          skills: finalSkills,
          isFixer: true,
          eventRsvps: validRsvps,
          ageGroup: demographics.ageGroup || null,
          gender: demographics.gender || null,
          genderSelfDescribe: demographics.genderSelfDescribe || null,
          newcomer: demographics.newcomer || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message || "Registration submitted successfully! We'll be in touch soon." });
        setFormData({ name: "", email: "", phone: "", availability: "", skills: "", otherSkills: "", comments: "" });
        setRsvps([]);
        setDemographics({ ageGroup: "", gender: "", genderSelfDescribe: "", newcomer: "" });
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

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Register as a Fixer</h1>
      <p className="text-gray-600 mb-8">
        Join our team of skilled volunteers and help fix items at Repair Café events!
      </p>

      {loadingProfile ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : isAlreadyFixer ? (
        <div className="bg-green-100 border-2 border-green-500 rounded-xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">🔧</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">You're already a fixer!</h2>
          <p className="text-green-700">You can already claim items to repair. Update your profile below if anything has changed.</p>
          <Link href="/volunteer/dashboard" className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Go to Dashboard
          </Link>
        </div>
      ) : null}

      {message && message.type === "success" && (
        <div className="bg-green-100 border-2 border-green-500 rounded-xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Registration Complete!</h2>
          <p className="text-green-700">{message.text}</p>
          <p className="text-green-600 text-sm mt-2">Check your email for confirmation.</p>
          <Link href="/events" className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Browse Events
          </Link>
        </div>
      )}

      {message && message.type === "error" && (
        <div className="p-4 rounded-lg mb-6 bg-red-50 border border-red-200 text-red-800">
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Skills */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">
            What skills can you help with? (Select all that apply)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {skills.map((skill) => (
              <label key={skill} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={isSkillSelected(skill)}
                  onChange={(e) => handleSkillChange(skill, e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <span className="text-gray-700 text-sm">{skill}</span>
              </label>
            ))}
          </div>
          
          {isSkillSelected("Other") && (
            <div className="mt-4">
              <label htmlFor="otherSkills" className="block text-sm font-medium text-gray-700 mb-1">
                Please describe your other skills
              </label>
              <textarea
                id="otherSkills"
                name="otherSkills"
                rows={2}
                value={formData.otherSkills}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Tell us about your other skills..."
              />
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="Your full name" />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="your@email.com" />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone (optional)
          </label>
          <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="(519) 123-4567" />
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
            Availability <span className="text-red-500">*</span>
          </label>
          <textarea id="availability" name="availability" required rows={3} value={formData.availability} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="e.g., Saturday mornings, weekday evenings, any time..." />
        </div>

        {/* Upcoming Events RSVP */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">
            Upcoming Events - RSVP
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Let us know which events you can attend (optional)
          </p>
          
          {loadingEvents ? (
            <p className="text-gray-500 text-sm">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events scheduled.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="mb-3">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
                    <p className="text-sm text-gray-500">{event.venue_name}</p>
                  </div>
                  <div className="flex gap-4">
                    {(["yes", "maybe", "no"] as const).map((response) => (
                      <label key={response} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`rsvp-${event.id}`}
                          checked={getRsvpValue(event.id) === response}
                          onChange={() => handleRsvpChange(event.id, response)}
                          className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{response === "yes" ? "Yes" : response === "no" ? "Can't make it" : "Maybe"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
            Any other comments or suggestions? (optional)
          </label>
          <textarea id="comments" name="comments" rows={3} value={formData.comments} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Any ideas, questions, or anything else you'd like to share..." />
        </div>

        {/* Demographics (Optional) */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-1">Optional Demographics</h3>
          <p className="text-sm text-gray-600 mb-4">
            Help us better understand our community (completely optional)
          </p>
          
          <div className="space-y-5">
            {/* Age Group */}
            <div>
              <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700 mb-1">
                What is your age group?
              </label>
              <select
                id="ageGroup"
                value={demographics.ageGroup}
                onChange={(e) => handleDemographicsChange("ageGroup", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Prefer not to say</option>
                <option value="0-12">0-12</option>
                <option value="13-25">13-25</option>
                <option value="26-64">26-64</option>
                <option value="65+">65+</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                How do you identify?
              </label>
              <select
                id="gender"
                value={demographics.gender}
                onChange={(e) => handleDemographicsChange("gender", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Prefer not to say</option>
                <option value="man">Man</option>
                <option value="woman">Woman</option>
                <option value="non_binary">Non-binary</option>
                <option value="self_describe">Prefer to self-describe</option>
              </select>
              {demographics.gender === "self_describe" && (
                <input
                  type="text"
                  value={demographics.genderSelfDescribe}
                  onChange={(e) => handleDemographicsChange("genderSelfDescribe", e.target.value)}
                  placeholder="Please describe"
                  className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              )}
            </div>

            {/* Newcomer to Canada */}
            <div>
              <label htmlFor="newcomer" className="block text-sm font-medium text-gray-700 mb-1">
                Are you new to Canada?
              </label>
              <select
                id="newcomer"
                value={demographics.newcomer}
                onChange={(e) => handleDemographicsChange("newcomer", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Prefer not to say</option>
                <option value="yes_less_5">Yes - less than 5 years</option>
                <option value="yes_5_plus">Yes - 5+ years</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={isSubmitting}
          className="w-full bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {isSubmitting ? "Submitting..." : "Register as a Fixer"}
        </button>
      </form>
    </div>
  );
}
