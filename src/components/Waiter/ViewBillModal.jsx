import { X, Receipt as ReceiptIcon } from "lucide-react";

export default function ViewBillModal({ bill, onClose }) {
  if (!bill) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <ReceiptIcon size={18} className="text-stone-500" /> {bill.billId}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Table {bill.tableNumber} {bill.waiterName ? `· ${bill.waiterName}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <span
            className={`inline-block mb-4 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
              bill.status === "voided"
                ? "bg-red-50 text-red-600 border border-red-200"
                : bill.status === "paid"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}
          >
            {bill.status}
          </span>

          <div className="space-y-2">
            {(bill.items || []).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs border-b border-stone-100 pb-2">
                <div>
                  <p className="font-bold text-stone-800">{item.mealName}</p>
                  <p className="text-stone-400">
                    {item.quantity} x KSh {Number(item.unitPrice).toLocaleString()}
                  </p>
                </div>
                <p className="font-black text-stone-900">KSh {Number(item.lineTotal).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-200">
            <span className="text-xs font-bold uppercase text-stone-400">Total</span>
            <span className="text-lg font-black text-stone-900">KSh {bill.subtotal.toLocaleString()}</span>
          </div>

          {bill.voidReason && (
            <p className="mt-3 text-[11px] text-red-500 font-semibold">Void reason: {bill.voidReason}</p>
          )}
        </div>

        <div className="p-5 border-t border-stone-100">
          <button
            onClick={onClose}
            className="w-full border border-stone-200 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold text-stone-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
