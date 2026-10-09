/**
 * Shared so the rendered accordion and the FAQPage structured data cannot
 * drift. Marking up copy that is not on the page is a rich-result violation.
 */
export const FAQS = [
  {
    question: "Which exams does ScholarsCrib cover?",
    answer:
      "ScholarsCrib is built for WAEC (WASSCE), JAMB UTME and NECO candidates. Content follows the national curriculum from SS1 to SS3, and mock exams run under CBT conditions like JAMB's.",
  },
  {
    question: "What does it cost?",
    answer:
      "The Free plan costs nothing to start. Basic adds flashcards and the study planner, and Premium adds the full library and subject-level analytics. Current prices are on the pricing section of this page.",
  },
  {
    question: "Can I study offline?",
    answer:
      "Not yet. ScholarsCrib needs an internet connection to load lessons and questions. It runs in your phone's browser, so there is no app to download.",
  },
  {
    question: "Is there a teacher or school account?",
    answer:
      "Not yet. ScholarsCrib is for individual students at the moment. Teacher and school accounts are planned but not available, and the Contact page is the place to reach us about schools.",
  },
  {
    question: "How is ScholarsCrib different from just reading?",
    answer:
      "Reading tells you what to know; practice shows you what you actually know. ScholarsCrib pairs short lessons with past questions, timed mock exams, flashcards and progress tracking so you can see your next best step.",
  },
] as const;
