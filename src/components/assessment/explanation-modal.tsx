"use client";

import { LuCheck, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api/errors";
import { useQuestionExplanation } from "@/hooks/api/use-assessments";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { Markdown } from "@/components/lesson/markdown";
import { Modal } from "@/components/ui/modal";
import { RichText } from "@/components/ui/rich-text";
import { QuestionImage } from "@/components/ui/question-image";
import { Spinner } from "@/components/ui/spinner";
import {
  pastQuestionsDetail,
  type SubscriptionTier,
} from "@/lib/subscription";

export type ExplainedQuestion = {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionImageUrl: string | null;
  options: Record<string, string> | null;
  selectedAnswer: string | null;
  correctAnswer: string;
  /** From the result payload; empty or null means it must be fetched. */
  explanation: string | null;
  explanationImageUrl: string | null;
};

/**
 * A question's explanation in a modal. The result payload's own explanation is
 * shown when it has one; otherwise it is fetched from
 * `GET /api/questions/{id}/explanation`, and only once the modal is open.
 *
 * Freemium sees answers only (API 403 → upgrade). Standard gets the bank
 * explanation. Premium also gets the AI "in simple terms" rewrite.
 */
export function ExplanationModal({
  question,
  onClose,
  tier = "FREEMIUM",
}: {
  question: ExplainedQuestion | null;
  onClose: () => void;
  tier?: SubscriptionTier;
}) {
  const detail = pastQuestionsDetail(tier);
  const canFetch = detail === "explanation" || detail === "ai_explanation";
  const inline = question?.explanation?.trim() ? question.explanation : null;
  const fetched = useQuestionExplanation(
    question?.questionId ?? "",
    Boolean(question) && !inline && canFetch,
  );

  const text = inline ?? fetched.data?.explanation ?? null;
  const imageUrl = inline
    ? question?.explanationImageUrl
    : (fetched.data?.solutionImageUrl ?? question?.explanationImageUrl);
  const simplified =
    detail === "ai_explanation" && !inline
      ? fetched.data?.simplifiedExplanation?.trim() || null
      : null;
  const blocked =
    !canFetch ||
    (isApiError(fetched.error) && fetched.error.isForbidden);

  return (
    <Modal
      open={question !== null}
      title={question ? `Question ${question.questionNumber} explanation` : "Explanation"}
      description={question ? `Correct answer: ${question.correctAnswer}` : undefined}
      onClose={onClose}
      className="max-w-2xl"
    >
      {question && <QuestionContext question={question} />}
      {blocked && !inline ? (
        <UpgradePrompt
          feature="Past-question explanations"
          requiredTier="STANDARD"
          description="Free shows the correct answer. Upgrade to Standard for full explanations, or Premium for an AI rewrite in simple terms."
        />
      ) : text ? (
        <div className="space-y-4 text-sm leading-relaxed text-foreground">
          <h4 className="section-label">Explanation</h4>
          <Markdown content={text} />
          {simplified && (
            <div className="rounded-xl border border-tone-blue-line bg-tone-blue-soft p-4 text-tone-blue-ink">
              <h4 className="text-xs font-bold uppercase tracking-wider">In simple terms</h4>
              <div className="mt-2">
                <Markdown content={simplified} />
              </div>
            </div>
          )}
          {detail === "explanation" && (
            <p className="text-xs text-muted">
              Premium adds an AI rewrite in simpler language for every explanation.
            </p>
          )}
          {imageUrl && (
            <QuestionImage src={imageUrl} alt="Diagram supporting this explanation" />
          )}
        </div>
      ) : fetched.isError ? (
        <div className="space-y-3 text-sm text-muted">
          <p>
            {isApiError(fetched.error) && fetched.error.message
              ? fetched.error.message
              : "Couldn't load the explanation."}
          </p>
          <button
            type="button"
            onClick={() => void fetched.refetch()}
            className="font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <Spinner label="Loading explanation..." />
      )}
    </Modal>
  );
}

/** The question and its options, so the explanation is read with context. */
function QuestionContext({ question }: { question: ExplainedQuestion }) {
  return (
    <div className="mb-5 space-y-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
      <p className="leading-relaxed text-foreground">
        <span className="mr-1 font-bold text-muted">Q{question.questionNumber}.</span>
        <RichText text={question.questionText} />
      </p>
      {question.questionImageUrl && (
        <QuestionImage src={question.questionImageUrl} alt="Diagram for this question" />
      )}
      {question.options && (
        <ul className="space-y-1.5">
          {Object.entries(question.options).map(([key, value]) => {
            const correct = key === question.correctAnswer;
            const wrong = key === question.selectedAnswer && !correct;
            return (
              <li
                key={key}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2.5",
                  correct
                    ? "border-success/30 bg-success-soft"
                    : wrong
                      ? "border-danger/30 bg-danger-soft"
                      : "border-transparent",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    correct
                      ? "bg-success text-white"
                      : wrong
                        ? "bg-danger text-white"
                        : "bg-border text-muted",
                  )}
                >
                  {key}
                </span>
                <span className="flex-1 text-foreground">
                  <RichText text={value} />
                </span>
                {correct && <LuCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />}
                {wrong && <LuX className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />}
              </li>
            );
          })}
        </ul>
      )}
      {question.selectedAnswer === null && (
        <p className="text-xs font-semibold text-muted">You skipped this question.</p>
      )}
    </div>
  );
}
