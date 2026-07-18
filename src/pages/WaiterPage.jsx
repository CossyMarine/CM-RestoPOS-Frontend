import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { 
  UtensilsCrossed, Plus, Minus, X, Printer, History, 
  LayoutDashboard, Trash2, ShieldAlert, CheckCircle2 
} from "lucide-react";
import API from "../api/axios";

// Reusable image handling fallback
function MenuImage({ src, alt }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-50 to-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
        <UtensilsCrossed size={16} className="text-orange-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="w-12 h-12 rounded-lg object-cover border border-stone-200 flex-shrink-0"
    />
  );
}

export default function WaiterDashboard() {
  // Navigation & View Tracking
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "history"

  // Dashboard Inputs & Selections
  const [waiterName, setWaiterName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [menu, setMenu] = useState([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // Cart/Receipt State
  const [cart, setCart] = useState([]);

  // History & Management State
  const [savedBills, setSavedBills] = useState([]);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);

  // History Filter State
  const [filterBill, setFilterBill] = useState("");
  const [filterWaiter, setFilterWaiter] = useState("");
  const [filterTable, setFilterTable] = useState("");

  // Fetch Menu from API (Admin configured)
  useEffect(() => {
    API.get("/menu")
      .then((res) => setMenu(res.data))
      .catch(() => toast.error("Could not fetch menu options"))
      .finally(() => setLoading(false));
  }, []);

  // Compute Categories dynamically
  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    if (category === "all") return menu;
    return menu.filter((m) => m.category === category);
  }, [menu, category]);

  // Cart Logic (No prompts, intuitive row click or inline step adjustment)
  const addToCart = (item) => {
    if (!waiterName || !tableNumber) {
      toast.warning("Please configure Waiter name and Table number first!");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) {
        return prev.map((i) => (i._id === item._id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i._id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i._id !== id));

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

  // Print Handling & Saving to Local/Backend State
  const handlePrintSubmit = () => {
    if (!waiterName || !tableNumber || cart.length === 0) {
      toast.error("Complete your checkout specifications before printing");
      return;
    }
    setShowPrintModal(true);
  };

  const finalizeBillPrint = () => {
    const nextBillId = `#B${1000 + savedBills.length + 1}`;
    const newRecord = {
      billId: nextBillId,
      waiter: waiterName,
      table: tableNumber,
      items: [...cart],
      total: cartTotal,
      timestamp: new Date().toLocaleString(),
      status: "unpaid",
      voidReason: null,
    };

    setSavedBills([newRecord, ...savedBills]);
    setCart([]);
    setShowPrintModal(false);
    toast.success(`Receipt printed successfully for ${nextBillId}`);
  };

  // Void Bill Execution
  const handleConfirmVoid = () => {
    if (!voidReason.trim()) {
      toast.error("A validation reason is mandatory to void a generated bill");
      return;
    }
    setSavedBills((prev) =>
      prev.map((b) =>
        b.billId === voidTarget.billId ? { ...b, status: "void", voidReason } : b
      )
    );
    setVoidTarget(null);
    setVoidReason("");
    toast.info("Target bill status updated to VOID");
  };

  // Filtered History Array
  const processedHistory = useMemo(() => {
    return savedBills.filter((b) => {
      if (filterBill && !b.billId.toLowerCase().includes(filterBill.toLowerCase())) return false;
      if (filterWaiter && b.waiter !== filterWaiter) return false;
      if (filterTable && b.table !== filterTable) return false;
      return true;
    });
  }, [savedBills, filterBill, filterWaiter, filterTable]);

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      {/* Dynamic Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-stone-900 flex items-center gap-2">
              🧑‍🍳 RestoPOS <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider tracking-widest">Waiter Mode</span>
            </h1>
            <p className="text-xs text-stone-400">Direct ordering & localized instant table billing desk</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === "dashboard" ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              <LayoutDashboard size={16} /> POS Desk
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === "history" ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              <History size={16} /> Bill Records ({savedBills.length})
            </button>
          </div>
        </div>
      </header>

      {activeTab === "dashboard" ? (
        <div className="max-w-7xl mx-auto px-5 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main POS Interface Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dynamic Station Configuration Controls */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Assigned Server</label>
                <select
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select identity...</option>
                  <option value="John">John</option>
                  <option value="Mary">Mary</option>
                  <option value="Alex">Alex</option>
                  <option value="Rose">Rose</option>
                </select>
              </div>

              <div className="w-32">
                <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Table Destination</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="No."
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Menu Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    category === c ? "bg-orange-500 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>

            {/* Production Matrix Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {loading && <p className="text-stone-400 text-sm">Synchronizing production manifest...</p>}
              {!loading && filteredMenu.map((item) => (
                <button
                  key={item._id}
                  onClick={() => addToCart(item)}
                  className="bg-white border border-stone-200 hover:border-orange-400 rounded-xl p-3 text-left flex items-center gap-3 transition-all hover:shadow-sm group active:scale-95"
                >
                  <MenuImage src={item.imageUrl} alt={item.name} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm truncate group-hover:text-orange-600 transition-colors">{item.name}</h3>
                    <p className="text-orange-500 font-black text-xs mt-0.5">KSh {Number(item.price).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Ticket Sidebar Preview */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 h-fit sticky top-24 shadow-sm flex flex-col">
            <div className="border-b border-stone-100 pb-3 mb-4 flex items-center justify-between">
              <h2 className="font-black text-stone-900 text-md flex items-center gap-2">
                📋 Live Ticket Preview
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
                        <button onClick={() => changeQty(item._id, -1)} className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors">
                          <Minus size={10} />
                        </button>
                        <span className="w-5 text-center font-bold text-stone-800 text-xs">{item.qty}</span>
                        <button onClick={() => changeQty(item._id, 1)} className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors">
                          <Plus size={10} />
                        </button>
                        <button onClick={() => removeFromCart(item._id)} className="text-stone-300 hover:text-red-500 ml-1 transition-colors">
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
                  onClick={handlePrintSubmit}
                  className="mt-4 w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm"
                >
                  <Printer size={16} /> Disburse & Print Receipt
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Order History View Module */
        <div className="max-w-7xl mx-auto px-5 mt-6 space-y-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
            <input
              type="text"
              placeholder="Search Bill ID..."
              value={filterBill}
              onChange={(e) => setFilterBill(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 font-semibold text-stone-700"
            />
            <select
              value={filterWaiter}
              onChange={(e) => setFilterWaiter(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 font-semibold text-stone-700"
            >
              <option value="">All Waiters</option>
              <option value="John">John</option>
              <option value="Mary">Mary</option>
              <option value="Alex">Alex</option>
              <option value="Rose">Rose</option>
            </select>
            <input
              type="text"
              placeholder="Table Filter"
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-stone-50 font-semibold text-stone-700 w-28"
            />
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 uppercase font-bold border-b border-stone-200">
                    <th className="p-4">Bill Account</th>
                    <th className="p-4">Server</th>
                    <th className="p-4">Table</th>
                    <th className="p-4">Settled Amount</th>
                    <th className="p-4">Workflow Phase</th>
                    <th className="p-4 text-right">Operational Executions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {processedHistory.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-stone-400">No matching historical billing matches found</td>
                    </tr>
                  )}
                  {processedHistory.map((bill) => (
                    <tr key={bill.billId} className="hover:bg-stone-50/50">
                      <td className="p-4 font-bold text-stone-900">
                        {bill.billId}
                        <div className="text-[10px] text-stone-400 font-normal mt-0.5">{bill.timestamp}</div>
                      </td>
                      <td className="p-4">{bill.waiter}</td>
                      <td className="p-4 font-bold">Table {bill.table}</td>
                      <td className="p-4 text-stone-900 font-black">KSh {bill.total.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          bill.status === "void" ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
                        }`}>
                          {bill.status === "void" ? "Voided" : "Paid"}
                        </span>
                        {bill.status === "void" && (
                          <p className="text-[10px] text-red-400 italic mt-1 font-normal max-w-xs truncate">Reason: "{bill.voidReason}"</p>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {bill.status !== "void" && (
                          <button
                            onClick={() => setVoidTarget(bill)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Void Ticket
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Print Modal Dialog */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="mx-auto w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 border border-green-100">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-black text-stone-900 mb-1">Verify Thermal Print</h3>
            <p className="text-xs text-stone-400 mb-5">Confirm deployment payload destination to local receipt generation node?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintModal(false)} className="flex-1 border border-stone-200 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold text-stone-600 transition-colors">
                Abort
              </button>
              <button onClick={finalizeBillPrint} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-xs font-bold transition-colors shadow-sm shadow-green-200">
                Execute Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Reason Overlay Trigger Modal */}
      {voidTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm p-6 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-red-600 mb-3">
              <ShieldAlert size={20} />
              <h3 className="text-base font-black text-stone-900">Void Bill {voidTarget.billId}</h3>
            </div>
            <p className="text-xs text-stone-400 mb-4">Please input your auditing rationale code or validation reasons below. This action cannot be reversed.</p>
            
            <input
              type="text"
              placeholder="Enter void tracking reason here..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full text-xs font-semibold border border-stone-200 rounded-xl p-3 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 text-stone-800"
            />

            <div className="flex gap-3">
              <button onClick={() => { setVoidTarget(null); setVoidReason(""); }} className="flex-1 border border-stone-200 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold text-stone-600 text-center transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmVoid} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-xs font-bold text-center transition-colors shadow-sm">
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
