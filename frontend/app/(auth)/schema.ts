export type Role = "student" | "tutor";

export type LoginValues = {
  identifier: string;
  password: string;
};

export type RegisterValues = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
  acceptedTerms: boolean;
};

type ValidationResult = {
  success: boolean;
  errors: Partial<Record<keyof LoginValues | keyof RegisterValues, string>>;
};

export function validateLogin(values: LoginValues): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (!values.identifier.trim()) {
    errors.identifier = "Email or phone is required.";
  }

  if (values.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors
  };
}

export function validateRegister(values: RegisterValues): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  }

  if (values.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = "You must accept the terms.";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors
  };
}








