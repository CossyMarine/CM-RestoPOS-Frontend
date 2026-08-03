// src/components/Inventory/StockDetailsModal.jsx
// StockDetailsModal.jsx — top of file
import API from '../../api/axios';
import { formatKES, formatQty, formatShortDate, daysUntil, getStockStatus } from './inventoryLabels';
import { X, PackagePlus, ChefHat, Trash2, SlidersHorizontal, Layers } from 'lucide-react';
const ACTIVITY_ICON = {
    received: { icon: PackagePlus, classes: 'bg-green-50 text-green-600' },
    used: { icon: ChefHat, classes: 'bg-gray-100 text-gray-600' },
    waste: { icon: Trash2, classes: 'bg-red-50 text-red-600' },
    adjustment: { icon: SlidersHorizontal, classes: 'bg-blue-50 text-blue-600' },
};

export default function StockDetailsModal({ itemId, locationId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [item, setItem] = useState(null);
    const [locationStock, setLocationStock] = useState(null);
    const [batches, setBatches] = useState([]);
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const [usageRes, stockRes, batchesRes, historyRes] = await Promise.all([
                    API.get(`/inventory/usage/${itemId}/detail`, { params: { days: 30 } }),
                    API.get(`/inventory/stock/items/${itemId}`),
                    API.get('/inventory/batches', { params: { item: itemId, location: locationId, status: 'active' } }),
                    API.get('/inventory/stock', { params: { item: itemId, limit: 10 } }),
                ]);

                if (cancelled) return;

                setItem(usageRes.data.item);

                const atLocation = (stockRes.data || []).find((s) => s.location?._id === locationId);
                setLocationStock(atLocation || null);

                setBatches((batchesRes.data || []).sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0)));

                const received = (historyRes.data.entries || []).map((e) => ({
                    id: `stock_${e._id}`,
                    type: 'received',
                    label: `Received ${formatQty(e.quantity)}`,
                    sub: e.addedBy?.fullName ? `by ${e.addedBy.fullName}` : '',
                    value: e.totalCost,
                    createdAt: e.createdAt,
                }));
                const used = (usageRes.data.logs || []).map((l) => ({
                    id: `log_${l._id}`,
                    type: l.reason === 'waste' ? 'waste' : l.reason === 'adjustment' ? 'adjustment' : 'used',
                    label: `${l.reason === 'waste' ? 'Wasted' : l.reason === 'adjustment' ? 'Adjusted' : 'Used'} ${formatQty(Math.abs(l.quantity))}`,
                    sub: l.recordedBy ? `by ${l.recordedBy}${l.note ? ` · ${l.note}` : ''}` : l.note,
                    value: l.totalValue,
                    createdAt: l.createdAt,
                }));

                const merged = [...received, ...used].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);
                if (!cancelled) setActivity(merged);
            } catch (err) {
                console.error('Failed to load item details', err);
            }
            if (!cancelled) setLoading(false);
        };

        load();
        return () => { cancelled = true; };
    }, [itemId, locationId]);

    const available = locationStock?.quantity ?? 0;
    const status = useMemo(() => {
        if (!item) return null;
        return getStockStatus({
            available,
            reorderLevel: item.reorderLevel || 0,
            nearestExpiryDate: batches[0]?.expiryDate || null,
        });
    }, [item, available, batches]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h3 className="text-lg font-black text-gray-800">{item?.name || 'Loading…'}</h3>
                        <p className="text-xs text-gray-400">{item?.category || 'General'} · {locationStock?.location?.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="py-20 text-center text-gray-400 text-sm font-medium">Loading item details…</div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <MiniStat label="Available" value={formatQty(available, item?.unit?.abbreviation)} />
                            <MiniStat label="Cost / Unit" value={formatKES(item?.costPerUnit)} />
                            <MiniStat label="Status" value={status ? `${status.emoji} ${status.label}` : '—'} />
                            <MiniStat
                                label="Low Stock Level"
                                value={item?.reorderLevel > 0 ? formatQty(item.reorderLevel, item?.unit?.abbreviation) : 'Not set'}
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Layers size={15} className="text-gray-400" />
                                <h4 className="text-sm font-black text-gray-800">Stock Batches</h4>
                            </div>
                            {batches.length === 0 ? (
                                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                                    No batch or expiry information recorded for this item at this location.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {batches.map((b) => {
                                        const days = daysUntil(b.expiryDate);
                                        return (
                                            <div key={b._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
                                                <div>
                                                    <p className="font-semibold text-gray-700">{formatQty(b.quantity, item?.unit?.abbreviation)}</p>
                                                    <p className="text-[11px] text-gray-400">Batch {b.batchNumber}</p>
                                                </div>
                                                {b.expiryDate ? (
                                                    <span className={`text-xs font-bold ${days <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                                                        Expires {formatShortDate(b.expiryDate)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No expiry</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <p className="text-[11px] text-gray-400 pt-1">
                                        The system automatically uses the stock that expires soonest first, so nothing is wasted unnecessarily.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-black text-gray-800 mb-3">Recent Stock Activity</h4>
                            {activity.length === 0 ? (
                                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">No activity recorded in the last 30 days.</p>
                            ) : (
                                <div className="space-y-2">
                                    {activity.map((a) => {
                                        const cfg = ACTIVITY_ICON[a.type];
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={a.id} className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.classes}`}>
                                                    <Icon size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-700 truncate">{a.label}</p>
                                                    {a.sub && <p className="text-[11px] text-gray-400 truncate">{a.sub}</p>}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {a.value ? <p className="text-xs font-bold text-gray-600">{formatKES(a.value)}</p> : null}
                                                    <p className="text-[10px] text-gray-400">{formatShortDate(a.createdAt)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MiniStat({ label, value }) {
    return (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-gray-400">{label}</p>
            <p className="text-sm font-black text-gray-800 mt-0.5 truncate">{value}</p>
        </div>
    );
}