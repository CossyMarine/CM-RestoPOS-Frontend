import { useState, useEffect } from "react";
import { X, UtensilsCrossed, UserCheck } from "lucide-react";

function orderTotal(order) {
  if (!order) return 0;
  if (order.subtotal != null) return order.subtotal;
  return (order.items || []).reduce((sum, i) => sum + (i.lineTotal || i.quantity * i.unitPrice || 0), 0);
}

export default function TakeOrderModal({ order, waiters, busy, onCancel, onConfirm }) {
  const [selectedWaiter, setSelectedWaiter] = useState("");

  useEffect(() => {
    setSelectedWaiter("");
  }, [order]);

  if (!order) return null;

  const submit = () => {
    if (!selectedWaiter) return;
    onConfirm(selectedWaiter);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <UserCheck size={18} className="text-orange-500" /> Take Order — Table {order.tableNumber}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">Select which waiter will serve this order</p>
          </div>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <ul className="text-xs text-stone-600 space-y-2 mb-5">
            {(order.items || []).map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed size={12} className="text-orange-300" />
                </div>
                <span className="flex-1 font-semibold text-stone-800">
                  {item.quantity}x {item.mealName || item.name}
                </span>
                <span className="font-bold text-stone-600">
                  KSh {Number(item.lineTotal ?? item.quantity * item.unitPrice).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between mb-5 pt-2 border-t border-stone-100">
            <span className="text-[10px] font-bold uppercase text-stone-400">Order total</span>
            <span className="text-sm font-black text-stone-900">KSh {Number(orderTotal(order)).toLocaleString()}</span>
          </div>

          <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Assign to waiter</label>
          <select
            autoFocus
            value={selectedWaiter}
            onChange={(e) => setSelectedWaiter(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select waiter...</option>
            {waiters.map((w) => (
              <option key={w.id} value={w.fullName}>
                {w.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="p-5 border-t border-stone-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-stone-200 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold text-stone-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!selectedWaiter || busy}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-xs font-bold transition-colors disabled:opacity-40"
          >
            {busy ? "Assigning..." : "Confirm & Take Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
