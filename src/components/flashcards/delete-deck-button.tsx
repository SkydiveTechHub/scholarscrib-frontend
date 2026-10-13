"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuTrash2, LuTriangleAlert } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";
import { useDeleteDeck } from "@/hooks/api/use-flashcards";

/**
 * Removes a deck from the student's list.
 *
 * A deck built from a lesson is shared with everyone studying that lesson, so
 * removing it only leaves it: it disappears from this student's list, their
 * review history is kept, and building flashcards on the lesson again brings it
 * back. A deck a student made themselves is theirs, so removing it deletes it,
 * and the confirmation says so, naming any other students studying it.
 */
export function DeleteDeckButton({
  deckId,
  deckTitle,
  followerCount,
  fromLesson,
}: {
  deckId: string;
  deckTitle: string;
  followerCount: number;
  fromLesson: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const deleteDeck = useDeleteDeck();
  const busy = deleteDeck.isPending;
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    deleteDeck.mutate(deckId, {
      onSuccess: () => {
        router.push("/flashcards");
        router.refresh();
      },
      onError: (err) => {
        setError(
          isApiError(err)
            ? (err.body?.error ?? "Couldn’t remove this deck.")
            : "Something went wrong. Please try again.",
        );
      },
    });
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-muted hover:text-danger"
      >
        <LuTrash2 className="h-4 w-4" />
        {fromLesson ? "Remove from my decks" : "Delete deck"}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft/30 p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-foreground">
        <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
        <span>
          {fromLesson ? "Remove" : "Delete"} “{deckTitle}”
          {fromLesson ? " from your decks?" : "?"}
        </span>
      </p>
      {fromLesson ? (
        <ul className="mt-2 space-y-1 pl-6 text-xs leading-relaxed text-muted">
          <li>Your review history is kept.</li>
          <li>
            Build flashcards on the lesson again to bring it back, exactly as
            you left it.
          </li>
        </ul>
      ) : (
        <ul className="mt-2 space-y-1 pl-6 text-xs leading-relaxed text-muted">
          <li>Every card in it goes, along with your review history.</li>
          {followerCount > 0 && (
            <li className="font-semibold text-warning">
              {followerCount} other student{followerCount === 1 ? "" : "s"}{" "}
              {followerCount === 1 ? "is" : "are"} studying this deck. They lose
              their cards and their progress too.
            </li>
          )}
          <li>This cannot be undone.</li>
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm font-medium text-danger">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={remove}
          disabled={busy}
        >
          {busy
            ? fromLesson
              ? "Removing…"
              : "Deleting…"
            : fromLesson
              ? "Remove deck"
              : "Delete deck"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
