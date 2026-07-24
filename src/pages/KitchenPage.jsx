import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { UtensilsCrossed } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatDate';

// Socket.IO runs on the same server as the API, so this reuses the
// same env var API.js's baseURL is built from — just without the /api suffix.
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const CARD_SIZE_CONFIG = {
    small:  { grid: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5', img: 'h-14', name: 'text-sm', qty: 'text-base', table: 'text-4xl' },
    medium: { grid: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', img: 'h-20', name: 'text-xl', qty: 'text-2xl', table: 'text-6xl' },
    large:  { grid: 'grid-cols-1 md:grid-cols-2', img: 'h-28', name: 'text-2xl', qty: 'text-3xl', table: 'text-7xl' },
};

function ItemImage({ src, alt, className }) {
    const [broken, setBroken] = useState(false);
    if (!src || broken) {
        return (
            <div className={`${className} rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0`}>
                <UtensilsCrossed size={20} className="text-gray-600" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setBroken(true)}
            className={`${className} rounded-lg object-cover border border-gray-700 shrink-0`}
        />
    );
}

function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}

export default function KitchenPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history' | 'settings'

    const [orders, setOrders] = useState([]);
    const [newOrderIds, setNewOrderIds] = useState(new Set()); // orders not yet acknowledged
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [now, setNow] = useState(Date.now()); // ticks every second so elapsed time is live

    const [settings, setSettings] = useState({
        sortOrder: 'oldest',
        requireClickToServe: true,
        cardSize: 'medium',
        soundEnabled: true,
        lateThresholdMinutes: 8,
        criticalThresholdMinutes: 15,
    });
    const [settingsDraft, setSettingsDraft] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const [stats, setStats] = useState({ servedToday: 0, avgPrepSeconds: 0 });

    const [historyOrders, setHistoryOrders] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        search: '', status: '', waiterName: '', tableNumber: '', startDate: '', endDate: '',
    });
    const [detailOrder, setDetailOrder] = useState(null);

    const audioCtxRef = useRef(null);
    const alarmIntervalRef = useRef(null);

    // ---- Live clock tick ----
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    // ---- Alarm: generate a sharp repeating beep with Web Audio, no file needed ----
    const playBeep = useCallback(() => {
        if (!settings.soundEnabled) return;
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const nowT = ctx.currentTime;
            [880, 1108].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, nowT + i * 0.18);
                gain.gain.exponentialRampToValueAtTime(0.3, nowT + i * 0.18 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, nowT + i * 0.18 + 0.16);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(nowT + i * 0.18);
                osc.stop(nowT + i * 0.18 + 0.2);
            });
        } catch (err) {
            console.error('Audio alarm failed', err);
        }
    }, [settings.soundEnabled]);

    const startAlarmLoop = useCallback(() => {
        if (alarmIntervalRef.current) return;
        playBeep();
        alarmIntervalRef.current = setInterval(playBeep, 1500);
    }, [playBeep]);

    const stopAlarmLoop = useCallback(() => {
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
    }, []);

    // ---- Initial load ----
    const loadInitialOrders = useCallback(async () => {
        try {
            const res = await API.get('/orders/pending');
            setOrders(res.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch pending orders', err);
            setError('Could not load existing orders.');
        }
    }, []);

    const loadSettings = useCallback(async () => {
        try {
            const res = await API.get('/kitchen-settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch kitchen settings', err);
        }
    }, []);

    const loadStats = useCallback(async () => {
        try {
            const res = await API.get('/orders/kitchen/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch kitchen stats', err);
        }
    }, []);

    const loadHistory = useCallback(async (page = 1) => {
        setHistoryLoading(true);
        try {
            const params = { page, limit: 25 };
            Object.entries(historyFilters).forEach(([k, v]) => {
                if (v) params[k] = v;
            });
            const res = await API.get('/orders/history', { params });
            setHistoryOrders(res.data.orders || []);
            setHistoryPage(res.data.page);
            setHistoryTotalPages(res.data.totalPages);
            setHistoryTotal(res.data.total);
        } catch (err) {
            console.error('Failed to fetch order history', err);
            toast.error('Could not load order history');
        } finally {
            setHistoryLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyFilters]);

    // ---- Real-time updates via Socket.IO ----
    useEffect(() => {
        loadInitialOrders();
        loadSettings();
        loadStats();

        const socket = io(SOCKET_URL);
        socket.emit('join_room', 'kitchen');

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        // Server emits: { order, receipt, source }
        socket.on('order:created', (payload) => {
            const newOrder = payload.order;

            setOrders((prev) => {
                if (prev.some((o) => o._id === newOrder._id)) return prev;
                return [...prev, newOrder];
            });
            setNewOrderIds((prev) => new Set(prev).add(newOrder._id));
            startAlarmLoop();
        });

        // Server emits the updated order document whenever status/items change
        socket.on('order:updated', (updatedOrder) => {
            if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
                setOrders((prev) => prev.filter((o) => o._id !== updatedOrder._id));
                setNewOrderIds((prev) => {
                    const next = new Set(prev);
                    next.delete(updatedOrder._id);
                    return next;
                });
                loadStats();
            } else {
                setOrders((prev) =>
                    prev.map((o) => (o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o))
                );
            }
        });

        socket.on('kitchen:settings_updated', (updated) => setSettings(updated));

        return () => {
            socket.disconnect();
            stopAlarmLoop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadInitialOrders, loadSettings, loadStats, startAlarmLoop, stopAlarmLoop]);

    useEffect(() => {
        if (newOrderIds.size === 0) stopAlarmLoop();
    }, [newOrderIds, stopAlarmLoop]);

    useEffect(() => {
        if (activeTab === 'history') loadHistory(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'settings') setSettingsDraft(settings);
    }, [activeTab, settings]);

    const acknowledgeOrder = (orderId) => {
        setNewOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
        });
    };

    const acknowledgeAll = () => setNewOrderIds(new Set());

    const markDone = async (orderId) => {
        acknowledgeOrder(orderId);
        try {
            await API.patch(`/orders/${orderId}/status`, { status: 'completed' });
            setOrders((prev) => prev.filter((o) => o._id !== orderId));
            loadStats();
        } catch (err) {
            console.error('Failed to update order status', err);
            toast.error('Could not mark order as done. Please try again.');
        }
    };

    const toggleItemReady = async (order, itemIndex) => {
        const nextReady = !order.items[itemIndex].ready;

        // Optimistic update
        setOrders((prev) =>
            prev.map((o) => {
                if (o._id !== order._id) return o;
                const items = o.items.map((it, i) => (i === itemIndex ? { ...it, ready: nextReady } : it));
                return { ...o, items };
            })
        );

        try {
            await API.patch(`/orders/${order._id}/items/${itemIndex}/ready`, { ready: nextReady });

            const allReady = order.items.every((it, i) => (i === itemIndex ? nextReady : it.ready));
            if (allReady && !settings.requireClickToServe) {
                markDone(order._id);
            }
        } catch (err) {
            console.error('Failed to toggle item', err);
            toast.error('Could not update item');
        }
    };

    const minutesAgo = (createdAt) => Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));

    const sortedOrders = useMemo(() => {
        const copy = [...orders];
        copy.sort((a, b) => {
            const diff = new Date(a.createdAt) - new Date(b.createdAt);
            return settings.sortOrder === 'newest' ? -diff : diff;
        });
        return copy;
    }, [orders, settings.sortOrder]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const saveSettings = async () => {
        if (!settingsDraft) return;
        setSavingSettings(true);
        try {
            const res = await API.patch('/kitchen-settings', settingsDraft);
            setSettings(res.data);
            toast.success('Kitchen settings saved');
        } catch (err) {
            console.error('Failed to save kitchen settings', err);
            toast.error('Could not save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const applyHistoryFilters = () => loadHistory(1);

    const clearHistoryFilters = () => {
        setHistoryFilters({ search: '', status: '', waiterName: '', tableNumber: '', startDate: '', endDate: '' });
        setTimeout(() => loadHistory(1), 0);
    };

    const sizeCfg = CARD_SIZE_CONFIG[settings.cardSize] || CARD_SIZE_CONFIG.medium;

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <span className="font-black text-lg">Kitchen<span className="text-orange-500">Display</span></span>
                    <span
                        className={`ml-3 text-xs font-bold px-2 py-1 rounded-full ${
                            connected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                        }`}
                    >
                        {connected ? '● Live' : '● Reconnecting...'}
                    </span>
                    <span className="ml-3 text-xs font-bold px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                        🍽️ {stats.servedToday} served today
                    </span>
                </div>

                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                    {[
                        { key: 'live', label: 'Live Queue' },
                        { key: 'history', label: 'History' },
                        { key: 'settings', label: 'Settings' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                                activeTab === tab.key ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    {newOrderIds.size > 0 && (
                        <button
                            onClick={acknowledgeAll}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-black px-4 py-2 rounded-lg animate-pulse"
                        >
                            🔔 {newOrderIds.size} NEW — Silence All
                        </button>
                    )}
                    <span className="text-gray-500 text-sm hidden sm:inline">👤 {user?.fullName}</span>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm font-semibold">
                        Sign Out
                    </button>
                </div>
            </nav>

            {error && (
                <div className="bg-red-900/50 border-b border-red-700 text-red-300 text-center py-2 text-sm font-semibold">
                    {error}
                </div>
            )}

            {activeTab === 'live' && (
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {sortedOrders.length === 0 ? (
                        <div className="text-center text-gray-600 py-24">
                            <div className="text-6xl mb-4">🍽️</div>
                            <div className="text-2xl font-black">No orders in the queue</div>
                        </div>
                    ) : (
                        <div className={`grid ${sizeCfg.grid} gap-6`}>
                            {sortedOrders.map((order) => {
                                const isNew = newOrderIds.has(order._id);
                                const age = minutesAgo(order.createdAt);
                                const isCritical = age >= settings.criticalThresholdMinutes;
                                const isLate = !isCritical && age >= settings.lateThresholdMinutes;
                                const allReady = (order.items || []).every((it) => it.ready);

                                return (
                                    <div
                                        key={order._id}
                                        className={`rounded-2xl p-6 border-4 transition-all ${
                                            isNew
                                                ? 'border-red-500 bg-red-950/40 animate-pulse'
                                                : isCritical
                                                ? 'border-red-600 bg-red-950/20'
                                                : isLate
                                                ? 'border-yellow-500 bg-yellow-950/20'
                                                : 'border-gray-700 bg-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Table</div>
                                                <div className={`${sizeCfg.table} font-black leading-none text-orange-500`}>
                                                    {order.tableNumber}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                                                    {order.waiterName || 'Online order'}
                                                </div>
                                                <div className={`text-lg font-black ${isCritical ? 'text-red-400' : isLate ? 'text-yellow-400' : 'text-gray-300'}`}>
                                                    {age} min ago
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            {(order.items || []).map((item, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => toggleItemReady(order, i)}
                                                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                                        item.ready ? 'bg-green-900/40 border border-green-700' : 'bg-gray-800/70 border border-transparent'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                                                            item.ready ? 'bg-green-500 border-green-500' : 'border-gray-500'
                                                        }`}
                                                    >
                                                        {item.ready && <span className="text-xs">✓</span>}
                                                    </span>
                                                    <ItemImage src={item.imageUrl} alt={item.mealName} className={`${sizeCfg.img} w-auto aspect-square`} />
                                                    <span className={`font-bold ${sizeCfg.name} flex-1 ${item.ready ? 'line-through text-gray-400' : ''}`}>
                                                        {item.mealName}
                                                    </span>
                                                    <span className={`font-black ${sizeCfg.qty} text-orange-400`}>×{item.quantity}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            {isNew && (
                                                <button
                                                    onClick={() => acknowledgeOrder(order._id)}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-sm"
                                                >
                                                    🔕 Acknowledge
                                                </button>
                                            )}
                                            <button
                                                onClick={() => markDone(order._id)}
                                                className={`flex-1 font-black py-3 rounded-xl text-sm text-white ${
                                                    allReady ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
                                                }`}
                                            >
                                                ✅ Serve Order
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[180px]">
                            <label className="text-xs text-gray-400 block mb-1">Search</label>
                            <input
                                type="text"
                                value={historyFilters.search}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, search: e.target.value }))}
                                placeholder="Waiter, table, item..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Status</label>
                            <select
                                value={historyFilters.status}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, status: e.target.value }))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Waiter</label>
                            <input
                                type="text"
                                value={historyFilters.waiterName}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, waiterName: e.target.value }))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Table</label>
                            <input
                                type="text"
                                value={historyFilters.tableNumber}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, tableNumber: e.target.value }))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-20"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">From</label>
                            <input
                                type="date"
                                value={historyFilters.startDate}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, startDate: e.target.value }))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">To</label>
                            <input
                                type="date"
                                value={historyFilters.endDate}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, endDate: e.target.value }))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <button onClick={applyHistoryFilters} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg text-sm">
                            Apply
                        </button>
                        <button onClick={clearHistoryFilters} className="text-gray-400 hover:text-white text-sm font-semibold px-2 py-2">
                            Clear
                        </button>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-4 py-3">Table</th>
                                    <th className="text-left px-4 py-3">Waiter / Source</th>
                                    <th className="text-left px-4 py-3">Items</th>
                                    <th className="text-left px-4 py-3">Placed</th>
                                    <th className="text-left px-4 py-3">Prep Time</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-left px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {historyLoading && (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
                                )}
                                {!historyLoading && historyOrders.length === 0 && (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No orders match these filters.</td></tr>
                                )}
                                {!historyLoading && historyOrders.map((o) => (
                                    <tr key={o._id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-bold text-orange-400">{o.tableNumber}</td>
                                        <td className="px-4 py-3">{o.waiterName || o.customerName || 'Online'}</td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {(o.items || []).slice(0, 2).map((it) => it.mealName).join(', ')}
                                            {o.items && o.items.length > 2 ? ` +${o.items.length - 2} more` : ''}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">{formatDate(o.createdAt)}</td>
                                        <td className="px-4 py-3 text-gray-400">{formatDuration(o.prepSeconds)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                o.status === 'completed' ? 'bg-green-900 text-green-400'
                                                    : o.status === 'cancelled' ? 'bg-red-900 text-red-400'
                                                    : 'bg-yellow-900 text-yellow-400'
                                            }`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => setDetailOrder(o)} className="text-orange-400 hover:text-orange-300 font-semibold">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                        <span>{historyTotal} orders total</span>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={historyPage <= 1}
                                onClick={() => loadHistory(historyPage - 1)}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <span>Page {historyPage} of {historyTotalPages}</span>
                            <button
                                disabled={historyPage >= historyTotalPages}
                                onClick={() => loadHistory(historyPage + 1)}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && settingsDraft && (
                <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="font-black mb-3">Queue Order</h3>
                        <div className="flex gap-3">
                            {['oldest', 'newest'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSettingsDraft((d) => ({ ...d, sortOrder: opt }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                        settingsDraft.sortOrder === opt ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                                    }`}
                                >
                                    {opt === 'oldest' ? 'Oldest first (default)' : 'Newest first'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="font-black mb-1">Serve Confirmation</h3>
                        <p className="text-xs text-gray-500 mb-3">
                            When on (default), a cook must tap "Serve Order" to clear a ticket. When off, a ticket
                            clears itself automatically once every item on it is checked ready.
                        </p>
                        <button
                            onClick={() => setSettingsDraft((d) => ({ ...d, requireClickToServe: !d.requireClickToServe }))}
                            className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                settingsDraft.requireClickToServe ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                            }`}
                        >
                            {settingsDraft.requireClickToServe ? 'Require click to serve: ON' : 'Require click to serve: OFF'}
                        </button>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="font-black mb-3">Card Size</h3>
                        <div className="flex gap-3">
                            {['small', 'medium', 'large'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSettingsDraft((d) => ({ ...d, cardSize: opt }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize ${
                                        settingsDraft.cardSize === opt ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="font-black mb-3">Sound</h3>
                        <button
                            onClick={() => setSettingsDraft((d) => ({ ...d, soundEnabled: !d.soundEnabled }))}
                            className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                settingsDraft.soundEnabled ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                            }`}
                        >
                            {settingsDraft.soundEnabled ? '🔊 Alarm sound: ON' : '🔇 Alarm sound: OFF'}
                        </button>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="font-black mb-3">Urgency Thresholds (minutes)</h3>
                        <div className="flex gap-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Late (yellow)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={settingsDraft.lateThresholdMinutes}
                                    onChange={(e) => setSettingsDraft((d) => ({ ...d, lateThresholdMinutes: Number(e.target.value) }))}
                                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-24"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Critical (red)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={settingsDraft.criticalThresholdMinutes}
                                    onChange={(e) => setSettingsDraft((d) => ({ ...d, criticalThresholdMinutes: Number(e.target.value) }))}
                                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-24"
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
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setDetailOrder(null)}>
                    <div
                        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest">Table</div>
                                <div className="text-4xl font-black text-orange-500">{detailOrder.tableNumber}</div>
                            </div>
                            <button onClick={() => setDetailOrder(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                                <div className="text-gray-500 text-xs">Waiter / Source</div>
                                <div className="font-semibold">{detailOrder.waiterName || detailOrder.customerName || 'Online order'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">Status</div>
                                <div className="font-semibold capitalize">{detailOrder.status}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">Placed</div>
                                <div className="font-semibold">{formatDate(detailOrder.createdAt)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">Time to Serve</div>
                                <div className="font-semibold">{formatDuration(detailOrder.prepSeconds)}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {(detailOrder.items || []).map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-800/70 rounded-lg px-3 py-2">
                                    <ItemImage src={item.imageUrl} alt={item.mealName} className="h-12 w-12" />
                                    <span className="font-bold flex-1">{item.mealName}</span>
                                    <span className="font-black text-orange-400">×{item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
                       }
