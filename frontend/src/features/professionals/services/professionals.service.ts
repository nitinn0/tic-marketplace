import { api } from "@/lib/api";

import type { ExperienceInput, ProfessionalExperience, ProfessionalProfile, ProfessionalProfileInput } from "../types";

const experience = (id: string) => `/professional/experience/${encodeURIComponent(id)}`;

/** The caller's own professional profile; the backend keys everything by the signed-in user. */
export const professionalsService = {
  getProfile: () => api.get<ProfessionalProfile>("/professional/profile"),
  createProfile: (input: ProfessionalProfileInput) => api.post<ProfessionalProfile>("/professional/profile", input),
  updateProfile: (input: ProfessionalProfileInput) => api.patch<ProfessionalProfile>("/professional/profile", input),

  listExperience: () => api.get<ProfessionalExperience[]>("/professional/experience"),
  createExperience: (input: ExperienceInput) => api.post<ProfessionalExperience>("/professional/experience", input),
  updateExperience: (id: string, input: ExperienceInput) => api.patch<ProfessionalExperience>(experience(id), input),
  deleteExperience: (id: string) => api.delete<{ id: string; deleted: boolean }>(experience(id)),
};
