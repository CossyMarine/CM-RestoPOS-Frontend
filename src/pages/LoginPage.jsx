import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import { routeForUser } from "../utils/routeForUser";

export default function LoginPage({ onAuthed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState("login"); // "login" | "register"

  // Staff (admin/kitchen/waiter/accountant) always land on their dashboard.
  // Customers return to wherever they came from (e.g. /profile), or /home.
  const handleAuthSuccess = async (user) => {
    await onAuthed?.(); // refresh App's shared auth state before navigating
    const isStaff = user.isAdmin || ["kitchen", "waiter", "accountant"].includes(user.role);
    if (isStaff) {
      navigate(routeForUser(user), { replace: true });
    } else {
      navigate(location.state?.from || "/home", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gray-900 border-r border-gray-800 p-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍴</span>
          <span className="font-black text-xl tracking-tight text-white">
            Resto<span className="text-orange-500">POS</span>
          </span>
        </div>

        <div>
          <div className="text-5xl mb-8">🍽️</div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Your restaurant,<br />
            <span className="text-orange-500">fully in control.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            Real-time orders, table management, and receipts — all from one fast login.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: "📋", label: "Orders" },
            { icon: "🧾", label: "Receipts" },
            { icon: "📊", label: "Revenue" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-gray-400 text-xs font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <span className="text-2xl">🍴</span>
          <span className="font-black text-xl text-white">
            Resto<span className="text-orange-500">POS</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-gray-500">
              {tab === "login"
                ? "Sign in — staff and customer accounts both work here"
                : "Sign up to track your orders"}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-stone-100">
              {["login", "register"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-4 text-sm font-bold transition-colors relative ${
                    tab === t ? "text-orange-500" : "text-stone-400"
                  }`}
                >
                  {t === "login" ? "Log In" : "Sign Up"}
                  {tab === t && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
              ))}
            </div>

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

          <p className="mt-6 text-center text-sm text-gray-500">
            Here to order food instead?{" "}
            <Link to="/home" className="text-orange-500 font-semibold hover:text-orange-400">
              Go to the customer menu
            </Link>
          </p>

          <button
            onClick={() => navigate("/home")}
            className="mt-4 w-full text-center text-gray-600 hover:text-gray-400 text-sm transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
