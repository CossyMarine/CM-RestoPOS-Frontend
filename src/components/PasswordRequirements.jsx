import { Check, X } from "lucide-react";
import { PASSWORD_REQUIREMENTS } from "../utils/validatePassword";

// Live checklist shown under any password field — used by all four
// password flows (register, admin-create-staff, change, reset).
export default function PasswordRequirements({ password }) {
  return (
    <ul className="text-xs space-y-1 mt-1.5">
      {PASSWORD_REQUIREMENTS.map((r) => {
        const pass = r.test(password || "");
        return (
          <li key={r.key} className={`flex items-center gap-1.5 ${pass ? "text-emerald-600" : "text-gray-400"}`}>
            {pass ? <Check size={12} /> : <X size={12} />}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}