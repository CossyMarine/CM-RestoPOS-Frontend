import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { UtensilsCrossed } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatDate';

// Socket.IO runs on the same server as the API
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
            <div className={`${className} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0`}>
                <UtensilsCrossed size={20} className="text-gray-400" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setBroken(true)}
            className={`${className} rounded-lg object-cover border border-gray-200 shrink-0`}
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

    // ---- Alarm: generate a sharp repeating beep with Web Audio ----
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

        socket.on('order:created', (payload) => {
            const newOrder = payload.order;

            setOrders((prev) => {
                if (prev.some((o) => o._id === newOrder._id)) return prev;
                return [...prev, newOrder];
            });
            setNewOrderIds((prev) => new Set(prev).add(newOrder._id));
            startAlarmLoop();
        });

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
    }, [loadInitialOrders, loadSettings, loadStats, startAlarmLoop, stopAlarmLoop]);

    useEffect(() => {
        if (newOrderIds.size === 0) stopAlarmLoop();
    }, [newOrderIds, stopAlarmLoop]);

    useEffect(() => {
        if (activeTab === 'history') loadHistory(1);
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
        <div className="min-h-screen bg-gray-50 text-gray-800 antialiased font-sans">
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <span className="font-black text-lg text-gray-800">
                        Kitchen<span className="text-orange-500">Display</span>
                    </span>
                    <span
                        className={`ml-3 text-xs font-bold px-2.5 py-1 rounded-full border ${
                            connected
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                    >
                        {connected ? '● Live' : '● Reconnecting...'}
                    </span>
                    <span className="ml-3 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600">
                        🍽️ {stats.servedToday} served today
                    </span>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
                    {[
                        { key: 'live', label: 'Live Queue' },
                        { key: 'history', label: 'History' },
                        { key: 'settings', label: 'Settings' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.key
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                                    : 'text-gray-500 hover:text-orange-500'
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
                            className="bg-red-500 hover:bg-red-600 text-white text-sm font-black px-4 py-2 rounded-xl animate-pulse shadow-md shadow-red-500/20"
                        >
                            🔔 {newOrderIds.size} NEW — Silence All
                        </button>
                    )}
                    <span className="text-gray-500 text-sm font-medium hidden sm:inline">👤 {user?.fullName}</span>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 text-sm font-semibold transition-colors">
                        Sign Out
                    </button>
                </div>
            </nav>

            {error && (
                <div className="bg-red-50 border-b border-red-200 text-red-600 text-center py-2 text-sm font-semibold">
                    {error}
                </div>
            )}

            {activeTab === 'live' && (
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {sortedOrders.length === 0 ? (
                        <div className="text-center text-gray-400 py-24">
                            <div className="text-6xl mb-4">🍽️</div>
                            <div className="text-2xl font-black text-gray-700">No orders in the queue</div>
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
                                        className={`rounded-2xl p-6 border-2 transition-all shadow-sm bg-white ${
                                            isNew
                                                ? 'border-red-500 bg-red-50/50 animate-pulse ring-4 ring-red-500/10'
                                                : isCritical
                                                ? 'border-red-500 bg-red-50/30'
                                                : isLate
                                                ? 'border-amber-400 bg-amber-50/30'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Table</div>
                                                <div className={`${sizeCfg.table} font-black leading-none text-orange-500`}>
                                                    {order.tableNumber}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">
                                                    {order.waiterName || 'Online order'}
                                                </div>
                                                <div className={`text-lg font-black ${isCritical ? 'text-red-600' : isLate ? 'text-amber-600' : 'text-gray-700'}`}>
                                                    {age} min ago
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            {(order.items || []).map((item, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => toggleItemReady(order, i)}
                                                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors border ${
                                                        item.ready 
                                                            ? 'bg-emerald-50/60 border-emerald-200' 
                                                            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                                            item.ready ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                                                        }`}
                                                    >
                                                        {item.ready && <span className="text-xs font-bold">✓</span>}
                                                    </span>
                                                    <ItemImage src={item.imageUrl} alt={item.mealName} className={`${sizeCfg.img} w-auto aspect-square`} />
                                                    <span className={`font-bold ${sizeCfg.name} flex-1 ${item.ready ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                        {item.mealName}
                                                    </span>
                                                    <span className={`font-black ${sizeCfg.qty} text-orange-500`}>×{item.quantity}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            {isNew && (
                                                <button
                                                    onClick={() => acknowledgeOrder(order._id)}
                                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl text-sm shadow-sm transition-colors"
                                                >
                                                    🔕 Acknowledge
                                                </button>
                                            )}
                                            <button
                                                onClick={() => markDone(order._id)}
                                                className={`flex-1 font-black py-3 rounded-xl text-sm transition-all shadow-sm ${
                                                    allReady 
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10' 
                                                        : 'bg-gray-800 hover:bg-gray-900 text-white'
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
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end shadow-sm">
                        <div className="flex-1 min-w-[180px]">
                            <label className="text-xs text-gray-400 font-bold block mb-1">Search</label>
                            <input
                                type="text"
                                value={historyFilters.search}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, search: e.target.value }))}
                                placeholder="Waiter, table, item..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold block mb-1">Status</label>
                            <select
                                value={historyFilters.status}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, status: e.target.value }))}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                            >
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold block mb-1">Waiter</label>
                            <input
                                type="text"
                                value={historyFilters.waiterName}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, waiterName: e.target.value }))}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-32"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold block mb-1">Table</label>
                            <input
                                type="text"
                                value={historyFilters.tableNumber}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, tableNumber: e.target.value }))}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-20"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold block mb-1">From</label>
                            <input
                                type="date"
                                value={historyFilters.startDate}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, startDate: e.target.value }))}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold block mb-1">To</label>
                            <input
                                type="date"
                                value={historyFilters.endDate}
                                onChange={(e) => setHistoryFilters((f) => ({ ...f, endDate: e.target.value }))}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <button onClick={applyHistoryFilters} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm">
                            Apply
                        </button>
                        <button onClick={clearHistoryFilters} className="text-gray-400 hover:text-gray-600 text-sm font-semibold px-2 py-2 transition-colors">
                            Clear
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100 font-semibold">
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
                            <tbody className="divide-y divide-gray-100 text-gray-600">
                                {historyLoading && (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-medium">Loading…</td></tr>
                                )}
                                {!historyLoading && historyOrders.length === 0 && (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-medium">No orders match these filters.</td></tr>
                                )}
                                {!historyLoading && historyOrders.map((o) => (
                                    <tr key={o._id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-4 py-3 font-bold text-orange-500">{o.tableNumber}</td>
                                        <td className="px-4 py-3 font-medium">{o.waiterName || o.customerName || 'Online'}</td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {(o.items || []).slice(0, 2).map((it) => it.mealName).join(', ')}
                                            {o.items && o.items.length > 2 ? ` +${o.items.length - 2} more` : ''}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(o.createdAt)}</td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDuration(o.prepSeconds)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                                o.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : o.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setDetailOrder(o)} className="text-orange-500 hover:text-orange-600 font-semibold text-xs transition-colors">
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
                                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 shadow-sm font-semibold text-gray-600"
                            >
                                Prev
                            </button>
                            <span className="font-medium">Page {historyPage} of {historyTotalPages}</span>
                            <button
                                disabled={historyPage >= historyTotalPages}
                                onClick={() => loadHistory(historyPage + 1)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 shadow-sm font-semibold text-gray-600"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && settingsDraft && (
                <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-3">Queue Order</h3>
                        <div className="flex gap-3">
                            {['oldest', 'newest'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSettingsDraft((d) => ({ ...d, sortOrder: opt }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                        settingsDraft.sortOrder === opt 
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10' 
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                                    }`}
                                >
                                    {opt === 'oldest' ? 'Oldest first (default)' : 'Newest first'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-1">Serve Confirmation</h3>
                        <p className="text-xs text-gray-400 mb-3">
                            When on (default), a cook must tap "Serve Order" to clear a ticket. When off, a ticket
                            clears itself automatically once every item on it is checked ready.
                        </p>
                        <button
                            onClick={() => setSettingsDraft((d) => ({ ...d, requireClickToServe: !d.requireClickToServe }))}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                settingsDraft.requireClickToServe 
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10' 
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                            }`}
                        >
                            {settingsDraft.requireClickToServe ? 'Require click to serve: ON' : 'Require click to serve: OFF'}
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-3">Card Size</h3>
                        <div className="flex gap-3">
                            {['small', 'medium', 'large'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSettingsDraft((d) => ({ ...d, cardSize: opt }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold capitalize border transition-all ${
                                        settingsDraft.cardSize === opt 
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10' 
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-3">Sound</h3>
                        <button
                            onClick={() => setSettingsDraft((d) => ({ ...d, soundEnabled: !d.soundEnabled }))}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                settingsDraft.soundEnabled 
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10' 
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                            }`}
                        >
                            {settingsDraft.soundEnabled ? '🔊 Alarm sound: ON' : '🔇 Alarm sound: OFF'}
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-3">Urgency Thresholds (minutes)</h3>
                        <div className="flex gap-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold block mb-1">Late (yellow)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={settingsDraft.lateThresholdMinutes}
                                    onChange={(e) => setSettingsDraft((d) => ({ ...d, lateThresholdMinutes: Number(e.target.value) }))}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-24"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-bold block mb-1">Critical (red)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={settingsDraft.criticalThresholdMinutes}
                                    onChange={(e) => setSettingsDraft((d) => ({ ...d, criticalThresholdMinutes: Number(e.target.value) }))}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-24"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-colors shadow-md shadow-orange-500/10"
                    >
                        {savingSettings ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            )}

            {detailOrder && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4" onClick={() => setDetailOrder(null)}>
                    <div
                        className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Table</div>
                                <div className="text-4xl font-black text-orange-500">{detailOrder.tableNumber}</div>
                            </div>
                            <button onClick={() => setDetailOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <div className="text-gray-400 text-xs font-bold">Waiter / Source</div>
                                <div className="font-semibold text-gray-800">{detailOrder.waiterName || detailOrder.customerName || 'Online order'}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs font-bold">Status</div>
                                <div className="font-semibold text-gray-800 capitalize">{detailOrder.status}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs font-bold">Placed</div>
                                <div className="font-semibold text-gray-800">{formatDate(detailOrder.createdAt)}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs font-bold">Time to Serve</div>
                                <div className="font-semibold text-gray-800">{formatDuration(detailOrder.prepSeconds)}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {(detailOrder.items || []).map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                    <ItemImage src={item.imageUrl} alt={item.mealName} className="h-12 w-12" />
                                    <span className="font-bold flex-1 text-gray-800">{item.mealName}</span>
                                    <span className="font-black text-orange-500">×{item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
