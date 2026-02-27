import Link from "next/link";

export const metadata = {
  title: "Volunteer - London Repair Café",
  description: "Volunteer as a fixer at London Repair Café.",
};

export default function VolunteerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Volunteer as a Fixer</h1>
      
      <div className="prose prose-green max-w-none">
        <p className="text-lg text-gray-600 mb-6">
          We're always looking for skilled volunteers to help repair items at our events. If you have skills in repairs — electrical, sewing, woodworking, electronics, or any other kind of fixing — we'd love to have you!
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What Being a Fixer Involves</h2>
        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
          <li>Use your repair skills to help community members fix their broken items</li>
          <li>Meet new people and share your knowledge</li>
          <li>Make a real difference by reducing waste</li>
          <li>Work alongside other passionate fixers</li>
          <li>All skill levels welcome — even beginners!</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What We Provide</h2>
        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
          <li>A welcoming environment with other volunteers</li>
          <li>Basic tools and workspace</li>
          <li>Refreshments during the event</li>
          <li>Community connection with like-minded people</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Types of Fixers We Need</h2>
        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
          <li><strong>Electrical/electronics</strong> — small appliances, lamps, gadgets</li>
          <li><strong>Sewing/textiles</strong> — clothing repairs, alterations, hemming</li>
          <li><strong>Woodworking</strong> — furniture repairs, small wooden items</li>
          <li><strong>Bicycles</strong> — basic bike repairs and maintenance</li>
          <li><strong>General repair</strong> — if you have a knack for fixing things!</li>
        </ul>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-green-900 mb-2">Interested?</h3>
          <p className="text-green-800 mb-4">
            Email us at <a href="mailto:info@reimagineinstitute.ca" className="underline">info@reimagineinstitute.ca</a> to learn more about becoming a fixer. We'd love to have you join our team!
          </p>
        </div>

        <div className="mt-8">
          <Link href="/events" className="text-green-600 hover:text-green-700 font-medium">
            ← Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}
