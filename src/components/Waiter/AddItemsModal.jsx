import { useState, useMemo } from "react";
import { X, Search, Plus, Minus, PackagePlus, UtensilsCrossed } from "lucide-react";

export default function AddItemsModal({ bill, menu, onCancel, onSubmit, busy }) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState([]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return menu;
    const q = search.trim().toLowerCase();
    return menu.filter((m) => m.name.toLowerCase().includes(q) || String(m.price).includes(q));
  }, [menu, search]);

  if (!bill) return null;

  const addPick = (item) => {
    setPicked((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) return prev.map((i) => (i._id === item._id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { _id: item._id, name: item.name, price: Number(item.price), qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setPicked((prev) => prev.map((i) => (i._id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  };

  const handleSubmit = () => {
    if (picked.length === 0) return;
    onSubmit(
      bill._id,
      picked.map((i) => ({ mealName: i.name, quantity: i.qty, unitPrice: i.price }))
    );
    setPicked([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <PackagePlus size={18} className="text-orange-500" /> Add Items — {bill.billId}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Table {bill.tableNumber} • Current total KSh {bill.subtotal.toLocaleString()}
            </p>
          </div>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu to add..."
              className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-8 pr-3 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 max-h-[35vh] overflow-y-auto pr-1">
            {filteredMenu.map((item) => (
              <button
                key={item._id}
                onClick={() => addPick(item)}
                className="bg-white border border-stone-200 hover:border-orange-400 rounded-xl p-2.5 text-left flex items-center gap-2 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <UtensilsCrossed size={14} className="text-orange-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 text-xs truncate">{item.name}</p>
                  <p className="text-orange-500 font-black text-[11px]">KSh {Number(item.price).toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>

          {picked.length > 0 && (
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-bold uppercase text-stone-400 mb-2">Adding to bill</p>
              <div className="space-y-2">
                {picked.map((item) => (
                  <div key={item._id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-800 font-semibold text-xs">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(item._id, -1)}
                        className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-5 text-center font-bold text-stone-800 text-xs">{item.qty}</span>
                      <button
                        onClick={() => changeQty(item._id, 1)}
                        className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-stone-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-stone-200 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold text-stone-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={picked.length === 0 || busy}
            className="flex-1 bg-stone-900 hover:bg-stone-800 text-white rounded-xl py-2.5 text-xs font-bold transition-colors disabled:opacity-40"
          >
            {busy ? "Saving..." : "Add to Bill & Reprint"}
          </button>
        </div>
      </div>
    </div>
  );
}
