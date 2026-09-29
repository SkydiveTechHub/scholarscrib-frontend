/**
 * Shared so the rendered accordion and the FAQPage structured data cannot
 * drift. Marking up copy that is not on the page is a rich-result violation.
 */
import { formatNaira, planFor, type SubscriptionTier } from "@/lib/subscription";

const price = (tier: SubscriptionTier, period: "MONTHLY" | "YEARLY") =>
  formatNaira(planFor(tier, period).amountKobo);

export const FAQS = [
  {
    question: "Is ScholarsCrib only for students writing WAEC, JAMB or NECO?",
    answer:
      "No. ScholarsCrib is for every senior-secondary student — SS1, SS2 and SS3 — and for anyone resitting WASSCE or GCE. Lessons follow your class curriculum term by term, so the work you do in SS1 counts. When exam season comes, you are revising, not cramming.",
  },
  {
    question: "Which exams does ScholarsCrib prepare me for?",
    answer:
      "WAEC (WASSCE), JAMB UTME and NECO SSCE. You get past questions by year, mock exams scored on the real A1–F9 and JAMB scales, and a full 180-question, 120-minute JAMB CBT simulation that mirrors the official interface.",
  },
  {
    question: "How does ScholarsCrib know what I actually remember?",
    answer:
      "Every answer, lesson checkpoint and flashcard review is recorded. Your mastery of a topic fades if you don't revisit it, so a topic you aced three months ago will show as fading until you practise it again. That's how forgetting gets caught before it costs you marks.",
  },
  {
    question: "Is there an AI tutor or video lessons?",
    answer:
      "Not yet. Both are on our roadmap: video lessons alongside each topic's notes, and an AI study assistant you can ask questions while you learn. Today, every topic has written notes with worked examples, and every past question comes with a full explanation.",
  },
  {
    question: "Can teachers or schools use ScholarsCrib?",
    answer:
      "Not yet — ScholarsCrib is currently for individual students. Teacher and school portals, where teachers create lesson notes and tests and schools run term exams on CBT, are part of what we're building next.",
  },
  {
    question: "What does it cost, and can I cancel?",
    answer:
      `The Free plan is free forever with no card required. Basic is ${price("STANDARD", "MONTHLY")} a month or ${price("STANDARD", "YEARLY")} a year and unlocks every subject, flashcards and the study planner. Premium is ${price("PREMIUM", "MONTHLY")} a month or ${price("PREMIUM", "YEARLY")} a year and adds subject-by-subject analytics and the premium library. There are no contracts — cancel anytime.`,
  },
  {
    question: "I have limited data. Can I still use it?",
    answer:
      "Yes. ScholarsCrib runs in the browser on the phones students actually use and is built to load quickly on slower connections. A full offline mode is not available yet.",
  },
  {
    question: "Is ScholarsCrib affiliated with WAEC, JAMB or NECO?",
    answer:
      "No. ScholarsCrib is an independent learning and practice platform. We model our mock exams on the official formats and grading scales, but we are not affiliated with any examination body.",
  },
] as const;
