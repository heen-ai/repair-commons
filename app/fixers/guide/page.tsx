'use client';

import Link from 'next/link';

export default function FixerGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      {/* Header */}
      <header className="bg-amber-800 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-amber-200 hover:text-white text-sm">
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-10 px-4">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-amber-900 mb-3">Guide for New Fixers</h1>
          <p className="text-xl text-amber-700">London Repair Café</p>
          <div className="mt-6">
            <Link
              href="/fixers/register"
              className="inline-block bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition shadow-lg"
            >
              Register as a Fixer →
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-xl p-8 md:p-10 space-y-8">
          {/* About Section */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              About London Repair Café
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>
                The London, Ontario Repair Café started at Reimagine Co, which houses a package-free grocery store, 
                Thing Library and community event space. There were 12 Repair Café events from 2018-2020 and we 
                recently started again following the pandemic.
              </p>
              <p>
                <strong>Location:</strong> Reimagine Co is located at 206 Piccadilly St in the heart of downtown London - 
                just west of Richmond Row. We have free parking in front of our building, as well as bike parking, 
                and we're easily accessible by bus and via the TVP. There is additional free parking at Kal Tire 
                adjacent to our building.
              </p>
              <p className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-400">
                <strong>Note:</strong> We are hosting the Repair Café at Reimagine AND at London Public Library branches. 
                Please carefully note the location of the event you are registering for :)
              </p>
              <p>
                Repair Café is supported by our volunteer <strong>Fixers</strong> who enjoy repairing household items while 
                helping visitors learn the how-to. Our Fixer team has been growing steadily since our launch in 2013. 
                Some of them are professionals while many others are hobbyists.
              </p>
            </div>
          </section>

          {/* The Event */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              The Event
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>Events generally last for two hours. You might want to visit a Repair Café the first time simply to observe, without feeling obliged to get to work.</p>
              <p>We ask volunteers to try to arrive between <strong>5 and 5:30</strong> – extra hands are helpful in setting up and Fixers like time to set up their workspace. Fixers can arrive any time from 5:30 onwards.</p>
              <p>As a volunteer fixer, you will be paired up with a visitor seeking help in your area of expertise. Bring any tools you like to work with. Many fixers share tools and Repair Café provides some basic gear. You are here to enjoy yourself and may decline an assignment for any reason.</p>
              <p>An apprentice fixer can work together with a more experienced fixer, or move around to observe a variety of repairs.</p>
            </div>
          </section>

          {/* Before the Event */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              Before the Event
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>You will receive an email before each Repair Café from our volunteer coordinator. The email will ask if you plan to attend. This information helps us to set up the event site. There is no obligation to come to every event, so feel free to come as it suits you.</p>
              <p>The email will give more information about the upcoming event and reminders about what the volunteers need to know, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Travel directions and parking</li>
                <li>Tools and supplies to bring</li>
                <li>List of broken items attendees are bringing</li>
              </ul>
              <p>This list will help you decide what tools and supplies to bring. If you have any questions about the broken items, reply to the email and your question will be forwarded to the person in question.</p>
            </div>
          </section>

          {/* What to Bring */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              What to Bring
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>It's up to you what tools and supplies to bring. Some fixers bring a large amount of tools and others bring much less. The list of broken items can help you decide what to bring, but there are always some surprises, so being well-stocked is not a bad thing!</p>
              <p className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                <strong>For sewers:</strong> Please bring a sewing machine if possible, though there is usually also hand-sewing to be done.
              </p>
            </div>
          </section>

          {/* The Role of the Fixer */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              The Role of the Fixer
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>A key goal of the Repair Café is to help people learn how to repair things. When a visitor comes to your table:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Check if they prefer to work on the item themselves with your guidance</li>
                <li>Work on it jointly together</li>
                <li>Or simply observe while you do the repair</li>
              </ul>
              <p>If you are doing the fix on their behalf, be sure to explain the diagnosis and repair steps. Try to encourage your visitor to sit with you throughout the repair process.</p>
              <p>Of course, feel free to collaborate with other fixers!</p>
            </div>
          </section>

          {/* Items for Repair */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              Items for Repair
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>Each visitor will be helped with <strong>one item per turn</strong>. For a second item, the visitor needs to line up in the queue again.</p>
              <p>Feel free to bring an item of your own for repair. You will need to register this item in the queue.</p>
            </div>
          </section>

          {/* Repair Parts */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              Repair Parts & Referral to Professional Service
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                As part of Repair Café's House Rules, neither Repair Café nor the Fixer is responsible for providing new replacement parts.
              </p>
              <p>If we don't have the parts, you can suggest to the visitor what to look for (and possibly return with to complete the repair).</p>
            </div>
          </section>

          {/* Donations */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              Donations
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>When offered a financial donation at events please direct the donor to the donation box or one of the Repair Café organizers.</p>
              <p className="text-sm text-gray-500">This does not pertain to any repair arrangement for pay made between fixer and visitor outside a Repair Café event.</p>
            </div>
          </section>

          {/* Photos */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              Photographs & Video
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>There are often volunteers (sometimes media representatives) taking photos and videos at Repair Cafés, creating material for promotion and a record of events.</p>
              <p>If you don't want to be included in camera shots, just inform the volunteer coordinator or photographers.</p>
            </div>
          </section>

          {/* Other Opportunities */}
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 pb-2 border-b-2 border-amber-200">
              Other Volunteer Opportunities
            </h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>The Repair Café operates in partnership with London's <strong>Thing Library</strong>.</p>
              <p>The Thing Library's sharing economy is powered by passionate people who want to make a difference in sustainability, community and belonging in London.</p>
              <p>Volunteers are the beating heart of our Thing Library. They dedicate their time, share their skills, and work directly with the London community.</p>
              <p>We just ask for a minimum commitment of <strong>3-5 hours per month</strong> over the course of 6 months (some exceptions may apply).</p>
              <p>Volunteer roles fall in one of three main areas: <strong>Operations, Programs and Communications</strong>.</p>
              <p>If you would like to volunteer with the Thing Library, please complete the application form on their website, or email <strong>info@thinglibrary.ca</strong> if you have any questions.</p>
            </div>
          </section>

          {/* Next Steps */}
          <section className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
            <h2 className="text-2xl font-bold text-amber-900 mb-4">Next Steps</h2>
            <div className="text-gray-700 space-y-4 leading-relaxed">
              <p>Please contact <strong>Heenal Rajani</strong> - <a href="mailto:heenal@reimagineco.ca" className="text-amber-700 underline">heenal@reimagineco.ca</a> - if you have any questions or complete the volunteer application form to indicate your interest in volunteering.</p>
              <p>Please share:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>What your skills are</li>
                <li>What dates you are available</li>
                <li>Any other relevant information</li>
              </ul>
              <p className="font-semibold text-amber-900 pt-2">Thank you for your interest!</p>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center pt-6">
            <Link
              href="/fixers/register"
              className="inline-block bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition shadow-lg"
            >
              Register as a Fixer →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
