import { useSearchParams } from "react-router-dom";

export default function PosSuspendedPage() {
  const [params] = useSearchParams();
  const isAdmin = params.get("role") === "admin";

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