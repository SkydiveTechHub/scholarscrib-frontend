import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";

// DRAFT — plain-language terms written by the product team. Not yet reviewed
// by a lawyer; have it reviewed before relying on it in a dispute. Before
// publishing: confirm the business choices made here (minimum age 13, manual
// renewal, 7-day refund review, Ogun State
// courts) and that "ScholarsCrib" is the registered company name.

const TITLE = "Terms of Service — ScholarsCrib";
const DESCRIPTION =
  "The terms for using ScholarsCrib, including one account per student.";

export const metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/terms",
});

const linkClass = "font-semibold text-primary hover:underline";

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. About these terms",
    body: (
      <>
        <p>
          These terms apply when you create a ScholarsCrib account or use
          ScholarsCrib. ScholarsCrib is run by ScholarsCrib, of 10b Falola Close,
          Oke-Yidi, Abeokuta, Ogun State, Nigeria (“we”, “us”). By creating an account
          you agree to them.
        </p>
        <p>
          How we handle your personal data is explained in our{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          , which forms part of these terms.
        </p>
      </>
    ),
  },
  {
    heading: "2. Who can use ScholarsCrib",
    body: (
      <>
        <p>
          You must be at least 13 years old to create an account. If
          you are under 18, a parent or legal guardian must agree to these terms
          and to our Privacy Policy on your behalf, and should read them with
          you. We may ask for proof of that consent.
        </p>
        <p>
          The details you give us when you sign up must be true and kept up to
          date.
        </p>
      </>
    ),
  },
  {
    heading: "3. One account per student",
    body: (
      <>
        <p>
          Each ScholarsCrib account belongs to one student. Your study plan,
          weak areas, unseen questions and progress are built from your own
          answers, so an account shared between students stops working
          properly for all of them.
        </p>
        <p>
          You must not share your login details or let another student use
          your account. You are responsible for keeping your password private
          and for activity on your account.
        </p>
      </>
    ),
  },
  {
    heading: "4. Devices",
    body: (
      <p>
        There is no device limit on the free plan. A paid plan can be signed
        in on up to two devices at a time. Signing in on a third device signs
        out the one that signed in earliest.
      </p>
    ),
  },
  {
    heading: "5. When we may act on an account",
    body: (
      <p>
        If an account appears to be used by more than one person, or is used
        in a way that breaks these terms, we may sign out its devices, ask
        the owner to change their password, or suspend the account. Unless the
        law or security stops us, we will tell you what happened and how to
        contact us.
      </p>
    ),
  },
  {
    heading: "6. Paid plans and payments",
    body: (
      <>
        <p>
          Payments are processed by Paystack. The price, length and features of
          each plan are shown before you pay. A plan gives access to its
          features for the period you paid for, and is for the account holder
          only.
        </p>
        <p>
          Plans do not renew automatically. When your paid period ends, your
          account returns to the free plan until you choose to pay again, and
          we will not charge you without you starting a payment.
        </p>
        <p>
          If something went wrong with a payment, or you paid by mistake,
          contact us within 7 days of paying and we will review a refund. We
          may decline a refund where the plan has been substantially used. Where
          the law gives you a right to a refund, that right is not affected.
          Approved refunds go back to the original payment method.
        </p>
        <p>
          If a payment goes through but your plan is not activated, contact us
          and we will fix it.
        </p>
      </>
    ),
  },
  {
    heading: "7. The AI tutor",
    body: (
      <>
        <p>
          ScholarsCrib includes an AI tutor that answers study questions. It is
          a study aid, not a teacher or an examiner. Its answers can be wrong
          or out of date, so check important facts against your textbook, your
          teacher and the official exam syllabus.
        </p>
        <p>
          We do not promise any particular exam result from using the tutor or
          any other part of ScholarsCrib.
        </p>
        <p>
          Your tutor conversations are stored and handled as described in our{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          . Do not put sensitive personal information about yourself or anyone
          else in them.
        </p>
      </>
    ),
  },
  {
    heading: "8. Points, streaks and achievements",
    body: (
      <p>
        Points, streaks and achievements are there to make studying more
        motivating. They have no cash value and cannot be sold or transferred.
        If we find they were earned by cheating or by getting around the
        service, we may remove them.
      </p>
    ),
  },
  {
    heading: "9. Using ScholarsCrib fairly",
    body: (
      <p>
        Do not copy or resell questions, lessons or other content, try to get
        around limits or security, or interfere with the service for other
        students.
      </p>
    ),
  },
  {
    heading: "10. Our content",
    body: (
      <p>
        The questions, lessons, designs and software on ScholarsCrib belong to
        us or our licensors. You may use them for your own study while your
        account is active. Notes and other material you create stay yours, and
        you let us store and display them to you so the service can work.
      </p>
    ),
  },
  {
    heading: "11. Closing your account",
    body: (
      <>
        <p>
          You can stop using ScholarsCrib at any time and ask us to close your
          account and delete your data by contacting us. We handle that request
          as described in our{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          Closing an account ends access to any paid time left on it. Refunds
          follow section 6. We may also close
          an account that seriously or repeatedly breaks these terms.
        </p>
      </>
    ),
  },
  {
    heading: "12. Availability and our responsibility",
    body: (
      <>
        <p>
          We work to keep ScholarsCrib available and accurate, but we cannot
          promise it will always be uninterrupted or free of mistakes. We may
          change or remove features from time to time.
        </p>
        <p>
          To the extent the law allows, we are not responsible for losses that
          were not reasonably foreseeable, or for results you get in exams.
          Nothing in these terms limits any right you have under Nigerian law
          that cannot be limited.
        </p>
      </>
    ),
  },
  {
    heading: "13. Governing law",
    body: (
      <p>
        These terms are governed by the laws of the Federal Republic of
        Nigeria. If you have a complaint, please contact us first so we can try to
        sort it out. If we cannot, disputes will be heard by the courts of Ogun
        State, Nigeria.
      </p>
    ),
  },
  {
    heading: "14. Changes to these terms",
    body: (
      <p>
        We may update these terms. When we make an important change we will
        let you know in the app before it takes effect. If you keep using
        ScholarsCrib after that, you accept the new terms.
      </p>
    ),
  },
  {
    heading: "15. Contact",
    body: (
      <p>
        Questions about these terms?{" "}
        <Link href="/contact" className={linkClass}>
          Contact us
        </Link>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Terms of Service
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
