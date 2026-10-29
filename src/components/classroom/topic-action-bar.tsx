"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuLayers, LuListChecks, LuLoader } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api/errors";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { isSubscriptionTier, type SubscriptionTier } from "@/lib/subscription";
import { useGenerateDeck } from "@/hooks/api/use-flashcards";
import { PRACTICE_TEST_ENABLED } from "@/lib/classroom";
import { QuickQuiz } from "./quick-quiz";
import type { QuizQuestion } from "./quick-quiz-modal";

// The topic page's "practise this topic" row, rendered after the lesson. The
// graded practice test that completes the lesson is not here: it is the lesson's
// own end card. While that test is switched off (PRACTICE_TEST_ENABLED) the quick
// quiz is the end card's action, so this row is flashcards alone. With the test
// on, the quick quiz and an untimed set of exam questions join flashcards here.

export function TopicActionBar({
  subjectSlug,
  topicSlug,
  lessonId,
  hasDeck,
  deckId,
  checks,
  completed,
}: {
  subjectSlug: string;
  topicSlug: string;
  lessonId: string | null;
  hasDeck: boolean;
  deckId: string | null;
  /** The lesson is completed, so flashcards lead: the job now is retention. */
  completed: boolean;
  /** The lesson note's own questions; the quick quiz is hidden when it has none. */
  checks: QuizQuestion[];
}) {
  const router = useRouter();
  const generateDeck = useGenerateDeck<{ deck: { id: string } }>();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<SubscriptionTier | null>(null);

  const moreQuestionsHref = `/classroom/${subjectSlug}/${topicSlug}/quiz`;

  async function handleFlashcards() {
    if (hasDeck) {
      router.push(deckId ? `/flashcards/${deckId}` : "/flashcards");
      return;
    }
    if (!lessonId || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const data = await generateDeck.mutateAsync({ lessonId });
      router.push(`/flashcards/${data.deck.id}`);
    } catch (err) {
      // A plan gate is an offer, not an error: say what unlocks it in a modal.
      if (
        isApiError(err) &&
        err.isForbidden &&
        isSubscriptionTier(err.requiredTier)
      ) {
        setUpgradeTier(err.requiredTier);
        setGenerating(false);
        return;
      }
      // The backend's sentence says why (lesson has no cards, ...); only an
      // unreachable server or a 5xx gets the generic line.
      setError(
        isApiError(err) && err.status < 500 && err.message
          ? err.message
          : "Couldn't build the flashcard deck. Try again.",
      );
      setGenerating(false);
    }
  }

  return (
    <div id="topic-actions" className="mt-8 scroll-mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">
        {PRACTICE_TEST_ENABLED ? "Practise this topic" : "Remember it"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleFlashcards}
          disabled={!lessonId || generating}
          className={cn(buttonClass(completed ? "primary" : "outline", "md"))}
        >
          {generating ? (
            <LuLoader className="h-4 w-4 animate-spin" />
          ) : (
            <LuLayers className="h-4 w-4" />
          )}
          {hasDeck ? "Flashcards" : "Build flashcards"}
        </button>
        {PRACTICE_TEST_ENABLED && (
          <>
            <QuickQuiz
              subjectSlug={subjectSlug}
              topicSlug={topicSlug}
              checks={checks}
            />
            {/* Untimed exam-style questions: low stakes, and open to anyone. */}
            <Link
              href={moreQuestionsHref}
              className={buttonClass("outline", "md")}
            >
              <LuListChecks className="h-4 w-4" />
              More questions
            </Link>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      {upgradeTier && (
        <UpgradeModal
          open
          onClose={() => setUpgradeTier(null)}
          feature="Flashcards"
          requiredTier={upgradeTier}
          description="Turn any lesson into spaced-repetition flashcards you can review daily."
        />
      )}
    </div>
  );
}
