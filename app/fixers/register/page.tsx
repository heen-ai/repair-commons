'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  venue_name: string;
  venue_address: string;
}

export default function FixerRegisterPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    skills: '',
    availability: '',
    comments: ''
  });
  const [rsvps, setRsvps] = useState<Record<string, 'yes' | 'no' | 'maybe' | null>>({});

  useEffect(() => {
    fetch('/api/fixers/register')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvents(data.events);
          setSkills(data.skills || []);
          // Initialize RSVPs
          const initialRsvps: Record<string, 'yes' | 'no' | 'maybe' | null> = {};
          data.events.forEach((e: Event) => {
            initialRsvps[e.id] = null;
          });
          setRsvps(initialRsvps);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const eventRsvps = events
      .filter(e => rsvps[e.id] !== null)
      .map(e => ({ eventId: e.id, response: rsvps[e.id] }));

    try {
      const res = await fetch('/api/fixers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          skillIds: selectedSkills,
          eventRsvps 
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Group skills by category
  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  if (success) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-800 mb-4">Welcome to the Team!</h1>
          <p className="text-gray-600 mb-6">
            Your fixer profile has been created. We'll be in touch before upcoming events.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Become a Fixer</h1>
          <p className="text-amber-700">
            Join our team of volunteer repair experts at London Repair Café
          </p>
          <a
            href="/fixers/guide"
            target="_blank"
            className="inline-block mt-2 text-amber-600 hover:text-amber-800 underline"
          >
            Read the Guide for New Fixers →
          </a>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">⏳</div>
            <p className="text-gray-600 mt-2">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            {/* Personal Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="(519) 555-0123"
                  />
                </div>
              </div>
            </div>

            {/* Skills Selection */}
            {skills.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Your Repair Skills</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select the skills you're confident in. This helps us match you with items you'll enjoy fixing.
                </p>
                <div className="space-y-4">
                  {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                    <div key={category} className="bg-amber-50 rounded-lg p-4">
                      <h3 className="font-medium text-amber-900 mb-2 capitalize">{category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {categorySkills.map(skill => (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => handleSkillToggle(skill.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              selectedSkills.includes(skill.id)
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                            title={skill.description}
                          >
                            {skill.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSkills.length > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Additional Skills Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Details</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional skills or experience (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.skills}
                    onChange={e => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Any other repair skills or experience you'd like to share..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    When are you typically available? (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.availability}
                    onChange={e => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g., Weekday evenings, Saturday afternoons..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Any other comments or suggestions?
                  </label>
                  <textarea
                    rows={2}
                    value={formData.comments}
                    onChange={e => setFormData({ ...formData, comments: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Anything else you'd like us to know..."
                  />
                </div>
              </div>
            </div>

            {/* Event RSVPs */}
            {events.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Events</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Can you help at any of these upcoming events?
                </p>
                <div className="space-y-3">
                  {events.map(event => (
                    <div key={event.id} className="bg-amber-50 rounded-lg p-4">
                      <div className="font-medium text-amber-900">{event.title}</div>
                      <div className="text-sm text-amber-700">
                        {formatDate(event.event_date)} at {formatTime(event.event_date)}
                      </div>
                      <div className="text-sm text-amber-600">{event.venue_name}</div>
                      <div className="flex gap-2 mt-3">
                        {(['yes', 'maybe', 'no'] as const).map(response => (
                          <button
                            key={response}
                            type="button"
                            onClick={() => setRsvps({ ...rsvps, [event.id]: response })}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                              rsvps[event.id] === response
                                ? response === 'yes'
                                  ? 'bg-green-600 text-white'
                                  : response === 'maybe'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {response === 'yes' ? '✓ Yes' : response === 'maybe' ? '? Maybe' : '✗ No'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Register as a Fixer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
