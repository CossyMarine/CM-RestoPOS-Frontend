import { Clock, ExternalLink, Utensils } from "lucide-react";

function firstName(name) {
  if (!name) return "Guest";
  return name.trim().split(" ")[0];
}

function minutesAgo(createdAt) {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

function OrderCard({ order, onView }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black text-stone-900">Table {order.tableNumber}</span>
          <span className="text-[10px] text-stone-400 flex items-center gap-1">
            <Clock size={10} /> {minutesAgo(order.createdAt)}m ago
          </span>
        </div>
        <p className="text-xs text-stone-500 truncate">
          {firstName(order.customerName)} • {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}
        </p>
      </div>
      <button
        onClick={onView}
        className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
      >
        View
      </button>
    </div>
  );
}

export default function OnlineOrdersBar({ orders, onView }) {
  const visible = orders.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-stone-900 text-sm flex items-center gap-2">
          <Utensils size={16} className="text-orange-500" /> Online Orders ({orders.length})
        </h2>
        {orders.length > 0 && (
          <button
            onClick={onView}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            View all <ExternalLink size={12} />
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-6 text-center text-stone-400 text-xs">
          No online orders waiting right now
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((order) => (
            <OrderCard key={order._id} order={order} onView={onView} />
          ))}
        </div>
      )}
    </div>
  );
}
