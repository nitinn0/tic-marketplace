"use client";

import { Container } from "@/components/common/container";
import { ProviderProfileView } from "@/features/providers/components/provider-profile-view";

export default function ProviderProfilePage() {
  return (
    <Container className="py-12">
      <ProviderProfileView />
    </Container>
  );
}
