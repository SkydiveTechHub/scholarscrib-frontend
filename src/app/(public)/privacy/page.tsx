import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";

// DRAFT — written against the Nigeria Data Protection Act 2023 (NDPA) and the
// NDPC General Application and Implementation Directive 2025 (GAID). Not yet
// reviewed by a lawyer. Before publishing:
//   1. Fill the [BRACKETED] placeholders (registered name, address, DPO).
//   2. Confirm the processor list matches what is switched on in production.
//   3. Register with the NDPC as a data controller/processor of major
//      importance if you meet the threshold, and file the annual compliance
//      audit return (CAR) if it applies.

const TITLE = "Privacy Policy — ScholarsCrib";
const DESCRIPTION =
  "How ScholarsCrib collects, uses and protects your personal data under the Nigeria Data Protection Act 2023, and the rights you have.";

export const metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/privacy",
});

const linkClass = "font-semibold text-primary hover:underline";

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. Who we are",
    body: (
      <>
        <p>
          ScholarsCrib is an online learning service that helps Nigerian
          students prepare for school and exams such as WAEC, NECO and JAMB.
          In this policy, “we”, “us” and “ScholarsCrib” means [REGISTERED
          COMPANY NAME], of [REGISTERED ADDRESS], Nigeria.
        </p>
        <p>
          We are the <strong>data controller</strong> for the personal data
          described here. This policy follows the Nigeria Data Protection Act
          2023 (the “NDPA”) and the directives of the Nigeria Data Protection
          Commission (the “NDPC”).
        </p>
        <p>
          Our Data Protection Officer can be reached at{" "}
          <a href="mailto:privacy@scholarscrib.com" className={linkClass}>
            privacy@scholarscrib.com
          </a>{" "}
          (DPO: [NAME OF DPO]).
        </p>
      </>
    ),
  },
  {
    heading: "2. The personal data we collect",
    body: (
      <>
        <p>
          <strong>You give us:</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Account details: first and last name, email address, phone number,
            and a password (we store only a hashed version, never the password
            itself).
          </li>
          <li>
            Profile details: class level, exam track, state, school, and an
            optional profile picture.
          </li>
          <li>
            Messages you send to our AI tutor and details you send us when you
            contact support.
          </li>
        </ul>
        <p>
          <strong>Created as you learn:</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Answers to practice questions, scores, weak areas, flashcard
            reviews, study plans, streaks, points and achievements.
          </li>
          <li>Lessons and materials you open, and notes you make.</li>
        </ul>
        <p>
          <strong>Collected automatically:</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Device and sign-in information: a device label, the time you were
            last active, IP address, browser type, and session records used to
            enforce the device limit in our terms.
          </li>
          <li>
            A push-notification subscription, only if you turn notifications
            on.
          </li>
        </ul>
        <p>
          <strong>From third parties:</strong> if you sign in with Google, we
          receive your name, email address and profile picture from Google.
          When you pay, Paystack tells us whether the payment succeeded. We do
          not see or store your card or bank details.
        </p>
        <p>
          We do not intentionally collect “sensitive personal data” as the NDPA
          defines it (for example health, religion, ethnic origin or biometric
          data). Please do not put it in tutor messages or support requests.
        </p>
      </>
    ),
  },
  {
    heading: "3. Why we use your data, and our legal basis",
    body: (
      <>
        <p>The NDPA requires a lawful basis for each use of personal data. Ours are:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Contract</strong> — to create your account, sign you in,
            deliver lessons, practice and study plans, and process payments for
            paid plans.
          </li>
          <li>
            <strong>Consent</strong> — for optional things such as push
            notifications, marketing messages, and any use of a child’s data
            where a parent or guardian’s consent is needed. You can withdraw
            consent at any time (see section 9).
          </li>
          <li>
            <strong>Legitimate interests</strong> — to keep the service secure,
            prevent account sharing and abuse, fix bugs, and understand and
            improve how ScholarsCrib is used, where this does not override your
            rights and freedoms.
          </li>
          <li>
            <strong>Legal obligation</strong> — to keep financial records and
            respond to lawful requests from Nigerian authorities.
          </li>
        </ul>
        <p>
          We use your learning data to personalise what you see, such as which
          questions come next and when topics are due for review. This
          personalisation does not make decisions with legal or similarly
          significant effects on you.
        </p>
        <p>We do not sell your personal data.</p>
      </>
    ),
  },
  {
    heading: "4. Children and students under 18",
    body: (
      <>
        <p>
          Many of our students are under 18. Under the NDPA, we need the
          consent of a parent or legal guardian to process a child’s personal
          data, and we must take reasonable steps to verify that consent.
        </p>
        <p>
          If you are under 18, please ask a parent or guardian to read this
          policy and approve your account. We record that approval when you
          register. We may ask for further confirmation, and may suspend an
          account if we cannot confirm it.
        </p>
        <p>
          We do not use children’s data for advertising or profiling for
          marketing. We collect only what we need to teach them. A parent or
          guardian can ask to see, correct or delete their child’s data at any
          time using the contact details in section 12.
        </p>
      </>
    ),
  },
  {
    heading: "5. Who we share data with",
    body: (
      <>
        <p>
          We share personal data only with service providers (“processors”)
          who handle it on our instructions under written agreements, and only
          as needed for the purpose:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Paystack — payment processing.</li>
          <li>Google — optional “Sign in with Google”.</li>
          <li>Cloudinary — storing profile pictures and study images.</li>
          <li>
            Cloud hosting and database providers — running the app and storing
            data.
          </li>
          <li>
            Upstash — rate limiting and caching to protect the service.
          </li>
          <li>
            AI and search providers — to power the AI tutor. Your tutor
            messages and the study context needed to answer them are sent to
            language-model providers (such as OpenAI, Anthropic or Google),
            and to our vector-search and monitoring services. We do not send
            your name, email or phone number for this purpose.
          </li>
          <li>
            Messaging providers — to send emails, SMS and push notifications.
          </li>
        </ul>
        <p>
          We may also disclose data where the law requires it, to protect
          someone’s safety, or in a sale or restructuring of our business (in
          which case this policy will continue to protect your data).
        </p>
      </>
    ),
  },
  {
    heading: "6. Sending data outside Nigeria",
    body: (
      <p>
        Some of our providers store or process data outside Nigeria. We
        transfer personal data abroad only where the NDPA allows it: where the
        destination is covered by an adequacy decision from the NDPC, or where
        we have appropriate safeguards in place (such as standard contractual
        clauses), or another lawful ground under the NDPA applies. You can ask
        us for details of the safeguards for a particular transfer.
      </p>
    ),
  },
  {
    heading: "7. How long we keep data",
    body: (
      <>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Account and learning data: while your account is open, and for up
            to [12] months after it closes, so you can come back, then deleted
            or anonymised.
          </li>
          <li>
            Payment records: [6] years, to meet tax and accounting
            obligations.
          </li>
          <li>AI tutor conversations: [12] months, or until you delete them.</li>
          <li>
            Security and sign-in logs: up to [12] months.
          </li>
          <li>Support requests: [24] months after they are resolved.</li>
        </ul>
        <p>
          We may keep anonymised data that can no longer identify you, for
          example to measure how well lessons work.
        </p>
      </>
    ),
  },
  {
    heading: "8. How we protect your data",
    body: (
      <>
        <p>
          We use encryption in transit, hashed passwords, access controls that
          limit staff to what they need, separate admin authentication, rate
          limiting, and regular backups. No online service is perfectly secure,
          so please also keep your password private.
        </p>
        <p>
          If a breach is likely to put your rights and freedoms at risk, we
          will notify the NDPC within 72 hours of becoming aware of it. If it
          is likely to cause you a high risk of harm, we will tell you
          directly and without undue delay, explaining what happened and what
          you can do.
        </p>
      </>
    ),
  },
  {
    heading: "9. Your rights",
    body: (
      <>
        <p>Under the NDPA you have the right to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>be informed about how we use your data (this policy);</li>
          <li>access the personal data we hold about you and get a copy;</li>
          <li>have inaccurate or incomplete data corrected;</li>
          <li>
            have your data erased where we no longer need it or you withdraw
            consent;
          </li>
          <li>restrict how we use your data in certain cases;</li>
          <li>
            receive your data in a structured, commonly used, machine-readable
            format and have it sent to another controller (portability);
          </li>
          <li>
            object to processing based on legitimate interests, and to direct
            marketing at any time;
          </li>
          <li>
            not be subject to a decision based solely on automated processing
            that has legal or similarly significant effects on you, and ask for
            a person to review such a decision;
          </li>
          <li>
            withdraw consent at any time. This does not affect processing done
            before you withdrew it.
          </li>
        </ul>
        <p>
          To use any of these rights, email{" "}
          <a href="mailto:privacy@scholarscrib.com" className={linkClass}>
            privacy@scholarscrib.com
          </a>
          . We may need to confirm who you are first. We will respond within
          one month. We do not charge a fee unless a request is clearly
          unfounded or excessive. You can change most profile details and
          notification settings yourself in{" "}
          <Link href="/settings" className={linkClass}>
            Settings
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    heading: "10. Cookies and similar technologies",
    body: (
      <>
        <p>
          We use cookies and local storage that are strictly necessary to keep
          you signed in, protect your account and remember your preferences.
          If we add analytics or advertising cookies, we will ask for your
          consent first.
        </p>
        <p>
          ScholarsCrib can be installed as an app on your device and can work
          offline. It stores some lessons and settings on your device for
          this. You can clear this in your browser settings.
        </p>
      </>
    ),
  },
  {
    heading: "11. Complaints",
    body: (
      <p>
        We would like the chance to fix any concern first, so please contact
        us. You also have the right to lodge a complaint with the Nigeria Data
        Protection Commission at{" "}
        <a
          href="https://ndpc.gov.ng"
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          ndpc.gov.ng
        </a>
        , and to seek a judicial remedy.
      </p>
    ),
  },
  {
    heading: "12. Changes and contact",
    body: (
      <>
        <p>
          We may update this policy. When we make an important change we will
          tell you in the app or by email before it takes effect, and will ask
          for your consent again where the law requires it.
        </p>
        <p>
          Questions about this policy or your data? Email{" "}
          <a href="mailto:privacy@scholarscrib.com" className={linkClass}>
            privacy@scholarscrib.com
          </a>{" "}
          or{" "}
          <Link href="/contact" className={linkClass}>
            contact us
          </Link>
          .
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated 28 October 2026</p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-foreground">{section.heading}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-foreground/85">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
