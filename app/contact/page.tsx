import Link from "next/link";

export const metadata = {
  title: "Contact - London Repair Café",
  description: "Contact London Repair Café.",
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>
      
      <div className="prose prose-green max-w-none">
        <p className="text-lg text-gray-600 mb-6">
          Have questions? We'd love to hear from you!
        </p>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">General Enquiries</h2>
          <p className="text-gray-600 mb-4">
            For general questions about London Repair Café:
          </p>
          <a href="mailto:info@reimagineinstitute.ca" className="text-green-600 hover:text-green-700 font-medium text-lg">
            info@reimagineinstitute.ca
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Volunteering</h2>
          <p className="text-gray-600 mb-4">
            Interested in becoming a fixer or volunteering your time?
          </p>
          <Link href="/volunteer" className="text-green-600 hover:text-green-700 font-medium">
            Learn about volunteering →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Sponsorship & Partnerships</h2>
          <p className="text-gray-600 mb-4">
            If your company or organization is interested in sponsoring, donating to, or partnering with us:
          </p>
          <a href="mailto:office@reimagineinstitute.ca" className="text-green-600 hover:text-green-700 font-medium">
            office@reimagineinstitute.ca
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Follow Us</h2>
          <p className="text-gray-600 mb-4">
            Stay updated with the latest news and events:
          </p>
          <div className="flex gap-4">
            <a href="https://facebook.com/reimagineinstitute" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
              Facebook
            </a>
            <a href="https://instagram.com/reimagineinstitute" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
              Instagram
            </a>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-green-900 mb-2">Mailing List</h3>
          <p className="text-green-800 mb-4">
            Join our mailing list to be the first to hear about upcoming events and opportunities.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/events" className="text-green-600 hover:text-green-700 font-medium">
          ← View Upcoming Events
        </Link>
      </div>
    </div>
  );
}
