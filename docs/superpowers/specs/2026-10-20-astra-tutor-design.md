# Astra — AI tutor: interface design and BE contract

Status: draft for review · 2026-10-20

## 1. Purpose and scope

Astra is a Premium-gated study tutor inside ScholarsCrib. It explains lessons
and questions step by step, grounded in the curriculum, and nudges students to
think rather than copy answers.

The FE defines the interface and the request/response contract; the BE owns the
model, prompts, grounding, safety, tier gating and rate limits.

**Out of scope for v1:** global history screen, paragraph-level "Explain this"
selection, voice, image upload, offline use.

## 2. Audience and design principles

Nigerian secondary students (~13–19, JSS3–SS3) preparing for WAEC, NECO, JAMB.
Mostly mid-range Android, metered and patchy data, exam pressure.

| Fact | Decision |
|---|---|
| Phone first, one thumb | Bottom sheet on mobile, composer above keyboard, targets ≥ 44px |
| Costly, flaky data | Streamed replies, draft kept on failure with one-tap retry, panel code lazy-loaded |
| Anxious, fear of looking "dumb" | Warm tone, starter chips (never a blank box), no "wrong" state |
| Teens read little | Short answers, numbered steps, bold key idea, KaTeX for maths |
| Learning, not cheating | Hint ladder on unanswered questions |
| Older/shared devices | Minimal motion, `prefers-reduced-motion` respected, light + dark |

Persona: **Astra**, a friendly study buddy. Avatar is a small star glyph, not a
robot. Subline reads "Your study buddy", never "AI assistant".

## 3. Surfaces

One component, three entry points.

- **Mobile:** bottom sheet, 75% height, expandable to full. Focus-trapped dialog.
- **Desktop:** docked right panel (~400px); page content reflows rather than
  being covered.

Entry points:
1. **Lesson** — persistent "Ask Astra" pill (above mobile nav) and the existing
   exit-card link. Context: the lesson.
2. **Practice / past paper** — "Explain this" on result and review screens.
   Context: the question, plus the student's attempt when one exists.
