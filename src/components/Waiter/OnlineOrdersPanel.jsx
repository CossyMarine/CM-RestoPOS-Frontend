import { Clock, Utensils, UtensilsCrossed } from "lucide-react";

function firstName(name) {
  if (!name) return "Guest";
  return name.trim().split(" ")[0];
}

function minutesAgo(createdAt) {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

function findMenuImage(menu, mealName) {
  if (!mealName) return null;
  const match = (menu || []).find(
    (m) => m.name?.trim().toLowerCase() === mealName.trim().toLowerCase()
  );
  return match?.imageUrl || null;
}

function orderTotal(order) {
  if (order.subtotal != null) return order.subtotal;
  return (order.items || []).reduce((sum, i) => sum + (i.lineTotal || i.quantity * i.unitPrice || 0), 0);
}

export default function OnlineOrdersPanel({ orders, menu, onTake }) {
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

              <ul className="text-xs text-stone-600 space-y-2 border-t border-stone-100 pt-2">
                {(order.items || []).map((item, i) => {
                  const imageUrl = findMenuImage(menu, item.mealName || item.name);
                  const unitPrice = item.unitPrice ?? item.price ?? 0;
                  const lineTotal = item.lineTotal ?? item.quantity * unitPrice;
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.mealName || item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UtensilsCrossed size={12} className="text-orange-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800 truncate">
                          {item.quantity}x {item.mealName || item.name}
                        </p>
                        <p className="text-[10px] text-stone-400">KSh {Number(unitPrice).toLocaleString()} each</p>
                      </div>
                      <span className="font-bold text-stone-700">KSh {Number(lineTotal).toLocaleString()}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between border-t border-stone-100 pt-2">
                <span className="text-[10px] font-bold uppercase text-stone-400">Order total</span>
                <span className="text-sm font-black text-stone-900">
                  KSh {Number(orderTotal(order)).toLocaleString()}
                </span>
              </div>

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
