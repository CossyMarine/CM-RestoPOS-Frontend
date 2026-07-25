import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Unlock, LockKeyhole, Grid2x2, Grid3x3, LayoutGrid } from "lucide-react";
import API from "../../api/axios";

const GRID_SIZES = [
  { value: "small", label: "Small", icon: LayoutGrid },
  { value: "medium", label: "Medium", icon: Grid3x3 },
  { value: "large", label: "Large", icon: Grid2x2 },
  { value: "xlarge", label: "Extra Large", icon: Grid2x2 },
];

export default function WaiterSettingsPanel({ waiters, gridSize, onGridSizeChange }) {
  const [selectedId, setSelectedId] = useState("");
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("");
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

  const selectedWaiter = waiters.find((w) => w.id === selectedId);

  const fetchStatus = async (id) => {
    if (!id) return setShift(null);
    setLoading(true);
    try {
      const res = await API.get(`/shifts/waiter/${id}/status`);
      setShift(res.data);
    } catch {
      toast.error("Could not load shift status");
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(selectedId); }, [selectedId]);

  const handleOpen = async () => {
    setBusy(true);
    try {
      await API.post(`/shifts/waiter/${selectedId}/open`, { openingFloat: parseFloat(openingFloat) || 0 });
      toast.success(`${selectedWaiter.fullName}'s shift is open`);
      setShowOpen(false);
      setOpeningFloat("");
      fetchStatus(selectedId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not open shift");
    }
    setBusy(false);
  };

  const handleClose = async () => {
    setBusy(true);
    try {
      const res = await API.post(`/shifts/${shift._id}/close`, { closingCashCount: 0, tipsDeclared: 0 });
      setSummary(res.data);
      setShift(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not close shift");
    }
    setBusy(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 mt-6 space-y-6">
      {/* ---- Shift control ---- */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase text-stone-400 mb-3">Waiter Shift</h3>

        <label className="block text-xs font-bold text-stone-400 mb-1">Waiter</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-semibold mb-4"
        >
          <option value="">Select a waiter…</option>
          {waiters.map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
        </select>

        {selectedId && !loading && (
          <div className={`flex items-center justify-between gap-4 rounded-lg px-4 py-3 border ${
            shift ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {shift ? <Unlock size={16} className="text-emerald-600" /> : <LockKeyhole size={16} className="text-amber-600" />}
              {shift ? (
                <span className="text-emerald-700">Shift open · since {new Date(shift.createdAt).toLocaleTimeString()}</span>
              ) : (
                <span className="text-amber-700">Shift closed — cannot process orders</span>
              )}
            </div>
            {shift ? (
              <button onClick={handleClose} disabled={busy} className="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                {busy ? "Closing…" : "Close Shift"}
              </button>
            ) : (
              <button onClick={() => setShowOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                Open Shift
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- Menu grid size ---- */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase text-stone-400 mb-3">Menu Display Size</h3>
        <div className="grid grid-cols-4 gap-2">
          {GRID_SIZES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onGridSizeChange(value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-bold border transition-colors ${
                gridSize === value
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Open-shift float modal ---- */}
      {showOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-black text-gray-800 mb-4">Open Shift — {selectedWaiter?.fullName}</h3>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">Opening Float</label>
            <input
              type="number" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)}
              placeholder="0" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold">Cancel</button>
              <button onClick={handleOpen} disabled={busy} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-50">
                {busy ? "Opening…" : "Open Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Close-shift day summary modal ---- */}
      {summary && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-black text-gray-800 mb-1">Shift Summary</h3>
            <p className="text-xs text-stone-400 mb-5">{selectedWaiter?.fullName}'s day</p>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between"><span className="text-stone-500 text-sm">Today's Sale</span><span className="font-black">KSh {Number(summary.grandTotal).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-stone-500 text-sm">Today's Orders</span><span className="font-black">{summary.ordersCount}</span></div>
              <div className="flex justify-between"><span className="text-stone-500 text-sm">Today's Voids</span><span className="font-black text-red-500">{summary.voidCount}</span></div>
            </div>
            <button onClick={() => setSummary(null)} className="w-full py-3 rounded-xl bg-stone-900 text-white font-bold">Done</button>
          </div>
        </div>
      )}
    </div>
  );
            }
