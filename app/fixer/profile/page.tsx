'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  self_rated?: boolean;
}

interface Stats {
  totalRepairs: number;
  fixedItems: number;
  partiallyFixed: number;
  notRepairable: number;
}

interface RepairHistory {
  name: string;
  problem: string;
  outcome: string;
  outcome_notes: string;
  repair_completed_at: string;
  event_title: string;
  event_date: string;
}

export default function FixerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile data
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  
  // Stats and history
  const [stats, setStats] = useState<Stats>({ totalRepairs: 0, fixedItems: 0, partiallyFixed: 0, notRepairable: 0 });
  const [recentRepairs, setRecentRepairs] = useState<RepairHistory[]>([]);
  const [isFixer, setIsFixer] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/fixer/profile');
      const data = await res.json();
      
      if (data.success) {
        setAllSkills(data.allSkills || []);
        
        if (data.fixer) {
          setIsFixer(true);
          setName(data.fixer.name || '');
          setPhone(data.fixer.phone || '');
          setBio(data.fixer.skills || '');
          setAvailability(data.fixer.availability || '');
          setSelectedSkills(data.userSkills?.map((s: Skill) => s.id) || []);
        }
        
        setStats(data.stats);
        setRecentRepairs(data.recentRepairs || []);
      } else {
        setError(data.message || 'Failed to load profile');
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fixer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          bio,
          availability,
          skills: selectedSkills,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('Profile saved successfully!');
        setIsFixer(true);
      } else {
        setError(data.message || 'Failed to save profile');
      }
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Group skills by category
  const skillsByCategory = allSkills.reduce((acc: Record<string, Skill[]>, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-green-600 hover:underline text-sm"
          >
            ← Back to Home
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fixer Profile</h1>
        <p className="text-gray-600 mb-6">Manage your fixer profile, skills, and view your repair history.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Repairs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalRepairs}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Fixed</p>
            <p className="text-2xl font-bold text-green-600">{stats.fixedItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Partially Fixed</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.partiallyFixed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Not Repairable</p>
            <p className="text-2xl font-bold text-red-600">{stats.notRepairable}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Your phone number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
              <textarea
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="When are you available to volunteer? (e.g., Saturday mornings, any time)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Notes</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Tell us about your repair experience and interests..."
              />
            </div>
          </div>
        </div>

        {/* Skills Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Skills</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select the skills you're willing to use at repair events. This helps us match you with items you can fix.
          </p>
          
          {Object.entries(skillsByCategory).map(([category, skills]) => (
            <div key={category} className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedSkills.includes(skill.id)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {allSkills.length === 0 && (
            <p className="text-gray-500">No skills available. Please contact an admin.</p>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isFixer ? 'Update Profile' : 'Create Profile'}
        </button>

        {/* Repair History */}
        {recentRepairs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Repairs</h2>
            
            <div className="space-y-3">
              {recentRepairs.map((repair, idx) => (
                <div key={idx} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{repair.name}</p>
                      <p className="text-sm text-gray-600">{repair.problem}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {repair.event_title} • {new Date(repair.event_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      repair.outcome === 'fixed' ? 'bg-green-100 text-green-700' :
                      repair.outcome === 'partially_fixed' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {repair.outcome === 'fixed' ? 'Fixed' : 
                       repair.outcome === 'partially_fixed' ? 'Partially Fixed' : 
                       'Not Repairable'}
                    </span>
                  </div>
                  {repair.outcome_notes && (
                    <p className="text-sm text-gray-500 mt-2">{repair.outcome_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
