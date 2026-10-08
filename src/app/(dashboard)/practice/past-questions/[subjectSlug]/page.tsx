"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { QuizEngine } from "@/components/assessment/quiz-engine";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";
import { PastQuestionPicker } from "@/components/practice/past-question-picker";

function PastQuestionQuiz() {
  const params = useParams();
  const searchParams = useSearchParams();
  const subjectSlug = params.subjectSlug as string;
  const examType = searchParams.get("exam") || undefined;
  // The picker has always sent ?year=, but this page used to drop it, so
  // "2022 JAMB Chemistry" generated from every JAMB Chemistry year we hold.
  const yearParam = Number(searchParams.get("year"));
  const examYear = Number.isInteger(yearParam) && yearParam > 0 ? yearParam : undefined;

  // Exam given but no year (e.g. from the classroom): land on the picker at
  // the year step, with exam and subject already chosen.
  if (examType && examYear === undefined) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Past Questions"
          description="Pick a year to start practising."
        />
        <PastQuestionPicker
          track={null}
          initialExam={examType}
          initialSubject={subjectSlug}
        />
      </div>
    );
  }

  return (
    <QuizEngine
      subjectSlug={subjectSlug}
      examType={examType}
      examYear={examYear}
      count={40}
      backHref="/practice/past-questions"
    />
  );
}

export default function PastQuestionQuizPage() {
  return (
    <Suspense fallback={<Spinner label="Loading questions..." />}>
      <PastQuestionQuiz />
    </Suspense>
  );
}
