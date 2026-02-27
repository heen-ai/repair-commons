import Link from "next/link";

export const metadata = {
  title: "FAQ - London Repair Café",
  description: "Frequently asked questions about London Repair Café.",
};

export default function FAQPage() {
  const faqs = [
    {
      q: "What is the Repair Café and how does it work?",
      a: "The Repair Café is a free, volunteer-run initiative that operates about once per month with the goal of repairing items that were once loved but are no longer working. Here's how it works: RSVP to an event, sign the waiver, arrive early to get a spot in the queue, check in at the desk, wait to be called, work with a fixer on your item, then check out and provide feedback."
    },
    {
      q: "Do I need to RSVP ahead of time?",
      a: "While not mandatory, we highly recommend that you RSVP because: (1) It gives us a better idea of the number of people to expect so we can ensure the right number of volunteer fixers are present, and (2) We can make sure that at least one fixer is skilled at repairing the type of item you plan to bring. That said, if you decide to attend last-minute, we'll gladly still take a look!"
    },
    {
      q: "How many items can I bring?",
      a: "In order to give everyone a chance to have their item looked at, we'll only repair one of your items at a time. If you bring more than one item, return to the check-in queue after your first item has been looked at."
    },
    {
      q: "What types of items can you fix?",
      a: "We've successfully repaired over 500 items! Common repairs include: clothing/fabric items, lamps (electrical), sewing machines, small appliances (blenders, toasters, coffeemakers), items with physical breaks (ceramics, wooden chairs), clocks, bicycles, and much more. If you're not sure, email us and ask!"
    },
    {
      q: "What types of items can you likely NOT fix?",
      a: "While we've successfully repaired a variety of items, some may be too difficult: mini refrigerators, dehumidifiers, zipper replacements (can take 2-3 hours), certain clothing/fabric repairs. We will NOT accept any gasoline-powered items."
    },
    {
      q: "Can you fix my broken zipper?",
      a: "We are currently unable to replace zippers at Repair Café due to time constraints (it can take up to 2-3 hours). However, if only a small section of sewing is loose around the zipper, we may be able to repair it — no guarantees though!"
    },
    {
      q: "Can you fix my clothing/fabric item?",
      a: "This depends on the type of fabric and repair: We're normally unable to repair items with leather or heavy fabric, unless the item can be hand-sewn. We can try small alterations like hems and waistband adjustments — please come with your item pre-pinned and marked. We can't provide precise tailoring, but we're happy to refer you to a local business. Please ensure all items are laundered and free of pet hair!"
    },
    {
      q: "What should I bring to Repair Café?",
      a: "For electrical/electronic items, please bring the power cord and/or batteries so we can check the problem and test the repair. For items needing parts replaced, please bring those parts yourself — our fixers volunteer their time and tools but aren't responsible for supplying replacement parts (like phone screens, switches, lightbulbs, buttons, inner tubes, etc.)."
    },
    {
      q: "Will I be seen as soon as I check in?",
      a: "Based on our experience, you might be seen right away if you come near the beginning — but more likely than not, you'll have to wait. We can't estimate wait times because we don't know how long repairs will take. We recommend coming early (before 6 PM) to minimize wait time. Please be patient — we're all volunteers trying to make a difference!"
    }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h1>
      
      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{faq.q}</h2>
            <p className="text-gray-600 whitespace-pre-line">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
        <h3 className="font-semibold text-green-900 mb-2">Have another question?</h3>
        <p className="text-green-800 mb-4">
          Email us at <a href="mailto:info@reimagineinstitute.ca" className="underline">info@reimagineinstitute.ca</a>
        </p>
        <Link href="/events" className="text-green-600 hover:text-green-700 font-medium">
          ← View Upcoming Events
        </Link>
      </div>
    </div>
  );
}
