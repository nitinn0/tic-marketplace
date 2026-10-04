import { Suspense } from "react";

import { LoadingState } from "@/components/common/loading-state";
import { AcceptInvitation } from "@/features/organizations/components/accept-invitation";

export default function AcceptInvitationPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Suspense fallback={<LoadingState label="Checking invitation..." />}>
        <AcceptInvitation />
      </Suspense>
    </div>
  );
}
