import { CheckCircle2 } from "lucide-react";

export default function PrintConfirmModal({ open, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="mx-auto w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 border border-green-100">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-lg font-black text-stone-900 mb-1">Confirm Order & Print</h3>
        <p className="text-xs text-stone-400 mb-5">This will submit the order to the kitchen and print the receipt.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 border border-stone-200 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold text-stone-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-xs font-bold transition-colors shadow-sm shadow-green-200 disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Confirm & Print"}
          </button>
        </div>
      </div>
    </div>
  );
}
