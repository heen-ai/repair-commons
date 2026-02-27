import Link from "next/link";

export const metadata = {
  title: "About - London Repair Café",
  description: "About London Repair Café - a community initiative to reduce waste and build skills.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">About London Repair Café</h1>
      
      <div className="prose prose-green max-w-none">
        <p className="text-lg text-gray-600 mb-6">
          Repair Café is a global movement to reduce waste and build skills and community.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What We Do</h2>
        <p className="text-gray-600 mb-4">
          During our monthly two-hour events, we have community members on hand who can help you with your items that need fixing. 
          If you have a small appliance or piece of clothing or something else that needs repairing, please bring it in and have it repaired — for free!
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Our Success Rate</h2>
        <p className="text-gray-600 mb-4">
          Thanks to our awesome team of volunteer "fixers," more than half of all the broken items that are brought in get repaired!
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">What We've Fixed</h2>
        <p className="text-gray-600 mb-4">
          Some of the items that have been repaired in the past include: toaster ovens, curling irons, clocks, lamps, jeans, purses, coats, chairs, radios, microwaves, and many more.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-green-900 mb-2">Join Us!</h3>
          <p className="text-green-800 mb-4">
            Ready to fix something? Browse our upcoming events and register to save your spot.
          </p>
          <Link href="/events" className="inline-flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            View Upcoming Events
          </Link>
        </div>
      </div>
    </div>
  );
}
