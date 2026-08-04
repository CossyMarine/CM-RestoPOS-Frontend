// src/components/Inventory/SupplierDetailModal.jsx
import { useState, useEffect, useMemo } from 'react';
import { X, Truck, Phone, Mail, MapPin, User, Pencil, Ban } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { formatKES, formatShortDate } from './inventoryLabels';

export default function SupplierDetailModal({ supplier, onClose, onEdit, onDeactivated }) {
    const [loading, setLoading] = useState(true);
    const [receivings, setReceivings] = useState([]);
    const [deactivating, setDeactivating] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        API.get(`/inventory/suppliers/${supplier._id}/receivings`)
            .then((res) => {
                if (!cancelled) setReceivings(res.data || []);
            })
            .catch((err) => {
                console.error('Failed to load delivery history', err);
                toast.error('Could not load delivery history');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [supplier._id]);

    const stats = useMemo(() => {
        const valid = receivings.filter((r) => r.status !== 'cancelled');
        const totalSpend = valid.reduce(
            (sum, r) => sum + (r.items || []).reduce((s, i) => s + (i.totalCost || 0), 0),
            0
        );
        const itemTally = new Map();
        valid.forEach((r) => {
            (r.items || []).forEach((i) => {
                const name = i.inventoryItem?.name || 'Unknown item';
                itemTally.set(name, (itemTally.get(name) || 0) + i.quantity);
            });
        });
        const topItems = [...itemTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const lastDelivery = valid[0]?.createdAt || null; // API already sorts createdAt desc

        return {
            totalDeliveries: valid.length,
            totalSpend,
            avgOrderValue: valid.length ? totalSpend / valid.length : 0,
            lastDelivery,
            topItems,
        };
    }, [receivings]);

    const handleDeactivate = async () => {
        if (!window.confirm(`Deactivate ${supplier.name}? You can still see their history, but they won't show up when receiving new stock.`)) return;
        setDeactivating(true);
        try {
            await API.delete(`/inventory/suppliers/${supplier._id}`);
            toast.success('Supplier deactivated');
            onDeactivated?.(supplier._id);
        } catch (err) {
            console.error('Failed to deactivate supplier', err);
            toast.error(err.response?.data?.message || 'Could not deactivate this supplier');
        }
        setDeactivating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <Truck size={16} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-800">{supplier.name}</h3>
                            {!supplier.isActive && <p className="text-[11px] font-bold text-red-500">Inactive</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => onEdit(supplier)} className="text-gray-400 hover:text-orange-500" title="Edit">
                            <Pencil size={17} />
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                        {supplier.contactPerson && (
                            <span className="flex items-center gap-1.5"><User size={13} className="text-gray-400" />{supplier.contactPerson}</span>
                        )}
                        {supplier.phone && (
                            <span className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" />{supplier.phone}</span>
                        )}
                        {supplier.email && (
                            <span className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" />{supplier.email}</span>
                        )}
                        {supplier.address && (
                            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{supplier.address}</span>
                        )}
                    </div>
                    {supplier.note && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">{supplier.note}</p>}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <MiniStat label="Deliveries" value={loading ? '—' : stats.totalDeliveries} />
                        <MiniStat label="Total Spend" value={loading ? '—' : formatKES(stats.totalSpend)} />
                        <MiniStat label="Avg. Delivery" value={loading ? '—' : formatKES(stats.avgOrderValue)} />
                        <MiniStat label="Last Delivery" value={loading ? '—' : stats.lastDelivery ? formatShortDate(stats.lastDelivery) : 'Never'} />
                    </div>

                    {!loading && stats.topItems.length > 0 && (
                        <div>
                            <h4 className="text-sm font-black text-gray-800 mb-2">Most Supplied</h4>
                            <div className="flex flex-wrap gap-2">
                                {stats.topItems.map(([name]) => (
                                    <span key={name} className="text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-sm font-black text-gray-800 mb-3">Delivery History</h4>
                        {loading ? (
                            <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
                        ) : receivings.length === 0 ? (
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">No deliveries recorded from this supplier yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {receivings.map((r) => {
                                    const value = (r.items || []).reduce((s, i) => s + (i.totalCost || 0), 0);
                                    return (
                                        <div key={r._id} className="border border-gray-100 rounded-xl px-3 py-2.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-gray-700">
                                                    {(r.items || []).length} item{(r.items || []).length !== 1 ? 's' : ''} · {r.location?.name}
                                                </p>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-gray-700">{formatKES(value)}</p>
                                                    <p className="text-[10px] text-gray-400">{formatShortDate(r.createdAt)}</p>
                                                </div>
                                            </div>
                                            {r.status === 'cancelled' && (
                                                <span className="text-[10px] font-bold text-red-500 uppercase">Cancelled</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {supplier.isActive && (
                        <button
                            onClick={handleDeactivate}
                            disabled={deactivating}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-600 disabled:opacity-50"
                        >
                            <Ban size={13} /> {deactivating ? 'Deactivating…' : 'Deactivate Supplier'}
                        </button>
                    )}
                </div>
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