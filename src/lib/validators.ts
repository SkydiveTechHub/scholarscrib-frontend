import { z } from "zod";

import { checkQuestionInvariants } from "@/lib/admin-question";

// ─── Questions (Admin) ────────────────────────────

// Id-based, unlike bulkImportQuestionSchema below, which is code/slug-based:
// the admin form works from populated selects, an import file from human-typed
// subject codes.
//
// The field list is declared once, as a plain shape object, and both the
// create and update schemas are built from it. zod 4 does not expose
// `.innerType()` on the value returned by `.superRefine(...)` (verified
// empirically — calling it throws "innerType is not a function"), so the
// create schema cannot be unwrapped back into an object schema for `.partial()`
// the way zod 3 code sometimes does. Sharing `adminQuestionShape` avoids that
// entirely and keeps the field list single-sourced.
//
// The four fields below carry a `.default(...)` on the CREATE side only —
// deliberately not baked into the shared shape. Empirically, zod 4's
// `.partial()` still applies a field's `.default()` when the key is absent
// (unlike the zod 3 behaviour the brief assumed), so an update schema built
// from a shape with defaults baked in would silently populate `{}` into a
// 4-key object and the "at least one field" refine below would never fire.
// Keeping the base constraint declared once in the shape and layering
// `.default(...)` on top only when assembling the create schema keeps the
// field list single-sourced while giving create and update the semantics
// each actually needs.
const adminQuestionShape = {
  subjectId: z.string().min(1, "Choose a subject."),
  topicId: z.string().min(1).nullish(),
  examType: z.enum(["WAEC", "JAMB", "NECO", "CUSTOM"]),
  examYear: z.number().int().min(1990).max(2030).nullish(),
  questionNumber: z.number().int().min(1).nullish(),
  questionText: z.string().min(5, "The question text is too short."),
  questionImageUrl: z.string().url().nullish(),
  questionType: z.enum(["OBJECTIVE", "THEORY", "FILL_IN_BLANK"]),
  options: z.record(z.string(), z.string()).nullish(),
  correctAnswer: z.string().min(1, "A correct answer is required."),
  explanation: z.string().min(5, "An explanation is required."),
  explanationImageUrl: z.string().url().nullish(),
  difficulty: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]),
  marks: z.number().int().min(1),
  timeEstimateSeconds: z.number().int().min(10),
};

export const adminQuestionCreateSchema = z
  .object({
    ...adminQuestionShape,
    questionType: adminQuestionShape.questionType.default("OBJECTIVE"),
    difficulty: adminQuestionShape.difficulty.default("INTERMEDIATE"),
    marks: adminQuestionShape.marks.default(1),
    timeEstimateSeconds: adminQuestionShape.timeEstimateSeconds.default(90),
  })
  .superRefine((value, ctx) => {
    for (const issue of checkQuestionInvariants({
      questionType: value.questionType,
      options: value.options ?? null,
      correctAnswer: value.correctAnswer,
    })) {
      ctx.addIssue({
        code: "custom",
        path: [issue.field],
        message: issue.message,
      });
    }
  });

// The update path re-checks invariants inside the route rather than in the
// schema, because a partial update may change `options` without resending
// `correctAnswer`; the route merges the stored row with the patch before
// checking (Task 6).
export const adminQuestionUpdateSchema = z
  .object(adminQuestionShape)
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field to update.",
  );

// ─── Bulk Import (Admin) ─────────────────────────

export const bulkImportQuestionSchema = z.object({
  subjectCode: z.string().min(2),
  topicSlug: z.string().optional(),
  examType: z.enum(["WAEC", "JAMB", "NECO", "CUSTOM"]),
  examYear: z.number().int().min(1990).max(2030).optional(),
  questionNumber: z.number().int().optional(),
  questionText: z.string().min(5),
  questionImageUrl: z.string().url().optional(),
  questionType: z.enum(["OBJECTIVE", "THEORY", "FILL_IN_BLANK"]).default("OBJECTIVE"),
  options: z
    .record(z.string(), z.string())
    .refine((opts) => Object.keys(opts).length >= 4, "At least 4 options required")
    .optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(5),
  explanationImageUrl: z.string().url().optional(),
  difficulty: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]).default("INTERMEDIATE"),
  marks: z.number().int().min(1).default(1),
  timeEstimateSeconds: z.number().int().min(10).default(90),
});

