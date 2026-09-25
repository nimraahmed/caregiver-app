import Link from "next/link";
import { Home, ListChecks, BookOpenCheck } from "lucide-react";
import { Shell } from "@/components/ui";

export default function WelcomePage() {
  return (
    <Shell>
      <div className="flex min-h-[70dvh] flex-col justify-center gap-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Home Adaptation Companion</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            A practical plan for caring for an older relative with diabetes or after a stroke — in about three minutes.
          </h1>
          <p className="mt-4 text-stone-600">
            Answer a few questions about them, their home and a normal day. We turn that into a room-by-room checklist and a daily
            routine, every item backed by a named source.
          </p>
        </div>
        <ul className="space-y-3 text-stone-700">
          <li className="flex gap-3"><Home className="mt-0.5 shrink-0 text-teal-700" size={20} /> What to change in each room, and how urgent it is</li>
          <li className="flex gap-3"><ListChecks className="mt-0.5 shrink-0 text-teal-700" size={20} /> Who does what each day — them, or you</li>
          <li className="flex gap-3"><BookOpenCheck className="mt-0.5 shrink-0 text-teal-700" size={20} /> Sources on every recommendation</li>
        </ul>
        <div>
          <Link href="/intake" className="block w-full rounded-xl bg-teal-700 px-5 py-4 text-center text-lg font-medium text-white hover:bg-teal-800">
            Start
          </Link>
          <p className="mt-4 text-center text-xs text-stone-500">
            This tool helps with the home and daily routine. It does not give medical advice, diagnose, or replace a doctor or nurse.
          </p>
        </div>
      </div>
    </Shell>
  );
}
