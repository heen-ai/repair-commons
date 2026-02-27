import Link from "next/link";

export const metadata = {
  title: "Helper Guide - London Repair Café",
  description: "Guide for volunteers and helpers at London Repair Café events.",
};

export default function VolunteerGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/volunteer" className="text-green-600 hover:text-green-700 font-medium">
          ← Back to Volunteer Info
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Helper Guide</h1>

      <div className="prose prose-green max-w-none">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-yellow-900 mb-2">📋 Guide Coming Soon</h3>
          <p className="text-yellow-800">
            We're currently compiling the official helper guide. In the meantime, 
            if you have any questions about volunteering, please email us at{" "}
            <a href="mailto:info@reimagineinstitute.ca" className="underline">
              info@reimagineinstitute.ca
            </a>
          </p>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What to Expect</h2>
        <p className="text-gray-600 mb-4">
          As a helper at Repair Café, you'll be joining a friendly team of volunteers 
          dedicated to helping our community repair items and reduce waste. Here's what 
          you need to know:
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Before the Event</h3>
        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
          <li>Check your email for event details and arrival time</li>
          <li>Wear comfortable clothes that you don't mind getting a bit dirty</li>
          <li>Bring any personal tools you'd like to use (optional)</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">At the Event</h3>
        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
          <li>Arrive 15-30 minutes before the event starts for setup</li>
          <li>Check in with the event lead when you arrive</li>
          <li>You'll be assigned a role or can help where needed</li>
          <li>Meet visitors, help with repairs, or assist with logistics</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Roles We Need</h3>
        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
          <li><strong>Welcome/Greeter</strong> — Greet visitors, sign them in, and orient them</li>
          <li><strong>Check-in</strong> — Help visitors register their items</li>
          <li><strong>Check-out</strong> — Ensure visitors have everything before leaving</li>
          <li><strong>Triage</strong> — Assess items and direct to appropriate fixers</li>
          <li><strong>Photography</strong> — Capture moments from the event</li>
          <li><strong>Videos/Interviews</strong> — Help with documentation</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">What We Provide</h3>
        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
          <li>Basic tools and workspace</li>
          <li>Refreshments during the event</li>
          <li>A welcoming team environment</li>
          <li>Training for your specific role</li>
        </ul>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-green-900 mb-2">Questions?</h3>
          <p className="text-green-800">
            If you have any questions about helping at Repair Café, 
            email us at{" "}
            <a href="mailto:info@reimagineinstitute.ca" className="underline">
              info@reimagineinstitute.ca
            </a>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/volunteer/register"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          >
            Register as a Helper →
          </Link>
        </div>
      </div>
    </div>
  );
}
