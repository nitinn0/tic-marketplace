import type { Metadata } from "next";

import { HomePage } from "@/features/marketplace/home-page";

export const metadata: Metadata = {
  title: "TIC Marketplace — Testing, Inspection, Certification & ESG services",
  description:
    "Search verified labs, inspectors, certification bodies and ESG consultants. Compare providers and get quotes in one RFQ.",
  openGraph: {
    title: "TIC Marketplace — Find. Compare. Source.",
    description: "Search verified TIC and ESG service providers and compare quotes.",
  },
};

export default function Page() {
  return <HomePage />;
}
