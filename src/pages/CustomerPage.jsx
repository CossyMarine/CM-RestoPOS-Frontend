import { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Plus, Minus, X, ShoppingCart, Clock, User, Heart } from "lucide-react";
import useGuestSession from "../hooks/useGuestSession";
import { useAuth } from "../hooks/useAuth";
import API from "../api/axios";

import BottomNav from "../components/BottomNav";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");

const STATUS_STYLE = {
  pending:   "bg-amber-100 text-amber-700",
  serving:   "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABEL = { pending: "Pending", serving: "Serving", completed: "Delivered", cancelled: "Cancelled" };

const FAVORITES_KEY = "customer_favorite_meals";

function getStoredFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function MenuImage({ src, alt }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="w-full h-28 rounded-lg bg-gradient-to-br from-orange-50 to-stone-100 border border-stone-200 flex items-center justify-center">
        <UtensilsCrossed size={26} className="text-orange-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="w-full h-28 rounded-lg object-cover border border-stone-200"
    />
  );
}

export default function CustomerPage() {
  const { sessionId, tableNumber, setTableNumber } = useGuestSession();
  const { user } = useAuth();
  const [menu, setMenu] = useState([]);
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(getStoredFavorites);

  useEffect(() => {
    API.get("/menu")
      .then((res) => setMenu(res.data))
      .catch(() => toast.error("Couldn't load the menu"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    API.get("/orders/customer", { params: { sessionId } })
      .then((res) => setOrders(res.data))
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("order:created", (payload) => {
      if (payload.order?.guestSessionId === sessionId) {
        API.get("/orders/customer", { params: { sessionId } })
          .then((res) => setOrders(res.data))
          .catch(() => {});
      }
    });
    socket.on("order:updated", (order) => {
      if (order.guestSessionId === sessionId) {
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status: order.status } : o)));
      }
    });
    return () => socket.disconnect();
  }, [sessionId]);

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [menu]);

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Favorited items always come first, original order preserved otherwise.
  const visibleMenu = useMemo(() => {
    const base = category === "all" ? menu : menu.filter((m) => m.category === category);
    return [...base].sort((a, b) => {
      const aFav = favorites.has(a._id) ? 1 : 0;
      const bFav = favorites.has(b._id) ? 1 : 0;
      return bFav - aFav;
    });
  }, [menu, category, favorites]);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item._id);
      if (existing) {
        return prev.map((i) => (i.id === item._id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: item._id, name: item.name, price: Number(item.price), qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handlePlaceOrder = async () => {
    if (!tableNumber) {
      toast.error("Enter your table number first");
      return;
    }
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      const items = cart.map((i) => ({
        mealName: i.name,
        quantity: i.qty,
        unitPrice: i.price,
        lineTotal: i.qty * i.price,
      }));
      await API.post("/orders/customer", {
        tableNumber,
        items,
        guestSessionId: sessionId,
        customerName: user?.fullName || undefined,
      });
      setCart([]);
      const res = await API.get("/orders/customer", { params: { sessionId } });
      setOrders(res.data);
      toast.success("Order placed!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't place your order");
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await API.patch(`/orders/customer/${cancelTarget}/cancel`, { sessionId });
      setOrders((prev) => prev.map((o) => (o._id === cancelTarget ? { ...o, status: "cancelled" } : o)));
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't cancel order");
    } finally {
      setCancelTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-stone-900 flex items-center gap-2">
              🍴 Resto<span className="text-orange-500">POS</span>
            </h1>
            <p className="text-xs text-stone-400">Order straight from your table</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Table No."
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-28 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />

            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-orange-500 transition-colors whitespace-nowrap"
            >
              <User size={16} />
              {user ? user.fullName.split(" ")[0] : "Sign in"}
            </Link>
          </div>
        </div>
      </header>

      {/* Category filter */}
      <div className="max-w-6xl mx-auto px-5 mt-5 flex gap-2 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              category === c ? "bg-orange-500 text-white" : "bg-white border border-stone-200 text-stone-600"
            }`}
          >
            {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-5 mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu grid — locked to 2 columns, scrolls independently so the cart stays visible */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
            {loading && <p className="text-stone-400 text-sm col-span-full">Loading menu…</p>}
            {!loading && visibleMenu.length === 0 && (
              <p className="text-stone-400 text-sm col-span-full">No items in this category yet.</p>
            )}
            {visibleMenu.map((item) => {
              const isFavorite = favorites.has(item._id);
              return (
                <div key={item._id} className="relative bg-white rounded-xl border border-stone-200 p-3 flex flex-col">
                  <button
                    onClick={() => toggleFavorite(item._id)}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 border border-stone-200 flex items-center justify-center"
                  >
                    <Heart
                      size={14}
                      className={isFavorite ? "text-red-500" : "text-stone-400"}
                      fill={isFavorite ? "currentColor" : "none"}
                    />
                  </button>
                  <MenuImage src={item.imageUrl} alt={item.name} />
                  <h3 className="font-bold text-stone-900 text-sm mt-3">{item.name}</h3>
                  <p className="text-orange-500 font-black text-sm mb-3">KSh {Number(item.price).toLocaleString()}</p>
                  <button
                    onClick={() => addToCart(item)}
                    className="mt-auto w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 h-fit sticky top-24">
          <h2 className="font-black text-stone-900 flex items-center gap-2 mb-4">
            <ShoppingCart size={18} className="text-orange-500" /> Your Order
          </h2>

          {cart.length === 0 && <p className="text-stone-400 text-sm">Cart is empty</p>}

          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-stone-800">{item.name}</p>
                  <p className="text-stone-400 text-xs">KSh {item.price.toLocaleString()} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(item.id, -1)} className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center">
                    <Minus size={12} />
                  </button>
                  <span className="w-4 text-center font-semibold">{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)} className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center">
                    <Plus size={12} />
                  </button>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-1">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 mt-4 pt-4 flex justify-between font-black text-stone-900">
            <span>Total</span>
            <span>KSh {cartTotal.toLocaleString()}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            className="mt-4 w-full bg-stone-900 hover:bg-stone-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Place Order
          </button>
        </div>
      </div>

      {/* Recent orders */}
      <div className="max-w-6xl mx-auto px-5 mt-10">
        <h2 className="font-black text-stone-900 flex items-center gap-2 mb-3">
          <Clock size={18} className="text-orange-500" /> Recent Orders
        </h2>
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {orders.length === 0 && <p className="p-4 text-sm text-stone-400">No orders yet.</p>}
          {orders.map((o) => (
            <div key={o._id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <p className="font-bold text-stone-900">{o.billId || `Order #${o._id.slice(-6)}`}</p>
                <p className="text-xs text-stone-400">{new Date(o.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-bold text-stone-900">KSh {Number(o.subtotal).toLocaleString()}</p>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_STYLE[o.status] || "bg-stone-100 text-stone-600"}`}>
                  {STATUS_LABEL[o.status] || o.status}
                </span>
                {o.status === "pending" && (
                  <button
                    onClick={() => setCancelTarget(o._id)}
                    className="block text-xs text-red-600 font-semibold ml-auto"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel confirm modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-stone-900 mb-2">Cancel Order?</h3>
            <p className="text-sm text-stone-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="flex-1 border border-stone-300 rounded-lg py-2 font-semibold">
                No
              </button>
              <button onClick={handleConfirmCancel} className="flex-1 bg-red-600 text-white rounded-lg py-2 font-semibold">
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
        }
