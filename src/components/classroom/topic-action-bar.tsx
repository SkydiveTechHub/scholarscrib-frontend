"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuClipboardCheck, LuLayers, LuLoader, LuTarget } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api/errors";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { isSubscriptionTier, type SubscriptionTier } from "@/lib/subscription";
import { useGenerateDeck } from "@/hooks/api/use-flashcards";
import { useRecordTopicAnswers } from "@/hooks/api/use-topic-answers";
import {
  QuickQuizModal,
  type QuickQuizResult,
  type QuizQuestion,
} from "./quick-quiz-modal";

// The topic page's call-to-action row, rendered after the lesson note so it
// appears once the student has read to the end: take the note's quick quiz,
// drill flashcards, or practise with exam questions.

export function TopicActionBar({
  subjectSlug,
  topicSlug,
  lessonId,
  hasDeck,
  deckId,
  checks,
}: {
  subjectSlug: string;
  topicSlug: string;
  lessonId: string | null;
  hasDeck: boolean;
  deckId: string | null;
  /** The lesson note's own questions; the quick quiz is hidden when it has none. */
  checks: QuizQuestion[];
}) {
  const router = useRouter();
  const generateDeck = useGenerateDeck<{ deck: { id: string } }>();
  const { mutate: recordAnswers } = useRecordTopicAnswers();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<SubscriptionTier | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizResult, setQuizResult] = useState<QuickQuizResult | null>(null);

  const practiceHref = `/classroom/${subjectSlug}/${topicSlug}/practice`;

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
    <div className="mt-8 rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">
        Finished reading? Check what you&apos;ve learned.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {checks.length > 0 && (
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className={buttonClass("primary", "md")}
          >
            <LuTarget className="h-4 w-4" />
            Quick quiz
          </button>
        )}
        <button
          type="button"
          onClick={handleFlashcards}
          disabled={!lessonId || generating}
          className={cn(buttonClass("outline", "md"))}
        >
          {generating ? (
            <LuLoader className="h-4 w-4 animate-spin" />
          ) : (
            <LuLayers className="h-4 w-4" />
          )}
          {hasDeck ? "Flashcards" : "Build flashcards"}
        </button>
        {/* Practice is not gated: a student who already knows the topic can go
            straight to the questions. */}
        <Link href={practiceHref} className={buttonClass("outline", "md")}>
          <LuClipboardCheck className="h-4 w-4" />
          Practice
        </Link>
      </div>
      {quizResult && (
        <p className="mt-3 text-sm font-medium text-foreground" role="status">
          Quick quiz: {quizResult.correct} of {quizResult.total} correct.
        </p>
      )}
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      <QuickQuizModal
        open={quizOpen}
        checks={checks}
        onCancel={() => setQuizOpen(false)}
        onSubmit={(result) => {
          setQuizResult(result);
          setQuizOpen(false);
          // Counts towards mastery. A failed save stays silent: the score is
          // already on screen and the quiz is a self-check.
          recordAnswers({ subjectSlug, topicSlug, answers: result.answers });
        }}
      />
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
