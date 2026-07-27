import { useState, useEffect, useCallback } from 'react';
import {
    X, Search, ArrowLeft, Clock, User, PackagePlus,
    TrendingDown, Flame, ClipboardList
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const DAY_OPTIONS = [
    { key: 1, label: 'Today' },
    { key: 3, label: '3 Days' },
    { key: 7, label: '7 Days' },
    { key: 30, label: '30 Days' },
];

export default function UsageReport({ onClose }) {
    const [days, setDays] = useState(1);
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedItemId, setSelectedItemId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchOverview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/inventory/usage/overview', {
                params: { days, search: search || undefined },
            });
            setRows(res.data.items || []);
        } catch (err) {
            console.error('Failed to fetch usage overview', err);
            toast.error('Could not load usage report');
        }
        setLoading(false);
    }, [days, search]);

    useEffect(() => {
        const t = setTimeout(fetchOverview, 300); // debounce search typing
        return () => clearTimeout(t);
    }, [fetchOverview]);

    const openDetail = async (itemId) => {
        setSelectedItemId(itemId);
        setDetailLoading(true);
        try {
            const res = await API.get(`/inventory/usage/${itemId}/detail`, { params: { days } });
            setDetail(res.data);
        } catch (err) {
            console.error('Failed to fetch item usage detail', err);
            toast.error('Could not load item history');
        }
        setDetailLoading(false);
    };

    const closeDetail = () => {
        setSelectedItemId(null);
        setDetail(null);
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short' });
    const fmtTime = (d) => new Date(d).toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-6">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        {selectedItemId && (
                            <button onClick={closeDetail} className="text-gray-400 hover:text-orange-500 transition-colors mr-1">
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <ClipboardList size={18} className="text-orange-500" />
                        <h3 className="font-black text-gray-800">
                            {selectedItemId ? detail?.item?.name || 'Item History' : 'Usage Report'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {!selectedItemId ? (
                    <>
                        {/* Filters */}
                        <div className="px-5 py-3 border-b border-gray-100 shrink-0 space-y-3">
                            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200 w-fit">
                                {DAY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setDays(opt.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            days === opt.key
                                                ? 'bg-orange-500 text-white shadow-sm'
                                                : 'text-gray-500 hover:text-orange-500'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search items…"
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                            {loading ? (
                                <p className="text-gray-400 text-sm text-center py-16 font-medium">Loading…</p>
                            ) : rows.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-16 font-medium">
                                    No inventory items found
                                </p>
                            ) : (
                                rows.map((row) => (
                                    <button
                                        key={row.item._id}
                                        onClick={() => openDetail(row.item._id)}
                                        className="w-full text-left border border-gray-200 hover:border-orange-500/40 rounded-xl p-3.5 bg-gray-50/50 transition-colors"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-800 text-sm truncate">{row.item.name}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Flame size={11} className="text-orange-400" />
                                                        {row.usedQuantity.toLocaleString()} {row.item.unit?.abbreviation} used
                                                    </span>
                                                    {row.wastedQuantity > 0 && (
                                                        <span className="flex items-center gap-1 text-red-500">
                                                            <TrendingDown size={11} />
                                                            {row.wastedQuantity.toLocaleString()} wasted
                                                        </span>
                                                    )}
                                                </div>
                                                {row.lastRefill ? (
                                                    <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                                                        <PackagePlus size={10} />
                                                        Last refilled by <span className="font-semibold text-gray-500">{row.lastRefill.filledBy}</span> on {fmtDate(row.lastRefill.date)}
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-gray-400 mt-1.5">No restock on record</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-orange-500 text-sm">
                                                    KES {row.totalValue.toLocaleString()}
                                                </p>
                                                <p className="text-[10px] text-gray-400">worth used</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    /* Item detail — one-by-one usage entries */
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        {detailLoading ? (
                            <p className="text-gray-400 text-sm text-center py-16 font-medium">Loading…</p>
                        ) : (
                            <>
                                {detail?.lastRefill ? (
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
                                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Last Refilled</p>
                                        <p className="text-sm text-gray-700">
                                            <span className="font-bold">{detail.lastRefill.filledBy}</span> added{' '}
                                            <span className="font-bold">
                                                {detail.lastRefill.quantity.toLocaleString()} {detail.item?.unit?.abbreviation}
                                            </span>{' '}
                                            at KES {detail.lastRefill.costPerUnit.toLocaleString()}/{detail.item?.unit?.abbreviation}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <Clock size={11} />
                                            {fmtDate(detail.lastRefill.date)} · {fmtTime(detail.lastRefill.date)}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm text-gray-500">
                                        No restock on record for this item
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                        Usage Entries ({detail?.logs?.length || 0})
                                    </p>
                                    <div className="space-y-2">
                                        {(!detail?.logs || detail.logs.length === 0) ? (
                                            <p className="text-gray-400 text-sm text-center py-10 font-medium">
                                                No usage logged in this period
                                            </p>
                                        ) : (
                                            detail.logs.map((log) => (
                                                <div
                                                    key={log._id}
                                                    className="border border-gray-200 rounded-xl p-3 flex justify-between items-start bg-gray-50/50"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                                    log.reason === 'waste'
                                                                        ? 'text-red-600 bg-red-50 border border-red-200'
                                                                        : 'text-orange-600 bg-orange-50 border border-orange-200'
                                                                }`}
                                                            >
                                                                {log.reason}
                                                            </span>
                                                            <span className="font-bold text-gray-800 text-sm">
                                                                {log.quantity.toLocaleString()} {detail.item?.unit?.abbreviation}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                            <Clock size={11} />
                                                            {fmtDate(log.createdAt)} · {fmtTime(log.createdAt)}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                            <User size={11} />
                                                            {log.recordedBy}
                                                        </p>
                                                        {log.note && (
                                                            <p className="text-xs text-gray-400 italic mt-0.5">"{log.note}"</p>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-orange-500 text-sm shrink-0 ml-2">
                                                        KES {log.totalValue.toLocaleString()}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
                                                        }
