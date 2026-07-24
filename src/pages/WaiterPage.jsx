import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import API from "../api/axios";
import { useAuth } from "../hooks/useAuth";

import WaiterHeader from "../components/Waiter/WaiterHeader";
import StationConfig from "../components/Waiter/StationConfig";
import OnlineOrdersBar from "../components/Waiter/OnlineOrdersBar";
import OnlineOrdersPanel from "../components/Waiter/OnlineOrdersPanel";
import MenuSearchBar from "../components/Waiter/MenuSearchBar";
import MenuGrid from "../components/Waiter/MenuGrid";
import CartPanel from "../components/Waiter/CartPanel";
import PrintConfirmModal from "../components/Waiter/PrintConfirmModal";
import VoidReasonModal from "../components/Waiter/VoidReasonModal";
import BillHistoryPanel from "../components/Waiter/BillHistoryPanel";
import AddItemsModal from "../components/Waiter/AddItemsModal";
import ViewBillModal from "../components/Waiter/ViewBillModal";
import TakeOrderModal from "../components/Waiter/TakeOrderModal";
import PrintReceipt from "../components/PrintReceipt";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");

function firstNameOf(name) {
  return name ? name.trim().split(" ")[0] : "Guest";
}

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");

  const [waiters, setWaiters] = useState([]);
  const [waiterName, setWaiterName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [assumeTableWaiter, setAssumeTableWaiter] = useState(false);

  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);

  const [onlineOrders, setOnlineOrders] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);

  const [billHistory, setBillHistory] = useState({ receipts: [], page: 1, totalPages: 1, total: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);
  const [printTarget, setPrintTarget] = useState(null);

  const [voidTarget, setVoidTarget] = useState(null);
  const [addItemsTarget, setAddItemsTarget] = useState(null);
  const [addItemsBusy, setAddItemsBusy] = useState(false);

  const [viewTarget, setViewTarget] = useState(null);

  const [takeOrderTarget, setTakeOrderTarget] = useState(null);
  const [takeOrderBusy, setTakeOrderBusy] = useState(false);

  // ---- Initial data ----
  useEffect(() => {
    API.get("/menu")
      .then((res) => setMenu(res.data))
      .catch(() => toast.error("Could not load the menu"))
      .finally(() => setMenuLoading(false));

    API.get("/auth/waiters")
      .then((res) => setWaiters(res.data))
      .catch(() => toast.error("Could not load waiter list"));

    API.get("/orders/pending")
      .then((res) => {
        const online = (res.data || [])
          .filter((o) => o.source === "online")
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOnlineOrders(online);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    API.get("/settings/public")
      .then((res) => {
        const on = !!res.data.assumeTableNumberWaiter;
        setAssumeTableWaiter(on);
        if (on) setTableNumber("N/A");
      })
      .catch(() => {});
  }, []);

  // ---- Real-time online order events ----
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("order:created", (payload) => {
      const order = payload.order;
      if (order?.source !== "online") return;
      setOnlineOrders((prev) => [order, ...prev.filter((o) => o._id !== order._id)]);
      setUnseenCount((c) => c + 1);
      toast.info(`New online order — ${firstNameOf(order.customerName)}, Table ${order.tableNumber}`);
    });

    socket.on("order:updated", (order) => {
      if (order?.source !== "online") return;
      if (order.status === "completed") {
        toast.success(`Online order for Table ${order.tableNumber} has been served`);
        setOnlineOrders((prev) => prev.filter((o) => o._id !== order._id));
      } else if (order.status === "cancelled") {
        setOnlineOrders((prev) => prev.filter((o) => o._id !== order._id));
      } else {
        setOnlineOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...order } : o)));
      }
    });

    // Keep Bill Records status in sync the moment a void request is approved elsewhere.
    socket.on("voidRequest:approved", () => {
      fetchHistory(historyPage, historySearch);
    });

    socket.on("receipt:updated", (receipt) => {
      setBillHistory((prev) => ({
        ...prev,
        receipts: prev.receipts.map((r) => (r._id === receipt._id ? { ...r, ...receipt } : r)),
      }));
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, historySearch]);

  // ---- Bill history ----
  // Shows ALL bills (every waiter) by default when no waiter is selected;
  // narrows to a single waiter's history once one is chosen.
  const fetchHistory = useCallback(
    async (page = 1, q = "") => {
      setHistoryLoading(true);
      try {
        const url = waiterName
          ? `/receipts/waiter/${encodeURIComponent(waiterName)}/history`
          : `/receipts/history`;
        const res = await API.get(url, {
          params: { page, limit: 4, q: q || undefined },
        });
        setBillHistory(res.data);
      } catch {
        toast.error("Could not load bill history");
      } finally {
        setHistoryLoading(false);
      }
    },
    [waiterName]
  );

  // Always keep bill history (and therefore the Bill Records count) in sync,
  // regardless of which tab is active — not just when viewing "history".
  useEffect(() => {
    fetchHistory(historyPage, historySearch);
  }, [historyPage, historySearch, fetchHistory]);

  useEffect(() => {
    setHistoryPage(1);
    fetchHistory(1, historySearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiterName]);

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [menu]);

  // ---- Cart ----
  const addToCart = (item) => {
    if (!waiterName || (!assumeTableWaiter && !tableNumber)) {
      toast.warning("Select the assigned server and table number first");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) return prev.map((i) => (i._id === item._id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) => prev.map((i) => (i._id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i._id !== id));

  // ---- Pinning ----
  const togglePin = async (item) => {
    try {
      const res = await API.patch(`/menu/${item._id}/pin`, { pinned: !item.pinned });
      setMenu((prev) => prev.map((m) => (m._id === item._id ? res.data : m)));
    } catch {
      toast.error("Could not update pin status");
    }
  };

  const reorderPinned = async (orderedIds) => {
    setMenu((prev) => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((m) => (orderMap.has(m._id) ? { ...m, pinOrder: orderMap.get(m._id) } : m));
    });
    try {
      const res = await API.put("/menu/reorder-pinned", { orderedIds });
      setMenu(res.data);
    } catch {
      toast.error("Could not save pin order");
    }
  };

  // ---- Print / submit ----
  const handlePrintSubmit = () => {
    if (!waiterName || (!assumeTableWaiter && !tableNumber) || cart.length === 0) {
      toast.error("Complete server, table, and item selections before printing");
      return;
    }
    setShowPrintModal(true);
  };

  const runPrint = (receipt) => {
    setPrintTarget(receipt);
    setTimeout(() => {
      window.print();
      API.patch(`/receipts/${receipt._id}/print`).catch(() => {});
    }, 150);
  };

  const finalizeBillPrint = async () => {
    setPrintBusy(true);
    try {
      const items = cart.map((i) => ({
        menuItemId: i._id,
        mealName: i.name,
        imageUrl: i.imageUrl || null,
        quantity: i.qty,
        unitPrice: Number(i.price),
        lineTotal: i.qty * Number(i.price),
     }));
      const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

      const res = await API.post("/orders", { tableNumber, waiterName, items, subtotal });
      const { receipt } = res.data;

      setCart([]);
      setShowPrintModal(false);
      toast.success(`Order submitted to kitchen — ${receipt.billId}`);
      runPrint(receipt);

      // Refresh bill history/count unconditionally so "Bill Records" updates
      // even while the waiter stays on the POS Desk tab.
      fetchHistory(historyPage, historySearch);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit order");
    } finally {
      setPrintBusy(false);
    }
  };

  // ---- Void request ----
  const submitVoidRequest = async (reason) => {
    try {
      await API.post("/void-requests", { receiptId: voidTarget._id, reason });
      toast.info("Void request submitted for admin approval");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit void request");
    } finally {
      setVoidTarget(null);
    }
  };

  // ---- Add items to a bill in progress ----
  const openAddItems = async (bill) => {
    try {
      const res = await API.get(`/receipts/${bill._id}`);
      setAddItemsTarget(res.data);
    } catch {
      toast.error("Could not load bill");
    }
  };

  const submitAddItems = async (receiptId, items) => {
    setAddItemsBusy(true);
    try {
      const res = await API.patch(`/receipts/${receiptId}/items`, { items });
      toast.success("Items added to bill");
      setAddItemsTarget(null);
      fetchHistory(historyPage, historySearch);
      runPrint(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add items");
    } finally {
      setAddItemsBusy(false);
    }
  };

  // ---- View a bill's item list ----
  const openViewBill = async (bill) => {
    try {
      const res = await API.get(`/receipts/${bill._id}`);
      setViewTarget(res.data);
    } catch {
      toast.error("Could not load bill");
    }
  };

  // ---- Claim an online order (opens waiter-select modal) ----
  const openTakeOrder = (order) => {
    setTakeOrderTarget(order);
  };

  const confirmTakeOrder = async (selectedWaiterName) => {
    if (!takeOrderTarget) return;
    setTakeOrderBusy(true);
    try {
      await API.patch(`/orders/${takeOrderTarget._id}/assign`, { waiterName: selectedWaiterName });
      setOnlineOrders((prev) => prev.filter((o) => o._id !== takeOrderTarget._id));
      toast.success(`Order for Table ${takeOrderTarget.tableNumber} assigned to ${selectedWaiterName}`);
      setTakeOrderTarget(null);
      fetchHistory(historyPage, historySearch);
      setActiveTab("history");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not claim this order");
    } finally {
      setTakeOrderBusy(false);
    }
  };

  const printBill = async (bill) => {
    try {
      const res = await API.get(`/receipts/${bill._id}`);
      runPrint(res.data);
    } catch {
      toast.error("Could not load bill for printing");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <WaiterHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        billCount={billHistory.total}
        onlineCount={onlineOrders.length}
        unseenCount={unseenCount}
        onBellClick={() => {
          setUnseenCount(0);
          setActiveTab("online");
        }}
        onLogout={handleLogout}
      />

      {activeTab === "dashboard" && (
        <OnlineOrdersBar orders={onlineOrders} onView={() => setActiveTab("online")} />
      )}

      {activeTab === "dashboard" && (
        <div className="max-w-7xl mx-auto px-5 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <StationConfig
              waiters={waiters}
              waiterName={waiterName}
              onWaiterChange={setWaiterName}
              tableNumber={tableNumber}
              onTableChange={setTableNumber}
            />
            <MenuSearchBar value={search} onChange={setSearch} />
            <MenuGrid
              menu={menu}
              loading={menuLoading}
              search={search}
              category={category}
              categories={categories}
              onCategoryChange={setCategory}
              cart={cart}
              onAdd={addToCart}
              onTogglePin={togglePin}
              onReorderPinned={reorderPinned}
            />
          </div>

          <CartPanel
            cart={cart}
            waiterName={waiterName}
            tableNumber={tableNumber}
            onChangeQty={changeQty}
            onRemove={removeFromCart}
            onSubmit={handlePrintSubmit}
          />
        </div>
      )}

      {activeTab === "online" && (
        <OnlineOrdersPanel orders={onlineOrders} menu={menu} onTake={openTakeOrder} />
      )}

      {activeTab === "history" && (
        <BillHistoryPanel
          receipts={billHistory.receipts}
          page={billHistory.page}
          totalPages={billHistory.totalPages}
          total={billHistory.total}
          loading={historyLoading}
          search={historySearch}
          showWaiterColumn={!waiterName}
          onSearchChange={(v) => {
            setHistorySearch(v);
            setHistoryPage(1);
          }}
          onPageChange={setHistoryPage}
          onPrint={printBill}
          onAddItems={openAddItems}
          onRequestVoid={setVoidTarget}
          onView={openViewBill}
        />
      )}

      <PrintConfirmModal
        open={showPrintModal}
        busy={printBusy}
        onCancel={() => setShowPrintModal(false)}
        onConfirm={finalizeBillPrint}
      />

      <VoidReasonModal target={voidTarget} onCancel={() => setVoidTarget(null)} onConfirm={submitVoidRequest} />

      <AddItemsModal
        bill={addItemsTarget}
        menu={menu}
        busy={addItemsBusy}
        onCancel={() => setAddItemsTarget(null)}
        onSubmit={submitAddItems}
      />

      <ViewBillModal bill={viewTarget} onClose={() => setViewTarget(null)} />

      <TakeOrderModal
        order={takeOrderTarget}
        waiters={waiters}
        busy={takeOrderBusy}
        onCancel={() => setTakeOrderTarget(null)}
        onConfirm={confirmTakeOrder}
      />

      <PrintReceipt
        receipt={
          printTarget && {
            billId: printTarget.billId,
            tableNumber: printTarget.tableNumber,
            waiterName: printTarget.waiterName,
            items: printTarget.items,
            subtotal: printTarget.subtotal,
            createdAt: printTarget.createdAt,
          }
        }
      />
    </div>
  );
                               }
