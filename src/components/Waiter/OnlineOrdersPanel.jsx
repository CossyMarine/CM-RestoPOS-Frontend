import { Clock, Utensils } from "lucide-react";

function firstName(name) {
  if (!name) return "Guest";
  return name.trim().split(" ")[0];
}

function minutesAgo(createdAt) {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

export default function OnlineOrdersPanel({ orders, onTake }) {
  return (
    <div className="max-w-7xl mx-auto px-5 mt-6 space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <h2 className="font-black text-stone-900 text-sm flex items-center gap-2">
          <Utensils size={16} className="text-orange-500" /> Online Orders
        </h2>
        <span className="text-xs text-stone-400 font-semibold">{orders.length} waiting</span>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-400 text-xs">
          No online orders waiting right now
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-stone-900">Table {order.tableNumber}</span>
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Clock size={10} /> {minutesAgo(order.createdAt)}m ago
                  </span>
                </div>
                <p className="text-xs text-stone-500">{firstName(order.customerName)}</p>
              </div>

              <ul className="text-xs text-stone-600 space-y-1 border-t border-stone-100 pt-2">
                {(order.items || []).map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{item.quantity}x {item.mealName || item.name}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onTake(order)}
                className="mt-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              >
                Take This
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
