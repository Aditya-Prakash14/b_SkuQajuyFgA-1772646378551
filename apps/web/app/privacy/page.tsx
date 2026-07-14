import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy | MyPrimeCompany',
  description: 'How MyPrimeCompany collects, uses and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="8 July 2026"
      intro="How we collect, use and protect the information you share with us."
      sections={[
        {
          heading: '1. Information we collect',
          paras: [
            'When you book a service we collect your name, mobile number, service address, city and preferred date. If you sign in with Google we also receive your name and email address from your Google account.',
            'We do not collect or store payment card details on our servers. Payments, where applicable, are handled at the point of service or through a third-party processor.',
          ],
        },
        {
          heading: '2. How we use your information',
          paras: [
            'Your details are used solely to schedule, deliver and follow up on the service you booked, to assign a verified field partner, and to raise an invoice.',
            'We may contact you by phone, WhatsApp or email regarding your booking. We do not sell your data to third parties.',
          ],
        },
        {
          heading: '3. Location data',
          paras: [
            'If you choose to use the "detect my location" feature, your browser shares your approximate coordinates with the site. We use this only to select the nearest city we serve. The coordinates are processed in your browser and are not stored on our servers.',
            'You can decline location permission at any time and select your city manually instead.',
          ],
        },
        {
          heading: '4. Sharing with field partners',
          paras: [
            'To deliver your service, we share your name, phone number, address and the scheduled slot with the assigned partner. Partners are contractually bound to use this information only to perform the service.',
          ],
        },
        {
          heading: '5. Data retention & security',
          paras: [
            'Booking records are retained for accounting and warranty purposes. Access to customer data is restricted to authorised staff and protected by row-level security controls in our systems.',
          ],
        },
        {
          heading: '6. Your rights',
          paras: [
            'You may request a copy of the personal data we hold about you, or ask us to correct or delete it, by emailing info@primehomecare.in. We will respond within 30 days.',
          ],
        },
      ]}
    />
  )
}
