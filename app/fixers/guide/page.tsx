import Link from "next/link";

export const metadata = {
  title: "Fixer Guide - London Repair Café",
  description: "Guide for volunteer fixers at London Repair Café events.",
};

export default function FixerGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/volunteer" className="inline-flex items-center text-green-100 hover:text-white mb-6 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Volunteer Info
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Fixer Guide</h1>
          <p className="text-xl text-green-100 max-w-2xl">
            Everything you need to know about volunteering as a Fixer at London Repair Café
          </p>
        </div>
      </div>

      {/* Wave divider */}
      <div className="relative -mt-1">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 md:h-16">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V0H1380C1320 0 1200 0 1080 0C960 0 840 0 720 0C600 0 480 0 360 0C240 0 120 0 60 0H0Z" fill="url(#paint0_linear)" fillOpacity="0.1"/>
          <defs>
            <linearGradient id="paint0_linear" x1="0" y1="0" x2="1440" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#16A34A"/>
              <stop offset="1" stopColor="#10B981"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">
        {/* About Section */}
        <section id="about" className="mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🏠</div>
              <h2 className="text-2xl font-bold text-gray-900">About London Repair Café</h2>
            </div>
            <div className="prose prose-green max-w-none text-gray-600">
              <p>
                The London, Ontario Repair Café started at Reimagine Co, which houses a package-free grocery store, Thing Library and community event space. There were 12 Repair Café events from 2018-2020 and we recently started again following the pandemic.
              </p>
              <p>
                <strong>Location:</strong> Reimagine Co is located at 206 Piccadilly St in the heart of downtown London - just west of Richmond Row. We have free parking in front of our building, as well as bike parking, and we're easily accessible by bus and via the TVP. There is additional free parking at Kal Tire adjacent to our building.
              </p>
              <p className="bg-yellow-50 border-l-4 border-yellow-400 p-4 -mx-4">
                <strong>Note:</strong> We are hosting the Repair Café at Reimagine AND at London Public Library branches. Please carefully note the location of the event you are registering for :)
              </p>
              <p>
                Repair Café is supported by our volunteer Fixers who enjoy repairing household items while helping visitors learn the how-to. Our Fixer team has been growing steadily since our launch in 2013. Some of them are professionals while many others are hobbyists.
              </p>
              <p>
                Thanks to our awesome team of volunteer "fixers", <strong>more than half of all the broken items</strong> that are brought in get repaired! Some of the items that have been repaired in the past are: toaster ovens, curling irons, clocks, lamps, jeans, purses, coats, chairs, radios, microwaves, etc.
              </p>
            </div>
          </div>
        </section>

        {/* Role Section */}
        <section id="role" className="mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">🔧</div>
              <h2 className="text-2xl font-bold text-gray-900">Your Role as a Fixer</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Here is some information to help orient you to your first Repair Café. It's also important that you're familiar with our <a href="https://docs.google.com/document/u/0/d/1Z_BxTrfHP59cYmZr3pJ6pC6uRrCmOOGvBBz0RC9bn88/edit" className="text-green-600 underline hover:text-green-700">Rules & Waiver</a>.
            </p>

            {/* Event */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">1</span>
                The Event
              </h3>
              <div className="ml-10 space-y-3 text-gray-600">
                <p>Events generally last for <strong>two hours</strong>. You might want to visit a Repair Café the first time simply to observe, without feeling obliged to get to work.</p>
                <p>We ask volunteers to try to arrive between <strong>5 and 5:30</strong> – extra hands are helpful in setting up and Fixers like time to set up their workspace. Fixers can arrive any time from 5:30 onwards.</p>
                <p>As a volunteer fixer, you will be paired up with a visitor seeking help in your area of expertise. Bring any tools you like to work with. Many fixers share tools and Repair Café provides some basic gear. <strong>You are here to enjoy yourself</strong> and may decline an assignment for any reason.</p>
                <p>An apprentice fixer can work together with a more experienced fixer, or move around to observe a variety of repairs.</p>
              </div>
            </div>

            {/* Before */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">2</span>
                Before the Event
              </h3>
              <div className="ml-10 space-y-3 text-gray-600">
                <p>You will receive an email before each Repair Café from our volunteer coordinator.</p>
                <p>The email will ask if you plan to attend. This information helps us to set up the event site. <strong>There is no obligation</strong> to come to every event, so feel free to come as it suits you.</p>
                <p>The email will give more information about the upcoming event and reminders about what the volunteers need to know, details such as travel directions, parking, tools and supplies – and a list of what broken items attendees have already indicated that they are bringing.</p>
                <p>This list will help you decide what tools and supplies to bring. If you have any questions about the broken items, reply to the email and your question will be forwarded to the person in question.</p>
              </div>
            </div>

            {/* What to bring */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">3</span>
                What to Bring
              </h3>
              <div className="ml-10">
                <p className="text-gray-600">It's up to you what tools and supplies to bring. Some fixers bring a large amount of tools and others bring much less. The list of broken items can help you decide what to bring, but there are always some surprises, so being well-stocked is not a bad thing!</p>
                <p className="text-gray-600 mt-2">Sewers generally bring a sewing machine, but there is usually also hand-sewing to be done.</p>
              </div>
            </div>

            {/* The Role */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">4</span>
                The Role of the Fixer
              </h3>
              <div className="ml-10">
                <p className="text-gray-600">
                  A key goal of the Repair Café is to <strong>help people learn how to repair things</strong>. When a visitor comes to your table, check to see if s/he prefers to work on the item themselves with your guidance, jointly, or observe while you do the repair them.
                </p>
                <p className="text-gray-600 mt-3">
                  If you are doing the fix on their behalf, be sure to <strong>explain the diagnosis and repair steps</strong>. Try to encourage your visitor to sit with you throughout the repair process. Of course you should feel free to collaborate with other fixers.
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">5</span>
                Items for Repair
              </h3>
              <div className="ml-10 space-y-3 text-gray-600">
                <p>Each visitor will be helped with <strong>one item per turn</strong>. For a second item, the visitor needs to line up in the queue again.</p>
                <p>Feel free to bring an item of your own for repair. You will need to register this item in the queue.</p>
              </div>
            </div>

            {/* Parts */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">6</span>
                Repair Parts & Referrals
              </h3>
              <div className="ml-10">
                <p className="text-gray-600">
                  As part of Repair Café's House Rules, neither Repair Café nor the Fixer is responsible for providing new replacement parts. If we don't have the parts, you can suggest to the visitor what to look for (and possibly return with to complete the repair).
                </p>
              </div>
            </div>

            {/* Donations */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">7</span>
                Donations
              </h3>
              <div className="ml-10">
                <p className="text-gray-600">
                  When offered a financial donation at events please direct the donor to the donation box or one of the Repair Café organizers. This does not pertain to any repair arrangement for pay made between fixer and visitor outside a Repair Café event.
                </p>
              </div>
            </div>

            {/* Photos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm">8</span>
                Photographs & Video
              </h3>
              <div className="ml-10">
                <p className="text-gray-600">
                  There are often volunteers (sometimes media representatives) taking photos and videos at Repair Café's, creating material for promotion and a record of events. If you don't want to be included in camera shots, just inform the volunteer coordinator or photographers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Other Opportunities */}
        <section id="other" className="mb-12">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">🤝</div>
              <h2 className="text-2xl font-bold text-gray-900">Other Volunteer Opportunities</h2>
            </div>
            <p className="text-gray-600 mb-4">
              The Repair Café operates in partnership with <a href="https://thinglibrary.ca/" className="text-purple-600 underline hover:text-purple-700">London's Thing Library</a>.
            </p>
            <p className="text-gray-600 mb-4">
              The Thing Library's sharing economy is powered by passionate people who want to make a difference in sustainability, community and belonging in London.
            </p>
            <p className="text-gray-600 mb-4">
              Volunteers are the beating heart of our Thing Library. They dedicate their time, share their skills, and work directly with the London community. We believe there is power in sharing and that together we can build more while wasting less. If you do too, we would love to have you join the team.
            </p>
            <p className="text-gray-600 mb-4">
              We strive to find the right fit for our volunteers. There are a number of ways to be involved with the Thing Library and we hope you find the one that allows you to explore your interests, share your talents, and ultimately elevate our cause. We just ask for a <strong>minimum commitment of 3-5 hours per month</strong> over the course of 6 months (some exceptions may apply).
            </p>
            <p className="text-gray-600">
              Volunteer roles fall in one of three main areas: <strong>Operations, Programs and Communications</strong>. <a href="https://communitysustainability.ca/volunteer" className="text-purple-600 underline hover:text-purple-700">This page on our website</a> includes some of the volunteer roles. If you would like to volunteer with the Thing Library, please complete the application form on that webpage, or email <a href="mailto:info@thinglibrary.ca" className="text-purple-600 underline hover:text-purple-700">info@thinglibrary.ca</a> if you have any questions.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section id="next" className="mb-12">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-green-100 mb-6">
              Please contact Heenal Rajani at <a href="mailto:heenal@reimagineco.ca" className="underline hover:text-white">heenal@reimagineco.ca</a> if you have any questions, or complete the volunteer application form to indicate your interest.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/fixers/register"
                className="inline-flex items-center px-6 py-3 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-all shadow-lg"
              >
                Register as a Fixer
                <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="https://communitysustainability.ca/volunteer"
                className="inline-flex items-center px-6 py-3 bg-green-500/30 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-green-500/40 transition-all"
              >
                View All Opportunities
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
