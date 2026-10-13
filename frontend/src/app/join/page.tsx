import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants";

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Join as a provider</h1>
      <p className="mt-4 text-muted-foreground">
        Labs, inspection companies, certification bodies and consultants list their services and receive RFQs that
        match. Buyers stay masked: you see location, sites and headcount, not the company name or contact details.
      </p>
      <ol className="mt-8 space-y-3 text-sm">
        <li>1. Create a provider organization and profile.</li>
        <li>2. Add the services you offer and the locations you cover.</li>
        <li>3. Make the profile public. Incoming RFQs appear under Incoming RFQs.</li>
      </ol>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="cta">
          <Link href={routes.login}>Sign in</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={routes.organizations}>Organizations</Link>
        </Button>
      </div>
    </div>
  );
}
