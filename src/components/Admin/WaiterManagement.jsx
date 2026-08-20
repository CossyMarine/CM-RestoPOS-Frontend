import { useState, useEffect } from 'react';
import { RefreshCw, Search, Eye, Ban, CheckCircle2, Trash2, ListFilter, X, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import { formatKenyanDate, formatKenyanDateTime, formatKenyanTime } from '../../utils/formatDate';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Dropped' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'orders', label: 'Most Orders' },
  { value: 'sales', label: 'Highest Sales' },
  { value: 'void', label: 'Most Voids' },
];

function fmt(n) {
  return `KSh ${Number(n || 0).toLocaleString()}`;
}

export default function WaiterManagement() {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');

  // Tapping a waiter now swaps this whole panel to a detail "page" —
  // no longer a modal. null = show the list.
  const [selectedWaiter, setSelectedWaiter] = useState(null);

  const [dropTarget, setDropTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [working, setWorking] = useState(false);

  // Per-waiter selector settings modal
  const [selectorTarget, setSelectorTarget] = useState(null); // { id, fullName } of the row being configured
  const [selectorSettings, setSelectorSettings] = useState(null); // { selectorMode, visibleWaiters, allWaiters }
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [selectorSaving, setSelectorSaving] = useState(false);

  const fetchWaiters = async () => {
    setLoading(true);
    try {
      const res = await API.get('/waiters/management', { params: { search, status, sort } });
      setWaiters(res.data);
    } catch (err) {
      toast.error('Failed to load waiter performance data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchWaiters(); }, [status, sort]); // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(fetchWaiters, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openDetail = async (w) => {
    setSelectedWaiter({ fullName: w.fullName, loading: true });
    try {
      const res = await API.get(`/waiters/management/${w.id}`);
      setSelectedWaiter({ ...res.data, loading: false });
    } catch {
      toast.error('Could not load waiter detail');
      setSelectedWaiter(null);
    }
  };

  const confirmDrop = async () => {
    setWorking(true);
    try {
      const url = dropTarget.isActive
        ? `/waiters/management/${dropTarget.id}/drop`
        : `/waiters/management/${dropTarget.id}/restore`;
      await API.patch(url);
      toast.success(dropTarget.isActive ? 'Waiter dropped' : 'Waiter restored');
      setDropTarget(null);
      fetchWaiters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
    setWorking(false);
  };

  const confirmDelete = async () => {
    setWorking(true);
    try {
      await API.delete(`/waiters/management/${deleteTarget.id}`);
      toast.success('Waiter account removed');
      setDeleteTarget(null);
      fetchWaiters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
    setWorking(false);
  };

  // ---- Per-waiter selector settings ----
  const openSelectorFor = async (w) => {
    setSelectorTarget(w);
    setSelectorLoading(true);
    try {
      const res = await API.get(`/waiters/management/${w.id}/selector-settings`);
      setSelectorSettings(res.data);
    } catch {
      toast.error("Could not load this waiter's selector settings");
      setSelectorTarget(null);
    }
    setSelectorLoading(false);
  };

  const closeSelector = () => {
    setSelectorTarget(null);
    setSelectorSettings(null);
  };

  const setSelectorMode = (mode) => {
    setSelectorSettings((prev) => ({ ...prev, selectorMode: mode }));
  };

  const toggleSelectorWaiter = (id) => {
    setSelectorSettings((prev) => {
      const has = prev.visibleWaiters.includes(id);
      return {
        ...prev,
        visibleWaiters: has
          ? prev.visibleWaiters.filter((x) => x !== id)
          : [...prev.visibleWaiters, id],
      };
    });
  };

  const saveSelectorSettings = async () => {
    setSelectorSaving(true);
    try {
      await API.patch(`/waiters/management/${selectorTarget.id}/selector-settings`, {
        selectorMode: selectorSettings.selectorMode,
        visibleWaiters: selectorSettings.visibleWaiters,
      });
      toast.success(`Updated ${selectorTarget.fullName}'s dropdown`);
      closeSelector();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save selector settings');
    }
    setSelectorSaving(false);
  };

  // ---- Detail "page" (swaps in place of the list) ----
  if (selectedWaiter) {
    return (
      <div className="space-y-6 bg-gray-50 text-gray-800">
        <button
          onClick={() => setSelectedWaiter(null)}
          className="flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-600"
        >
          <ArrowLeft size={15} /> Back to Waiter Management
        </button>

        {selectedWaiter.loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-black text-gray-800">{selectedWaiter.fullName}</h2>
              <p className="text-sm text-gray-500">
                Waiter since {formatKenyanDate(selectedWaiter.waiterSince)} ·{' '}
                {selectedWaiter.waiterSource === 'promoted' ? 'Promoted from another role' : 'Added directly as waiter'}
                {' · '}Contact: {selectedWaiter.email || selectedWaiter.phone || '—'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Total Sales</p>
                <p className="text-xl font-black text-gray-800">{fmt(selectedWaiter.totalSales)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Total Orders</p>
                <p className="text-xl font-black text-gray-800">{selectedWaiter.totalOrders}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Total Voids</p>
                <p className="text-xl font-black text-red-500">{selectedWaiter.totalVoids}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <h4 className="p-4 text-xs font-bold uppercase text-gray-400 border-b border-gray-100">Shift History</h4>
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {(selectedWaiter.shiftHistory || []).length === 0 ? (
                  <p className="p-4 text-gray-400 text-sm">No shifts recorded yet.</p>
                ) : (
                  selectedWaiter.shiftHistory.map((s) => (
                    <div key={s._id} className="p-3 flex items-center justify-between text-sm">
                      <span className="text-gray-600">{formatKenyanDateTime(s.createdAt)}</span>
                      <span className="text-gray-400 text-xs">Float: {fmt(s.openingFloat)}</span>
                      <span className={`font-bold text-xs ${s.status === 'open' ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {s.status === 'open' ? 'Open' : `Closed ${formatKenyanTime(s.closedAt)}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <h4 className="p-4 text-xs font-bold uppercase text-gray-400 border-b border-gray-100">Recent Bills</h4>
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {(selectedWaiter.recentBills || []).length === 0 ? (
                  <p className="p-4 text-gray-400 text-sm">No bills yet.</p>
                ) : (
                  selectedWaiter.recentBills.map((b) => (
                    <div key={b._id} className="p-3 flex justify-between text-sm">
                      <span>{b.billId} · Table {b.tableNumber}</span>
                      <span className="font-semibold">{fmt(b.totalDue ?? b.subtotal)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gray-50 text-gray-800">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Waiter Management</h2>
          <p className="text-sm text-gray-500">Performance, void rate, and sales per waiter — plus who each waiter sees on their own order-taking dropdown</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWaiters}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search waiter by name..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setStatus(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    status === t.value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:text-orange-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-400 font-semibold border-b border-gray-100">
                <th className="p-3">Waiter</th>
                <th className="p-3">Since</th>
                <th className="p-3">Source</th>
                <th className="p-3 text-center">Today</th>
                <th className="p-3 text-center">Week</th>
                <th className="p-3 text-center">Month</th>
                <th className="p-3 text-center">Year</th>
                <th className="p-3">Total Sold</th>
                <th className="p-3">Voids</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {waiters.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-gray-400 font-medium">No waiters found</td></tr>
              ) : (
                waiters.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => openDetail(w)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-bold text-gray-800">{w.fullName}</td>
                    <td className="p-3 text-xs text-gray-400">{formatKenyanDate(w.waiterSince)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                        w.waiterSource === 'promoted' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {w.waiterSource === 'promoted' ? 'Promoted' : 'Direct'}
                      </span>
                    </td>
                    <td className="p-3 text-center">{w.ordersToday}</td>
                    <td className="p-3 text-center">{w.ordersWeek}</td>
                    <td className="p-3 text-center">{w.ordersMonth}</td>
                    <td className="p-3 text-center">{w.ordersYear}</td>
                    <td className="p-3 font-semibold text-gray-800">{fmt(w.totalBalanceSold)}</td>
                    <td className="p-3">
                      {w.totalVoidCount > 0 ? (
                        <span className="text-red-500 font-bold text-xs">{w.totalVoidCount} · {fmt(w.totalVoidAmount)}</span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="p-3">
                      {w.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={13} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-bold"><Ban size={13} /> Dropped</span>
                      )}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openDetail(w)} className="text-gray-400 hover:text-orange-500" title="View"><Eye size={15} /></button>
                        <button
                          onClick={() => openSelectorFor(w)}
                          className="text-gray-400 hover:text-orange-500"
                          title="Configure this waiter's own dropdown"
                        >
                          <ListFilter size={15} />
                        </button>
                        <button
                          onClick={() => setDropTarget(w)}
                          className={`text-xs font-bold ${w.isActive ? 'text-red-500 hover:text-red-600' : 'text-emerald-600 hover:text-emerald-700'}`}
                        >
                          {w.isActive ? 'Drop' : 'Restore'}
                        </button>
                        <button onClick={() => setDeleteTarget(w)} className="text-gray-400 hover:text-red-500" title="Delete permanently">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-waiter selector settings modal */}
      {selectorTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-800">{selectorTarget.fullName}'s Dropdown</h3>
                <p className="text-xs text-gray-400">Who {selectorTarget.fullName} sees when they log in and open the waiter selector</p>
              </div>
              <button onClick={closeSelector}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-5 space-y-4">
              {selectorLoading || !selectorSettings ? (
                <p className="text-gray-400 text-sm">Loading…</p>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSelectorMode('all')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                        selectorSettings.selectorMode === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      All active waiters
                    </button>
                    <button
                      onClick={() => setSelectorMode('custom')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                        selectorSettings.selectorMode === 'custom' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      Custom list only
                    </button>
                  </div>

                  {selectorSettings.selectorMode === 'custom' && (
                    <div className="space-y-1 border border-gray-100 rounded-lg p-2 max-h-64 overflow-y-auto">
                      <p className="text-[11px] text-gray-400 px-1 pb-1">
                        {selectorTarget.fullName} will always see themselves too — pick who else shows up.
                      </p>
                      {selectorSettings.allWaiters.length === 0 ? (
                        <p className="text-gray-400 text-sm p-2">No other waiters yet.</p>
                      ) : (
                        selectorSettings.allWaiters.map((w) => (
                          <label key={w.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <span className={`text-sm font-semibold ${!w.isActive ? 'text-gray-300' : 'text-gray-700'}`}>
                              {w.fullName} {!w.isActive && <span className="text-[10px] font-bold text-red-400 ml-1">(dropped)</span>}
                            </span>
                            <input
                              type="checkbox"
                              checked={selectorSettings.visibleWaiters.includes(w.id)}
                              onChange={() => toggleSelectorWaiter(w.id)}
                              className="w-4 h-4 accent-orange-500"
                            />
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  <button
                    onClick={saveSelectorSettings}
                    disabled={selectorSaving}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    {selectorSaving ? 'Saving…' : 'Save Settings'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!dropTarget}
        title={dropTarget?.isActive ? 'Drop this waiter?' : 'Restore this waiter?'}
        description={
          dropTarget?.isActive
            ? `${dropTarget?.fullName} will be deactivated and removed from every waiter's order-taking dropdown. Their history is kept.`
            : `${dropTarget?.fullName} will be reactivated and reappear on order-taking dropdowns.`
        }
        confirmLabel={dropTarget?.isActive ? 'Drop' : 'Restore'}
        tone={dropTarget?.isActive ? 'danger' : 'default'}
        loading={working}
        onConfirm={confirmDrop}
        onClose={() => setDropTarget(null)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Permanently delete this waiter account?"
        description={`This removes ${deleteTarget?.fullName}'s account entirely. Past bills/orders stay on record but will show as an unlinked name. This can't be undone.`}
        confirmLabel="Delete Permanently"
        tone="danger"
        loading={working}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
                                                                  }
