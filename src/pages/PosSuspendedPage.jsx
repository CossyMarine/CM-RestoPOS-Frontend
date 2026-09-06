// src/pages/PosSuspendedPage.jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { routeForUser } from "../utils/routeForUser";

// Polling interval while parked on this page — check every 15s in case
// the business gets reactivated while the tab is sitting open.
const RECHECK_INTERVAL_MS = 15000;

export default function PosSuspendedPage() {
  const [params] = useSearchParams();
  const isAdmin = params.get("role") === "admin";
  const { user, refetch } = useAuth();
  const navigate = useNavigate();

  // Re-check auth/business status: on mount, on an interval, and whenever
  // the tab regains focus (covers "activated it in another tab" too).
  useEffect(() => {
    refetch();

    const interval = setInterval(refetch, RECHECK_INTERVAL_MS);
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetch]);

  // Once refetch() resolves with a non-suspended status, leave this page.
  useEffect(() => {
    if (user && user.businessStatus !== "suspended") {
      navigate(routeForUser(user), { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <p className="text-lg font-bold text-gray-600 text-center">
        {isAdmin
          ? "POS suspended — you have to pay to continue."
          : "POS not available now."}
      </p>
    </div>
  );
}