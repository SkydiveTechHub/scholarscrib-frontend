// JAMB UTME CBT simulation — the official paper structure.
//
// A candidate sits four subjects in one 2-hour session: English Language is
// compulsory, plus three of their choosing. English carries 60 questions and
// each other subject 40, for 180 in total. Every subject is scored out of 100
// regardless of how many questions it has, giving a mark out of 400.
//
// The backend grades the paper; the picker and session screens use this spec
// for their copy and limits.

export const JAMB_SPEC = {
  /** Subject code of the compulsory paper. */
  englishCode: "ENG",
  englishQuestions: 60,
  otherQuestions: 40,
  /** English + three chosen subjects. */
  subjectCount: 4,
  otherSubjectCount: 3,
  totalQuestions: 180,
  durationMinutes: 120,
  marksPerSubject: 100,
  totalMarks: 400,
} as const;
