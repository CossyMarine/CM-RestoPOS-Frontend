import { Plus, Minus, X, Printer, ClipboardList } from "lucide-react";

export default function CartPanel({ cart, waiterName, tableNumber, onChangeQty, onRemove, onSubmit }) {
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 h-fit sticky top-24 shadow-sm flex flex-col">
      <div className="border-b border-stone-100 pb-3 mb-4 flex items-center justify-between">
        <h2 className="font-black text-stone-900 text-md flex items-center gap-2">
          <ClipboardList size={16} className="text-orange-500" /> Live Ticket Preview
        </h2>
        {waiterName && tableNumber && (
          <span className="text-xs bg-stone-100 px-2 py-1 rounded text-stone-600 font-semibold">
            T-{tableNumber} • {waiterName}
          </span>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="py-12 text-center text-stone-400 text-sm">
          Select configurations & items to prepare invoice ticket
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1 flex-1">
            {cart.map((item) => (
              <div key={item._id} className="flex items-center justify-between text-sm border-b border-stone-50 pb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-stone-800 text-xs truncate">{item.name}</p>
                  <p className="text-stone-400 text-xs">KSh {Number(item.price).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onChangeQty(item._id, -1)}
                    className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="w-5 text-center font-bold text-stone-800 text-xs">{item.qty}</span>
                  <button
                    onClick={() => onChangeQty(item._id, 1)}
                    className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                  <button onClick={() => onRemove(item._id)} className="text-stone-300 hover:text-red-500 ml-1 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 mt-4 pt-4 flex justify-between font-black text-stone-900 text-md">
            <span>Gross Balance</span>
            <span className="text-orange-600">KSh {cartTotal.toLocaleString()}</span>
          </div>

          <button
            onClick={onSubmit}
            className="mt-4 w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm"
          >
            <Printer size={16} /> Submit & Print Receipt
          </button>
        </>
      )}
    </div>
  );
}
