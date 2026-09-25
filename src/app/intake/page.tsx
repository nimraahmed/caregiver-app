import { Suspense } from "react";
import { IntakeFlow } from "@/components/IntakeFlow";

export default function IntakePage() {
  return (
    <Suspense>
      <IntakeFlow />
    </Suspense>
  );
}
