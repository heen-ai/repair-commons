import Link from "next/link";

export const metadata = {
  title: "Volunteer - London Repair Café",
  description: "Volunteer as a fixer or helper at London Repair Café.",
};

export default function VolunteerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 to-emerald-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Volunteer With Us</h1>
          <p className="text-xl text-green-100/80">Help keep items out of landfills and build community</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Two paths */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Fixers */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl mb-4">🛠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Become a Fixer</h2>
              <p className="text-gray-600 mb-6">
                Use your repair skills to help community members fix their broken items. All skills welcome!
              </p>
              <div className="space-y-3">
                <Link 
                  href="/fixers/guide" 
                  className="block w-full text-center px-6 py-3 border-2 border-green-600 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors"
                >
                  Read the Fixer Guide
                </Link>
                <Link 
                  href="/fixers/register" 
                  className="block w-full text-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                >
                  Register as a Fixer
                </Link>
              </div>
            </div>

            {/* Helpers */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-4">🤝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Become a Helper</h2>
              <p className="text-gray-600 mb-6">
                Help with check-in, greeting, triage, photography, or setup. No repair skills needed!
              </p>
              <div className="space-y-3">
                <Link 
                  href="/volunteer/guide" 
                  className="block w-full text-center px-6 py-3 border-2 border-blue-600 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Read the Helper Guide
                </Link>
                <Link 
                  href="/volunteer/register" 
                  className="block w-full text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Register as a Helper
                </Link>
              </div>
            </div>
          </div>

          {/* What we provide */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">What We Provide</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "A welcoming environment with other volunteers",
                "Basic tools and workspace",
                "Refreshments during the event",
                "Community connection with like-minded people"
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Types of fixers needed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Types of Fixers We Need</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Lamps", desc: "All types of lamps and lighting" },
                { title: "Computers", desc: "Laptops, desktops, accessories" },
                { title: "Phones/tablets", desc: "Mobile devices and accessories" },
                { title: "Electronics", desc: "General electronic devices" },
                { title: "Small appliances", desc: "Toasters, blenders, kettles, etc." },
                { title: "Sewing machines", desc: "Machine repairs and maintenance" },
                { title: "Clothing repairs", desc: "Mending, alterations, patching" },
                { title: "Soft goods", desc: "Bags, backpacks, cushions" },
                { title: "Bicycles", desc: "Basic repairs and maintenance" },
                { title: "Furniture & household", desc: "Furniture, fixtures, household items" },
                { title: "Jewellery", desc: "Jewellery repairs and restoration" },
              ].map((item) => (
                <div key={item.title} className="bg-gray-50 rounded-lg p-4">
                  <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
