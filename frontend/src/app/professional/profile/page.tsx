"use client";

import { Container } from "@/components/common/container";
import { ProfessionalProfileView } from "@/features/professionals/components/professional-profile-view";

export default function ProfessionalProfilePage() {
  return (
    <Container className="py-12">
      <ProfessionalProfileView />
    </Container>
  );
}
