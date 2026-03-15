'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HelperProfile {
  name: string;
  email: string;
  phone?: string;
  availability?: string;
  roles?: string[];
  skills?: string[];
  has_volunteered_before: boolean;
  registration_status?: string;
}

export default function HelperProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState<HelperProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [availability, setAvailability] = useState('');
  const [roles, setRoles] = useState('');
  const [skills, setSkills] = useState('');
  const [hasVolunteeredBefore, setHasVolunteeredBefore] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/helper/profile');
      const data = await res.json();
      
      if (data.profile) {
        setProfile(data.profile);
        setName(data.profile.name || '');
        setEmail(data.profile.email || '');
        setPhone(data.profile.phone || '');
        setAvailability(data.profile.availability || '');
        setRoles(data.profile.roles?.join(', ') || '');
        setSkills(data.profile.skills?.join(', ') || '');
        setHasVolunteeredBefore(data.profile.has_volunteered_before || false);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('availability', availability);
      formData.append('roles', roles);
      formData.append('skills', skills);
      formData.append('has_volunteered_before', hasVolunteeredBefore ? 'on' : '');

      const res = await fetch('/api/helper/profile', {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();

      if (data.message === 'Profile updated successfully') {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save profile' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">No Helper Profile Found</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have a helper profile yet. Register as a volunteer to create one.
          </p>
          <a
            href="/volunteer/register"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-green-700 transition-colors"
          >
            Register as Volunteer
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <a href="/volunteer" className="text-green-600 hover:text-green-700 text-sm">
            ← Back to Volunteer Dashboard
          </a>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Helper Profile</h1>
        <p className="text-gray-600 mb-6">Manage your volunteer information and availability</p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-green-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Contact admin to change email</p>
          </div>

          <div className="mb-4">
            <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-green-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="availability" className="block text-gray-700 text-sm font-bold mb-2">
              Availability
            </label>
            <textarea
              id="availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="e.g., Available on Saturdays, prefer morning shifts"
              rows={3}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-green-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="roles" className="block text-gray-700 text-sm font-bold mb-2">
              Roles (comma-separated)
            </label>
            <input
              type="text"
              id="roles"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              placeholder="e.g., welcome desk, fixer, trainer"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              List volunteer roles you&apos;re interested in
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="skills" className="block text-gray-700 text-sm font-bold mb-2">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., electronics, textiles, mechanical, teaching"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              List your relevant skills separated by commas
            </p>
          </div>

          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasVolunteeredBefore}
                onChange={(e) => setHasVolunteeredBefore(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-green-600 peer-checked:border-green-600 transition-colors mr-3 flex items-center justify-center">
                <svg className="w-3 h-3 text-white hidden peer-checked:block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">I have volunteered at a Repair Café before</span>
            </label>
          </div>

          {profile?.registration_status && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Registration Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-xs ${
                  profile.registration_status === 'approved' ? 'bg-green-100 text-green-700' :
                  profile.registration_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {profile.registration_status}
                </span>
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
