import type { ProfileVerificationStatus } from "@/features/providers/types";

export type ProfessionalType = "CONSULTANT" | "LEAD_AUDITOR" | "LEAD_VERIFIER" | "INSPECTOR" | "TECHNICAL_EXPERT" | "OTHER";
export type AvailabilityStatus = "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";

export type ProfessionalExperience = {
  id: string;
  organizationName: string;
  jobTitle: string;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfessionalProfile = {
  id: string;
  userId: string;
  professionalType: ProfessionalType;
  headline: string | null;
  bio: string | null;
  yearsExperience: number | null;
  availabilityStatus: AvailabilityStatus;
  verificationStatus: ProfileVerificationStatus;
  publicProfile: boolean;
  publiclyVisible: boolean;
  createdAt: string;
  updatedAt: string;
  experience: ProfessionalExperience[];
};

export type ProfessionalProfileInput = {
  professionalType?: ProfessionalType;
  headline?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  availabilityStatus?: AvailabilityStatus;
  publicProfile?: boolean;
};

export type ExperienceInput = {
  organizationName?: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string | null;
  description?: string | null;
};
