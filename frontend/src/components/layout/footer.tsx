import Link from "next/link";

import { appName, routes } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="text-lg font-semibold text-slate-900">{appName}</p>
          <p className="mt-3 text-sm text-slate-600">
            Connecting companies with trusted testing, inspection, certification,
            and ESG service partners.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Company
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href={routes.home}>Overview</Link></li>
            <li><Link href={routes.dashboard}>Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Services
          </h3> 
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Testing</li>
            <li>Inspection</li>
            <li>Certification</li>
            <li>Sustainability</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Contact
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>info@ticmarketplace.com</li>
            <li>+91 9990992492</li>
            <li>Remote-first</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
