/** FAQ content - verbatim from the official "Frequently Asked Questions" document. */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Bookings & Requests',
    items: [
      {
        q: 'How do I book a technician on Addis Tiggena?',
        a: 'Simply open Addis Tiggena, select the repair service you need (e.g., Mitad repair, plumbing, electrical), enter your location, and request a technician. The platform dispatches the nearest verified local technician directly to your location. You can also call our customer service line and we will connect you with the nearest technician.',
      },
      {
        q: 'How quickly will a technician arrive after I place a request?',
        a: 'Arrival times vary with the distance between your location and the available technician, but because we match you with technicians operating in your surroundings, average arrival times range between 15 to 30 minutes.',
      },
      {
        q: 'What if the maintenance process needs specialized spare parts?',
        a: 'The technician will inspect the issue first and inform you of any necessary spare parts. We recommend customers purchase the parts themselves with specifications from the technician.',
      },
    ],
  },
  {
    title: 'Payments & Pricing',
    items: [
      {
        q: 'How is the price calculated for a service?',
        a: 'Addis Tiggena uses standard, transparent baseline rates depending on the repair type. You will see an estimated base price before confirming your booking.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We support seamless digital payments including mobile money services (such as Telebirr, CBE Birr, and local bank mobile apps or mobile banking transfers) as well as cash payments upon job completion.',
      },
      {
        q: 'Do I pay the technician directly or through the platform?',
        a: 'Addis Tiggena is designed exclusively as a platform to connect technicians and clients, so all payments are made directly to the technician using any agreed-upon payment method (cash, Telebirr, CBE Birr, or mobile banking). Service prices must strictly follow the standard price ranges set on the platform to ensure fair, transparent pricing.',
      },
    ],
  },
  {
    title: 'Cancellations & Rescheduling',
    items: [
      {
        q: 'Can I cancel a booking after placing a request?',
        a: 'Yes. You can cancel your request free of charge at any point before the technician accepts the job or begins traveling to your location.',
      },
      {
        q: 'What happens if I cancel after the technician is already on their way?',
        a: 'If you cancel while the technician is en route to your premises, a nominal dispatch/cancellation fee may apply to compensate the technician for their travel and time.',
      },
      {
        q: 'What if the technician cancels or fails to show up?',
        a: 'In the rare event a technician cannot make it due to an emergency, the Addis Tiggena platform will automatically reassign your request to the next available verified technician in your surroundings at no extra cost.',
      },
    ],
  },
  {
    title: 'Guarantees, Safety & Quality',
    items: [
      {
        q: "Are the services guaranteed? What if the issue isn't fixed properly?",
        a: 'Yes! We offer a 5-Day Service Guarantee on repairs. If the exact issue reoccurs within 5 days of completion, you can call the technician again to re-inspect and fix it at no additional service cost. If the technician is not responsive, call Addis Tiggena and it will be handled.',
      },
      {
        q: 'How do I know the technician entering my house is safe and qualified?',
        a: 'Every single technician on Addis Tiggena must present an official recommendation letter from their residential Woreda, pass practical government CoC skill evaluations, and provide official ID verification (Fayda/Resident ID) before being listed on the platform.',
      },
      {
        q: 'What should I do if a technician overcharges me or acts unprofessionally?',
        a: 'You can report any issue directly in the app or call our customer support helpline. Technicians who fail to adhere to our strict professional ethics code face immediate review and suspension from the platform.',
      },
    ],
  },
];
