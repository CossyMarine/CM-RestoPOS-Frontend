// src/utils/validatePassword.js
// Mirrors backend/utils/validatePassword.js exactly — must stay in sync so
// the frontend never accepts something the backend will reject.

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "uppercase", label: "At least one uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "number", label: "At least one number", test: (pw) => /[0-9]/.test(pw) },
  { key: "special", label: "At least one special character", test: (pw) => SPECIAL_CHAR_REGEX.test(pw) },
];

export const validatePassword = (password = "") => {
  const failed = PASSWORD_REQUIREMENTS.filter((r) => !r.test(password));
  return { valid: failed.length === 0, errors: failed.map((r) => r.label) };
};