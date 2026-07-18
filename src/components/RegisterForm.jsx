import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Check, X, Loader2 } from "lucide-react";
import API from "../api/axios";

export default function RegisterForm({ onSuccess }) {
  const [method, setMethod] = useState("phone"); // "phone" | "email"
  const [contact, setContact] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [contactStatus, setContactStatus] = useState(null); // "checking" | "available" | "taken" | null
  const debounceRef = useRef(null);

  // Live-check contact (email/phone) availability as the person types
  useEffect(() => {
    if (!contact.trim()) return setContactStatus(null);
    clearTimeout(debounceRef.current);
    setContactStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await API.get("/auth/check-availability", {
          params: { field: method, value: contact.trim() },
        });
        setContactStatus(res.data.available ? "available" : "taken");
      } catch {
        setContactStatus(null);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [contact, method]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (contactStatus === "taken") {
      toast.error(`This ${method} is already registered`);
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/register-customer", {
        fullName,
        method,
        contact,
        password,
      });
      toast.success("Account created!");
      onSuccess?.(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't create account");
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === "checking") return <Loader2 size={16} className="animate-spin text-stone-400" />;
    if (status === "available") return <Check size={16} className="text-green-500" />;
    if (status === "taken") return <X size={16} className="text-red-500" />;
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">Full name</label>
        <input
          type="text"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">Sign up with</label>
        <div className="flex rounded-xl overflow-hidden border border-stone-300">
          {["phone", "email"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMethod(m); setContact(""); setContactStatus(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                method === m ? "bg-orange-500 text-white" : "bg-white text-stone-500"
              }`}
            >
              {m === "phone" ? "Phone" : "Email"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">
          {method === "phone" ? "Phone number" : "Email address"}
        </label>
        <div className="relative">
          <input
            type={method === "phone" ? "tel" : "email"}
            placeholder={method === "phone" ? "07XX XXX XXX" : "you@example.com"}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            className={`w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 transition-colors ${
              contactStatus === "taken"
                ? "border-red-300 focus:ring-red-200"
                : "border-stone-300 focus:ring-orange-300"
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <StatusIcon status={contactStatus} />
          </span>
        </div>
        {contactStatus === "taken" && (
          <p className="text-xs text-red-500 mt-1">
            This {method} is already registered — try logging in instead.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">Password</label>
        <input
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">Confirm password</label>
        <input
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
            confirmPassword && confirmPassword !== password
              ? "border-red-300 focus:ring-red-200"
              : "border-stone-300 focus:ring-orange-300"
          }`}
        />
        {confirmPassword && confirmPassword !== password && (
          <p className="text-xs text-red-500 mt-1">Passwords don't match.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}
