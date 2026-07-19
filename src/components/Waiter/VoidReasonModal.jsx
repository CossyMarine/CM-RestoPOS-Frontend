import { useState } from "react";
import { ShieldAlert } from "lucide-react";

export default function VoidReasonModal({ target, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  if (!target) return null;

  const submit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm p-6 animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center gap-2 text-red-600 mb-3">
          <ShieldAlert size={20} />
          <h3 className="text-base font-black text-stone-900">Request Void — {target.billId}</h3>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          This sends a void request to admin for approval. Please state your reason below.
        </p>
        <input
          type="text"
          autoFocus
          placeholder="Enter void reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full text-xs font-semibold border border-stone-200 rounded-xl p-3 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 text-stone-800"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-stone-200 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold text-stone-600 text-center transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-xs font-bold text-center transition-colors shadow-sm"
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
