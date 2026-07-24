import { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, Flame, RefreshCw, Search } from 'lucide-react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/formatDate';

function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}

function StatCard({ icon: Icon, label, value, tint }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint}`}>
                <Icon size={20} />
            </div>
            <div>
                <div className="text-2xl font-black text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 font-semibold">{label}</div>
            </div>
        </div>
    );
}

export default function KitchenManagement() {
    const [tab, setTab] = useState('live'); // 'live' | 'history' | 'settings'

    const [pending, setPending] = useState([]);
    const [stats, setStats] = useState({ servedToday: 0, avgPrepSeconds: 0 });
    const [loadingLive, setLoadingLive] = useState(true);

    const [settings, setSettings] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const [history, setHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: '', status: '', waiterName: '', tableNumber: '', startDate: '', endDate: '',
    });
    const [detailOrder, setDetailOrder] = useState(null);

    const loadLive = useCallback(async () => {
        setLoadingLive(true);
        try {
            const [pendingRes, statsRes] = await Promise.all([
                API.get('/orders/pending'),
                API.get('/orders/kitchen/stats'),
            ]);
            setPending(pendingRes.data || []);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to load kitchen overview', err);
            toast.error('Could not load kitchen overview');
        } finally {
            setLoadingLive(false);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        try {
            const res = await API.get('/kitchen-settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to load kitchen settings', err);
        }
    }, []);

    const loadHistory = useCallback(async (page = 1) => {
        setHistoryLoading(true);
        try {
            const params = { page, limit: 25 };
            Object.entries(filters).forEach(([k, v]) => {
                if (v) params[k] = v;
            });
            const res = await API.get('/orders/history', { params });
            setHistory(res.data.orders || []);
            setHistoryPage(res.data.page);
            setHistoryTotalPages(res.data.totalPages);
            setHistoryTotal(res.data.total);
        } catch (err) {
            console.error('Failed to load order history', err);
            toast.error('Could not load order history');
        } finally {
            setHistoryLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        loadLive();
        loadSettings();
    }, [loadLive, loadSettings]);

    useEffect(() => {
        if (tab === 'history') loadHistory(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const saveSettings = async () => {
        if (!settings) return;
        setSavingSettings(true);
        try {
            const res = await API.patch('/kitchen-settings', settings);
            setSettings(res.data);
            toast.success('Kitchen settings saved');
        } catch (err) {
            console.error('Failed to save kitchen settings', err);
            toast.error('Could not save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const applyFilters = () => loadHistory(1);
    const clearFilters = () => {
        setFilters({ search: '', status: '', waiterName: '', tableNumber: '', startDate: '', endDate: '' });
        setTimeout(() => loadHistory(1), 0);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <ChefHat className="text-orange-500" /> Kitchen Management
                    </h1>
                    <p className="text-sm text-gray-500">Monitor the live queue, review history, and configure the kitchen display.</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    {[
                        { key: 'live', label: 'Overview' },
                        { key: 'history', label: 'History' },
                        { key: 'settings', label: 'Settings' },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                                tab === t.key ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'live' && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <StatCard icon={Flame} label="Orders in kitchen right now" value={pending.length} tint="bg-orange-100 text-orange-600" />
                        <StatCard icon={ChefHat} label="Served today" value={stats.servedToday} tint="bg-green-100 text-green-600" />
                        <StatCard icon={Clock} label="Avg. time to serve today" value={formatDuration(stats.avgPrepSeconds)} tint="bg-blue-100 text-blue-600" />
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">Currently in the kitchen</h2>
                            <button
                                onClick={loadLive}
                                className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
                            >
                                <RefreshCw size={14} className={loadingLive ? 'animate-spin' : ''} /> Refresh
                            </button>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-5 py-3">Table</th>
                                    <th className="text-left px-5 py-3">Waiter / Source</th>
                                    <th className="text-left px-5 py-3">Items</th>
                                    <th className="text-left px-5 py-3">Placed</th>
                                    <th className="text-left px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {!loadingLive && pending.length === 0 && (
                                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Kitchen queue is empty.</td></tr>
                                )}
                                {pending.map((o) => {
                                    const readyCount = (o.items || []).filter((it) => it.ready).length;
                                    return (
                                        <tr key={o._id}>
                                            <td className="px-5 py-3 font-bold text-orange-600">{o.tableNumber}</td>
                                            <td className="px-5 py-3">{o.waiterName || 'Online order'}</td>
                                            <td className="px-5 py-3 text-gray-500">
                                                {(o.items || []).map((it) => `${it.mealName} ×${it.quantity}`).join(', ')}
                                            </td>
                                            <td className="px-5 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                                            <td className="px-5 py-3">
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                    {readyCount}/{(o.items || []).length} items ready
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'history' && (
                <div>
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-gray-500 font-semibold block mb-1">Search</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                                    placeholder="Waiter, table, item..."
                                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold block mb-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold block mb-1">Waiter</label>
                            <input
                                type="text"
                                value={filters.waiterName}
                                onChange={(e) => setFilters((f) => ({ ...f, waiterName: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold block mb-1">Table</label>
                            <input
                                type="text"
                                value={filters.tableNumber}
                                onChange={(e) => setFilters((f) => ({ ...f, tableNumber: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold block mb-1">From</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold block mb-1">To</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <button onClick={applyFilters} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg text-sm">
                            Apply
                        </button>
                        <button onClick={clearFilters} className="text-gray-500 hover:text-gray-800 text-sm font-semibold px-2 py-2">
                            Clear
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-5 py-3">Table</th>
                                    <th className="text-left px-5 py-3">Waiter / Source</th>
                                    <th className="text-left px-5 py-3">Items</th>
                                    <th className="text-left px-5 py-3">Placed</th>
                                    <th className="text-left px-5 py-3">Prep Time</th>
                                    <th className="text-left px-5 py-3">Status</th>
                                    <th className="text-left px-5 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {historyLoading && (
                                    <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
                                )}
                                {!historyLoading && history.length === 0 && (
                                    <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No orders match these filters.</td></tr>
                                )}
                                {!historyLoading && history.map((o) => (
                                    <tr key={o._id} className="hover:bg-gray-50">
                                        <td className="px-5 py-3 font-bold text-orange-600">{o.tableNumber}</td>
                                        <td className="px-5 py-3">{o.waiterName || o.customerName || 'Online'}</td>
                                        <td className="px-5 py-3 text-gray-500">
                                            {(o.items || []).slice(0, 2).map((it) => it.mealName).join(', ')}
                                            {o.items && o.items.length > 2 ? ` +${o.items.length - 2} more` : ''}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                                        <td className="px-5 py-3 text-gray-500">{formatDuration(o.prepSeconds)}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                o.status === 'completed' ? 'bg-green-100 text-green-700'
                                                    : o.status === 'cancelled' ? 'bg-red-100 text-red-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <button onClick={() => setDetailOrder(o)} className="text-orange-600 hover:text-orange-700 font-semibold">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                        <span>{historyTotal} orders total</span>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={historyPage <= 1}
                                onClick={() => loadHistory(historyPage - 1)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <span>Page {historyPage} of {historyTotalPages}</span>
                            <button
                                disabled={historyPage >= historyTotalPages}
                                onClick={() => loadHistory(historyPage + 1)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'settings' && settings && (
                <div className="max-w-2xl space-y-6">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-900 mb-3">Queue Order</h3>
                        <div className="flex gap-3">
                            {['oldest', 'newest'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSettings((d) => ({ ...d, sortOrder: opt }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                        settings.sortOrder === opt ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {opt === 'oldest' ? 'Oldest first (default)' : 'Newest first'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-900 mb-1">Serve Confirmation</h3>
                        <p className="text-xs text-gray-500 mb-3">
                            When on (default), a cook must tap "Serve Order" to clear a ticket. When off, a ticket
                            clears itself automatically once every item on it is checked ready.
                        </p>
                        <button
                            onClick={() => setSettings((d) => ({ ...d, requireClickToServe: !d.requireClickToServe }))}
                            className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                settings.requireClickToServe ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {settings.requireClickToServe ? 'Require click to serve: ON' : 'Require click to serve: OFF'}
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-900 mb-3">Card Size</h3>
                        <div className="flex gap-3">
                            {['small', 'medium', 'large'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSettings((d) => ({ ...d, cardSize: opt }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize ${
                                        settings.cardSize === opt ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-900 mb-3">Sound</h3>
                        <button
                            onClick={() => setSettings((d) => ({ ...d, soundEnabled: !d.soundEnabled }))}
                            className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                settings.soundEnabled ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {settings.soundEnabled ? 'Alarm sound: ON' : 'Alarm sound: OFF'}
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-900 mb-3">Urgency Thresholds (minutes)</h3>
                        <div className="flex gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">Late (yellow)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={settings.lateThresholdMinutes}
                                    onChange={(e) => setSettings((d) => ({ ...d, lateThresholdMinutes: Number(e.target.value) }))}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">Critical (red)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={settings.criticalThresholdMinutes}
                                    onChange={(e) => setSettings((d) => ({ ...d, criticalThresholdMinutes: Number(e.target.value) }))}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl"
                    >
                        {savingSettings ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            )}

            {detailOrder && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setDetailOrder(null)}>
                    <div
                        className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Table</div>
                                <div className="text-3xl font-black text-orange-600">{detailOrder.tableNumber}</div>
                            </div>
                            <button onClick={() => setDetailOrder(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                                <div className="text-gray-400 text-xs font-semibold">Waiter / Source</div>
                                <div className="font-semibold text-gray-900">{detailOrder.waiterName || detailOrder.customerName || 'Online order'}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs font-semibold">Status</div>
                                <div className="font-semibold text-gray-900 capitalize">{detailOrder.status}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs font-semibold">Placed</div>
                                <div className="font-semibold text-gray-900">{formatDate(detailOrder.createdAt)}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs font-semibold">Time to Serve</div>
                                <div className="font-semibold text-gray-900">{formatDuration(detailOrder.prepSeconds)}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {(detailOrder.items || []).map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                                    <span className="font-semibold text-gray-900 flex-1">{item.mealName}</span>
                                    <span className="font-black text-orange-600">×{item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    }