3. **Global** — "Astra" item in sidebar and mobile nav. Context: general
   (scoped to the student's subjects).

Free-tier users see a locked panel (one canned sample reply + upgrade card),
not a hidden button.

## 4. Panel anatomy

```
┌────────────────────────────────┐
│ ✦ Astra                  ⤢  ✕  │
│ Your study buddy               │
├────────────────────────────────┤
│ [📘 Photosynthesis · Biology ✕]│  context chip (detachable)
│ ✦ Hi! Stuck on something…      │
│ [Explain simply] [Give example]│  starter chips
│ [Test me] [Why does it matter] │
│            student bubble ───▶ │
│ ✦ streamed reply (Markdown+KaTeX)
│   [👍] [👎] [Explain differently]
│ ✦ ● ● ●                        │
├────────────────────────────────┤
│ [ Ask Astra anything…     ] ➤  │  1–4 lines, 500 char cap
│ Astra can make mistakes.       │
└────────────────────────────────┘
```

- **Starter chips are context-aware** and disappear after the first message.
  - Lesson: Explain simply · Give an example · Test me · Why does this matter?
  - After a wrong answer: Why was I wrong? · Show me the steps · Give me a similar one
  - General: Help me study · Explain a topic · Quiz me
- **Hint ladder:** on an unanswered question Astra offers Hint 1 → Hint 2 →
  Walk me through it, each as a button. The full answer appears only after the
  student submits or explicitly chooses it. After an attempt, Astra explains
  freely.
- **"Explain differently"** re-asks from a simpler or more visual angle, so the
  student never has to type "I don't understand".
- **Tone:** short, plain, encouraging, not childish; Nigerian-context examples
  where natural; at most one emoji.
- **Rendering:** reuse the lesson Markdown and KaTeX renderers
  (`components/lesson/markdown.tsx`, `components/ui/rich-text.tsx`).
  No raw HTML.
- **Accessibility:** labelled dialog on mobile, Esc closes, `aria-live="polite"`
  announcing each reply once rather than per token.

### States

| State | Behaviour |
|---|---|
| Empty | Greeting + chips |
| Streaming | Typing dots → text; Stop replaces Send |
| Error / offline | Inline "Couldn't reach Astra. Try again"; draft kept |
| Rate limited | "You've used today's questions. Resets at midnight" + count |
| Locked (free) | Canned sample reply + upgrade card |
| Off-topic / unsafe | Gentle in-thread redirect, not an error banner |

## 5. FE ↔ BE contract

All routes under `/student/tutor`, bearer-authenticated like the rest of the
student API. Errors use the existing `ApiError` body shape.

### Context

The FE sends references, never content. The BE loads the lesson or question
itself, so payloads stay small and students cannot inject fake lesson text.

```ts
type TutorContext =
  | { type: "lesson";   lessonId: string }
  | { type: "question"; questionId: string; attemptId?: string }
  | { type: "topic";    subjectSlug: string; topicSlug: string }
  | { type: "general" };
```

"Answered" is derived by the BE from `attemptId`; the client never asserts it.

### Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /student/tutor/status` | `{ allowed, tier, remainingToday, resetsAt, reason? }`. Called on panel open; drives locked / rate-limited states. |
| `GET /student/tutor/threads/current?type=…&id=…` | Resume the thread for this context or return an empty one; last N messages + `threadId`. |
| `POST /student/tutor/threads/{threadId}/messages` | Send a message; streamed reply. |
| `POST /student/tutor/messages/{messageId}/feedback` | `{ rating: "up" \| "down", reason? }` |
| `DELETE /student/tutor/threads/{threadId}` | Clear this chat. |

Threads are keyed `(student, context)`. No global history list in v1.

### Send request

```json
{
  "text": "What is chlorophyll for?",
  "action": null,
  "context": { "type": "lesson", "lessonId": "…" },
  "clientMessageId": "uuid"
}
```

- `action`: `null | "explain_simply" | "example" | "test_me" | "hint_next" | "reveal" | "explain_differently"`.
  Chips and buttons send an action so the BE need not infer intent from label text.
- `text` max 500 characters, enforced on both sides.
- `clientMessageId` makes retries idempotent: a resend after a dropped
  connection must not consume daily quota twice.

### Streaming response

SSE over POST, read in the browser with `fetch` + `ReadableStream`
(axios cannot stream in the browser; same bearer token).

```
event: start    data: {"messageId":"…","remainingToday":7}
event: delta    data: {"text":"Chlorophyll is the "}      (repeated)
event: suggest  data: {"actions":["example","test_me"]}   (optional)
event: done     data: {"messageId":"…","usage":{…}}
event: error    data: {"code":"RATE_LIMITED","message":"…","resetsAt":"…"}
```

Replies are Markdown with KaTeX (`$…$`).

### Error codes the UI handles

`TIER_REQUIRED` (402/403) · `RATE_LIMITED` (429, with `resetsAt`) ·
`UNAVAILABLE` (503, retryable) · `CONTEXT_NOT_FOUND` (404).
Off-topic is delivered as a normal assistant message, not an error.

## 6. Decisions

1. **Gating:** add `aiTutor` to `GATED_FEATURES` in `lib/subscription.ts`,
   `PAID_ENTITLEMENTS.aiTutor = "PREMIUM"`, mirrored in the BE `domain.py`.
2. **Free-tier taste:** canned FE sample reply; no model cost.
3. **Grounding:** BE restricts answers to ScholarsCrib content and the
   curriculum. FE copy may say Astra answers from the student's lessons.
4. **Persistence:** per-context threads persist; no global history in v1.
5. **Daily limit:** decided by the BE per plan; the FE only displays
   `remainingToday` / `resetsAt`.

## 7. Related cleanup

The PRD notes the Premium pricing column advertises an AI tutor that does not
exist. Landing blocks are currently commented out
(`components/landing/deep-dive.tsx`, `why-us.tsx`, `hero.tsx`); re-enable them
only when Astra ships.

## 8. FE structure (proposed)

- `components/tutor/` — `tutor-panel`, `tutor-message`, `tutor-composer`,
  `tutor-chips`, `tutor-locked`, `ask-astra-button`
- `hooks/api/use-tutor.ts` — status, thread, feedback, clear (TanStack Query)
- `lib/tutor/stream.ts` — SSE reader (fetch), unit-testable parser
- `stores/tutor-store.ts` — panel open state and current context (Zustand)
- Panel mounted once in `(dashboard)/layout.tsx`; entry points set context via
  the store.

## 9. Testing

- Unit: SSE parser (chunk boundaries, `error` events, partial UTF-8), context
  builders, chip selection, hint-ladder state.
- Component: states in §4, draft retention on failure, locked state for
  FREEMIUM via `can(tier, "aiTutor")`.
- Contract: a fixture stream shared with the BE so both sides test against the
  same event sequence.
