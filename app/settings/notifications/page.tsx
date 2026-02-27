'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NotificationPreferences {
  notify_comments: boolean;
  notify_daily_digest: boolean;
  notify_weekly_digest: boolean;
  notify_events: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notify_comments: true,
    notify_daily_digest: false,
    notify_weekly_digest: false,
    notify_events: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences');
      const data = await res.json();
      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences({
      ...preferences,
      [key]: !preferences[key]
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-green-200 hover:text-white mb-2 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-green-100">Choose how you want to be notified</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Email Notifications</h2>
          
          <div className="space-y-4">
            {/* Comments */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Item Comments</h3>
                <p className="text-sm text-gray-500">
                  Get notified when someone comments on your registered items
                </p>
              </div>
              <button
                onClick={() => handleToggle('notify_comments')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.notify_comments ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.notify_comments ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Events */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Event Updates</h3>
                <p className="text-sm text-gray-500">
                  Get notified about upcoming repair events and volunteer opportunities
                </p>
              </div>
              <button
                onClick={() => handleToggle('notify_events')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.notify_events ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.notify_events ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Daily Digest */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Daily Digest</h3>
                <p className="text-sm text-gray-500">
                  Receive a daily summary of all activity (morning email)
                </p>
              </div>
              <button
                onClick={() => handleToggle('notify_daily_digest')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.notify_daily_digest ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.notify_daily_digest ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Weekly Digest</h3>
                <p className="text-sm text-gray-500">
                  Receive a weekly summary of all activity (Monday morning)
                </p>
              </div>
              <button
                onClick={() => handleToggle('notify_weekly_digest')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.notify_weekly_digest ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.notify_weekly_digest ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && (
              <span className="text-green-600 font-medium">✓ Settings saved!</span>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">About Notifications</h2>
          <p className="text-sm text-gray-600">
            We respect your privacy and will only send you emails based on your preferences. 
            You can update these settings at any time. Reply directly to any notification email 
            to respond to comments.
          </p>
        </div>
      </div>
    </div>
  );
}
