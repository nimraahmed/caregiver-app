"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Shell } from "@/components/ui";
import { QuestionBody, isAnswered } from "@/components/QuestionBody";
import { useAppState } from "@/lib/store";
import { visibleQuestions, type QuestionId } from "@/lib/questions";
import { applyParse } from "@/lib/parseClient";

export function IntakeFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, hydrated, setProfile, update } = useAppState();
  const profile = state.profile;
  const returnTo = params.get("return");
  const [parsing, setParsing] = useState(false);

  const questions = useMemo(() => visibleQuestions(profile), [profile]);
  const requestedId = params.get("q") as QuestionId | null;
  let index = requestedId ? questions.findIndex((q) => q.id === requestedId) : 0;
  if (index < 0) index = 0;
  const question = questions[index];

  if (!hydrated) return <Shell><div className="h-40" /></Shell>;

  const go = (i: number) => router.push(`/intake?q=${questions[i].id}${returnTo ? `&return=${returnTo}` : ""}`);

  const next = async () => {
    if (question.id === "free_text" && profile.free_text !== state.parsedText) {
      setParsing(true);
      try {
        await applyParse(profile.free_text, update);
      } finally {
        setParsing(false);
      }
    }
    // Editing from confirm: return there unless a newly relevant question follows that has not been answered.
    if (returnTo === "confirm") {
      const later = questions.slice(index + 1).find((q) => q.showWhen && !state.answered.includes(q.id));
      if (later) {
        router.push(`/intake?q=${later.id}&return=confirm`);
        return;
      }
      router.push("/confirm");
      return;
    }
    if (index + 1 < questions.length) go(index + 1);
    else router.push("/confirm");
  };

  const back = () => {
    if (returnTo === "confirm") router.push("/confirm");
    else if (index === 0) router.push("/");
    else go(index - 1);
  };

  const canContinue = isAnswered(question.id, profile, state.answered);

  return (
    <Shell
      footer={
        <>
          <Button variant="secondary" onClick={back} className="w-28">
            <span className="flex items-center justify-center gap-1"><ArrowLeft size={18} /> Back</span>
          </Button>
          <Button onClick={next} disabled={!canContinue || parsing} className="flex-1">
            {parsing ? "Reading your description…" : question.id === "free_text" && !profile.free_text.trim() ? "Skip" : index + 1 === questions.length ? "Review answers" : "Next"}
          </Button>
        </>
      }
    >
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
          <span>Question {index + 1} of {questions.length}</span>
          <span>{Math.round(((index + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div className="h-full bg-teal-700 transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <h1 className="text-2xl font-semibold leading-snug">{question.title}</h1>
      {question.hint && <p className="mt-2 text-stone-600">{question.hint}</p>}
      <div className="mt-6">
        <QuestionBody id={question.id} profile={profile} evidence={state.evidence} answered={state.answered} patientName={state.patientName} onNameChange={(name) => update((s) => ({ ...s, patientName: name }))} onChange={(patch) => setProfile(patch, question.id)} />
      </div>
    </Shell>
  );
}
