import { useState } from "react";
import {
  useNavigate,
  useLocation,
  useSearchParams,
  Link,
} from "react-router-dom";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import { routeForUser } from "../utils/routeForUser";

export default function LoginPage({ onAuthed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState(
    searchParams.get("tab") === "register" ? "register" : "login"
  );

  const handleAuthSuccess = async (user) => {
    await onAuthed?.();

    const isStaff =
      user.isAdmin ||
      ["kitchen", "waiter", "accountant"].includes(user.role);

    if (isStaff) {
      navigate(routeForUser(user), { replace: true });
    } else {
      navigate(location.state?.from || "/home", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-white flex">

      {/* LEFT — Authentication */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <UtensilsCrossed size={20} />
            </div>

            <span className="font-black text-2xl tracking-tight text-gray-900">
              Resto<span className="text-orange-500">POS</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              {tab === "login"
                ? "Welcome back"
                : "Create an account"}
            </h1>

            <p className="text-sm text-gray-500 font-medium">
              {tab === "login"
                ? "Sign in to continue to your account."
                : "Create your account to get started."}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-gray-100 p-1.5 bg-gray-50">
              {[
                { id: "login", label: "Log In" },
                { id: "register", label: "Sign Up" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    tab === t.id
                      ? "bg-white text-orange-500 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="p-6">
              {tab === "login" ? (
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToRegister={() => setTab("register")}
                />
              ) : (
                <RegisterForm onSuccess={handleAuthSuccess} />
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-7 text-center space-y-3">

            <p className="text-xs font-semibold text-gray-500">
              Here to order food instead?{" "}
              <Link
                to="/home"
                className="text-orange-500 font-bold hover:text-orange-600 transition-colors underline underline-offset-2"
              >
                Go to customer menu
              </Link>
            </p>

            <button
              onClick={() => navigate("/home")}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              <ArrowLeft size={14} />
              Back to main home
            </button>

          </div>
        </div>
      </div>

      {/* RIGHT — Food Image, blended into the page */}
<div className="hidden lg:block lg:w-1/2 relative bg-white">
  <img
    src="/images/login-food.jpg"
    alt=""
    className="absolute inset-0 w-full h-full object-cover"
    style={{
      maskImage: `
        linear-gradient(to right, transparent 0%, black 20%),
        linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)
      `,
      maskComposite: "intersect",
      WebkitMaskImage: `
        linear-gradient(to right, transparent 0%, black 20%),
        linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)
      `,
      WebkitMaskComposite: "source-in",
      filter: "brightness(1.03) saturate(0.92)",
    }}
  />
</div>
    </div>
  );
}