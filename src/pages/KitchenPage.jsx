import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useKitchenAlarm } from '../hooks/useKitchenAlarm';
import { CARD_SIZE_CONFIG } from '../utils/kitchenFormat';
import KitchenNavbar from '../components/Kitchen/KitchenNavbar';
import LiveQueueTab from '../components/Kitchen/LiveQueueTab';
import HistoryTab from '../components/Kitchen/HistoryTab';
import KitchenSettingsTab from '../components/Kitchen/KitchenSettingsTab';
import OrderDetailModal from '../components/Kitchen/OrderDetailModal';
import InventoryTab from '../components/Kitchen/InventoryTab';

// Socket.IO runs on the same server as the API
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

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
        notificationSoundId: null,
        notificationSoundUrl: null,
        notificationSoundName: null,
        lateThresholdMinutes: 8,
        criticalThresholdMinutes: 15,
    });
    const [settingsDraft, setSettingsDraft] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [sounds, setSounds] = useState([]);

    const [stats, setStats] = useState({ servedToday: 0, avgPrepSeconds: 0 });

    // Fallback image lookup: menu items by name, in case an order item was
    // saved without its own imageUrl snapshot.
    const [menuImages, setMenuImages] = useState({});

    const [historyOrders, setHistoryOrders] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        search: '', status: '', waiterName: '', tableNumber: '', startDate: '', endDate: '',
    });
    const [detailOrder, setDetailOrder] = useState(null);

    const { playAlarmOnce } = useKitchenAlarm(settings);

    // ---- Live clock tick ----
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
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

    // Builds a name -> imageUrl map from the live menu, used only as a
    // fallback when an order item has no imageUrl of its own.
    const loadMenuImages = useCallback(async () => {
        try {
            const res = await API.get('/menu');
            const map = {};
            (res.data || []).forEach((m) => {
                map[m.name?.toLowerCase()] = m.imageUrl;
            });
            setMenuImages(map);
        } catch (err) {
            console.error('Failed to fetch menu images', err);
        }
    }, []);

    const loadSounds = useCallback(async () => {
        try {
            const res = await API.get('/notification-sounds');
            setSounds(res.data || []);
        } catch (err) {
            console.error('Failed to fetch notification sounds', err);
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
        loadMenuImages();

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
            playAlarmOnce();
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

        // Fired when a waiter adds item(s) to a bill.
        // - If the order was still active in the queue: refresh it in place
        //   (the added lines get an "Added" badge in OrderCard).
        // - If the order had already been served/cancelled and cleared off
        //   this screen (`reopened`): don't resurrect the old card with all
        //   its already-done items. Show a fresh, standalone ticket
        //   containing only the newly added items, same as a brand-new order.
        socket.on('order:itemsAdded', ({ order, addedItems, reopened }) => {
            if (!order) return;
            const displayOrder = reopened ? { ...order, items: addedItems || order.items } : order;

            setOrders((prev) => {
                const exists = prev.some((o) => o._id === displayOrder._id);
                return exists
                    ? prev.map((o) => (o._id === displayOrder._id ? { ...o, ...displayOrder } : o))
                    : [...prev, displayOrder];
            });
            setNewOrderIds((prev) => new Set(prev).add(displayOrder._id));
            playAlarmOnce();
        });

        socket.on('kitchen:settings_updated', (updated) => setSettings(updated));

        return () => {
            socket.disconnect();
        };
    }, [loadInitialOrders, loadSettings, loadStats, loadMenuImages, playAlarmOnce]);

    useEffect(() => {
        if (activeTab === 'history') loadHistory(1);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'settings') {
            setSettingsDraft(settings);
            loadSounds();
        }
    }, [activeTab, settings, loadSounds]);

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

    // Prefer the order item's own snapshot; fall back to the live menu by name.
    const resolveImg = (item) =>
        item.imageUrl || menuImages[item.mealName?.toLowerCase()] || null;

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
            <KitchenNavbar
                connected={connected}
                servedToday={stats.servedToday}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                newOrderCount={newOrderIds.size}
                onAcknowledgeAll={acknowledgeAll}
                userName={user?.fullName}
                onLogout={handleLogout}
            />

            {error && (
                <div className="bg-red-50 border-b border-red-200 text-red-600 text-center py-2 text-sm font-semibold">
                    {error}
                </div>
            )}

            {activeTab === 'live' && (
                <LiveQueueTab
                    orders={sortedOrders}
                    newOrderIds={newOrderIds}
                    minutesAgo={minutesAgo}
                    settings={settings}
                    sizeCfg={sizeCfg}
                    resolveImg={resolveImg}
                    onToggleItem={toggleItemReady}
                    onAcknowledge={acknowledgeOrder}
                    onMarkDone={markDone}
                />
            )}

            {activeTab === 'history' && (
                <HistoryTab
                    orders={historyOrders}
                    loading={historyLoading}
                    page={historyPage}
                    totalPages={historyTotalPages}
                    total={historyTotal}
                    filters={historyFilters}
                    setFilters={setHistoryFilters}
                    onApply={applyHistoryFilters}
                    onClear={clearHistoryFilters}
                    onLoadPage={loadHistory}
                    onViewDetail={setDetailOrder}
                />
            )}

            {activeTab === 'inventory' && <InventoryTab />}

            {activeTab === 'settings' && (
                <KitchenSettingsTab
                    settingsDraft={settingsDraft}
                    setSettingsDraft={setSettingsDraft}
                    sounds={sounds}
                    onSave={saveSettings}
                    saving={savingSettings}
                />
            )}

            <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} resolveImg={resolveImg} />
        </div>
    );
                                      }
