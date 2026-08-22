// Shared types and constants for the Profile feature.
// Kept at the folder root so both hooks/ and components/ can import
// from a single, stable location ("../types") regardless of nesting.

export type UserRole = "admin" | "manager" | "register_user" | "assessor";

export const roleLabels: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  register_user: "Register User",
  assessor: "Assessor (Read Only)",
};

export interface PersonalInfoState {
  fullName: string;
  phone: string;
  savingInfo: boolean;
}

export interface PasswordChangeState {
  newPassword: string;
  confirmPassword: string;
  savingPassword: boolean;
}
